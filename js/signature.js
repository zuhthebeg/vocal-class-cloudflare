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

    // URL에서 sessionId 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId') || localStorage.getItem('currentQrSessionId'); // QR 생성 시 저장된 세션 ID 사용

    if (sessionId) {
        sessionInfo.textContent = `세션 ID: ${sessionId}`; // 세션 ID 표시
    } else {
        sessionInfo.textContent = '세션 ID를 찾을 수 없습니다. 직접 서명하세요.';
    }

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
            alert('서명을 해주세요.');
            return;
        }

        const signatureData = canvas.toDataURL(); // Base64 이미지 데이터
        const studentName = (typeof getUser === 'function' && getUser()) ? getUser().name : 'Unknown';
        const currentSessionId = sessionId || `manual-${Date.now()}`; // 세션 ID가 없으면 수동 생성

        // (1) localStorage에도 저장 유지
        const attendanceRecord = {
            sessionId: currentSessionId,
            studentName: studentName,
            timestamp: new Date().toISOString(),
            signature: signatureData
        };

        let attendance = JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || [];
        attendance.push(attendanceRecord);
        localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance));

        // (2) 원격 전송: 우선 window.GOOGLE_SCRIPT_URL 또는 window.LOCAL_ATTENDANCE_ENDPOINT 사용
        const remoteScriptUrl = window.GOOGLE_SCRIPT_URL || null; // 사용자가 index나 README에서 설정할 수 있음
        const localEndpoint = window.LOCAL_ATTENDANCE_ENDPOINT || null;

        if (remoteScriptUrl) {
            await submitToGoogleSheet(studentName, currentSessionId, signatureData, remoteScriptUrl);
        } else if (localEndpoint) {
            try {
                await fetch(localEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(attendanceRecord)
                });
                alert('출석이 로컬 엔드포인트로 전송되었습니다. ✅');
            } catch (err) {
                console.error('로컬 엔드포인트 전송 실패:', err);
                alert('로컬 엔드포인트로 전송하는 동안 오류가 발생했습니다. ❌');
            }
        } else {
            // 원격 전송 설정이 없으면 로컬 저장만 유지하고 안내
            console.info('원격 전송 URL이 설정되어 있지 않아 로컬에만 저장했습니다. Configure window.GOOGLE_SCRIPT_URL to enable remote submission.');
            alert('출석이 로컬에 저장되었습니다. (원격 전송은 구성되지 않음) ✅');
        }

        // 학생 페이지로 이동
        window.location.href = 'student.html';
    });
});