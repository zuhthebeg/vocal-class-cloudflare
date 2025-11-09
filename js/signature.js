// js/signature.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('signature-pad');
    const clearBtn = document.getElementById('clear-btn');
    const submitBtn = document.getElementById('submit-btn');
    const sessionInfo = document.getElementById('session-info');
    const ctx = canvas.getContext('2d');

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    const ATTENDANCE_KEY = 'attendance';

    // 캔버스 크기 설정 (반응형) with DPR-aware scaling
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // URL에서 sessionId와 bookingId 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId') || localStorage.getItem('currentQrSessionId'); // QR 생성 시 저장된 세션 ID 사용
    const bookingId = urlParams.get('bookingId'); // 예약 ID (승인된 예약에서 출석)
    let studentNameFromBooking = null;

    async function setupPage() {
        if (bookingId) {
            try {
                if (typeof showLoading === 'function') showLoading(true);
                const response = await fetch(`/api/bookings?bookingId=${bookingId}`);
                const data = await response.json();
                if (typeof showLoading === 'function') showLoading(false);

                if (!response.ok || !data.booking) {
                    throw new Error(data.error || '예약 정보를 불러올 수 없습니다.');
                }

                const booking = data.booking;
                studentNameFromBooking = booking.student_name;
                sessionInfo.innerHTML = `<strong>${studentNameFromBooking}</strong>님, 출석 서명을 진행해주세요.`;

            } catch (error) {
                if (typeof showLoading === 'function') showLoading(false);
                sessionInfo.textContent = `오류: ${error.message}`;
                submitBtn.disabled = true;
                submitBtn.classList.add('disabled');
            }
        } else if (sessionId) {
            // 익명 출석용 - 이름 입력 필드 표시
            const nameInputContainer = document.getElementById('name-input-container');
            if (nameInputContainer) {
                nameInputContainer.classList.remove('hidden');
            }
            sessionInfo.textContent = `출석 서명을 진행해주세요.`;
        } else {
            sessionInfo.textContent = '세션 ID를 찾을 수 없습니다.';
        }
    }

    setupPage();

    // 그리기 시작
    function startDrawing(e) {
        drawing = true;
        [lastX, lastY] = getClientCoords(e);
    }

    // 그리기
    function draw(e) {
        if (!drawing) return;
        e.preventDefault(); // 터치 스크롤 방지
        const [currentX, currentY] = getClientCoords(e);

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        [lastX, lastY] = [currentX, currentY];
    }

    // 그리기 종료
    function stopDrawing() {
        drawing = false;
    }

    // 마우스/터치 이벤트에 따른 좌표 얻기
    function getClientCoords(e) {
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return [
                e.touches[0].clientX - rect.left,
                e.touches[0].clientY - rect.top
            ];
        } else {
            return [
                e.clientX - rect.left,
                e.clientY - rect.top
            ];
        }
    }

    // 이벤트 리스너
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchcancel', stopDrawing);

    // 다시 그리기 버튼
    clearBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Google Sheets로 데이터 전송 함수
    // TODO: 실제 Google Apps Script 배포 URL로 교체해주세요!
    async function submitToGoogleSheet(studentName, sessionId, signatureData) {
        try {
            const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby.../exec"; // 여기에 실제 URL을 입력하세요.
            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student: studentName,
                    sessionId: sessionId,
                    signature: signatureData
                })
            });
            const text = await res.text();
            console.log("Google Sheet response:", text);
            alert("출석이 성공적으로 기록되었습니다 ✅");
        } catch (err) {
            console.error("출석 기록 실패:", err);
            alert("출석 전송 중 오류가 발생했습니다 ❌");
        }
    }

    // 유틸: 캔버스가 비어있는지 확인
    function isCanvasBlank(c) {
        try {
            const w = c.width;
            const h = c.height;
            const data = ctx.getImageData(0, 0, w, h).data;
            // data는 [r,g,b,a,...]
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] !== 0) { // alpha 채널이 0이 아니면 뭔가 그려져 있음
                    return false;
                }
            }
            return true;
        } catch (e) {
            // 보안/브라우저 제한으로 getImageData가 실패하면 빈 캔버스와 비교
            try {
                const blank = document.createElement('canvas');
                blank.width = c.width;
                blank.height = c.height;
                return c.toDataURL() === blank.toDataURL();
            } catch (ee) {
                // 최후의 수단: 항상 서명이 있다고 가정
                return false;
            }
        }
    }

    // 제출 버튼
    submitBtn.addEventListener('click', async () => {
        if (isCanvasBlank(canvas)) {
            if (typeof showToast === 'function') {
                showToast('서명을 해주세요.', 'error');
            } else {
                alert('서명을 해주세요.');
            }
            return;
        }

        const signatureData = canvas.toDataURL(); // Base64 이미지 데이터
        const user = (typeof getUser === 'function' && getUser()) ? getUser() : null;

        // 익명 출석용 이름 입력 필드에서 이름 가져오기
        const nameInput = document.getElementById('student-name-input');
        const enteredName = nameInput && !nameInput.classList.contains('hidden') ? nameInput.value.trim() : null;

        // 익명 출석인 경우 (sessionId만 있고 bookingId 없음) 이름 입력 확인
        if (!bookingId && sessionId && !enteredName) {
            if (typeof showToast === 'function') {
                showToast('이름을 입력해주세요.', 'error');
            } else {
                alert('이름을 입력해주세요.');
            }
            nameInput.focus();
            return;
        }

        // bookingId가 있으면 예약 정보에서 가져온 이름을 사용, 익명 출석이면 입력한 이름, 그 외에는 로그인한 사용자 이름 사용
        const studentName = studentNameFromBooking || enteredName || (user ? user.name : 'Unknown');
        const currentSessionId = sessionId || `manual-${Date.now()}`; // 세션 ID가 없으면 수동 생성

        try {
            if (typeof showLoading === 'function') showLoading(true);

            // API 모드
            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    studentName: studentName,
                    bookingId: bookingId ? parseInt(bookingId) : null,
                    signature: signatureData
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '출석 제출 실패');
            }

            if (typeof showLoading === 'function') showLoading(false);
            if (typeof showToast === 'function') {
                showToast('출석이 성공적으로 기록되었습니다!', 'success');
            } else {
                alert('출석이 성공적으로 기록되었습니다! ✅');
            }

            // Navigate to student page after short delay
            setTimeout(() => {
                window.location.href = '/student';
            }, 1000);
        } catch (error) {
            console.error('Attendance submission error:', error);
            if (typeof showLoading === 'function') showLoading(false);
            if (typeof handleApiError === 'function') {
                handleApiError(error);
            } else {
                alert('출석 제출 중 오류가 발생했습니다: ' + error.message);
            }
        }
    });
});