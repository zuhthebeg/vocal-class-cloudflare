// js/teacher.js

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['teacher']); // 강사만 접근 가능
    const user = getUser();
    if (user) {
        document.getElementById('user-name').textContent = `환영합니다, ${user.name}님`;
    }

    const scheduleContainer = document.getElementById('schedule-container');
    const saveScheduleBtn = document.getElementById('save-schedule-btn');
    const bookingList = document.getElementById('booking-list');
    const generateQrBtn = document.getElementById('generate-qr-btn');
    const qrcodeDiv = document.getElementById('qrcode');
    const qrInfo = document.getElementById('qr-info');

    const TEACHER_SCHEDULE_KEY = 'teacherSchedule';
    const BOOKINGS_KEY = 'bookings';
    const ATTENDANCE_KEY = 'attendance';

    // 시간표 데이터 (예: 월-일, 9시-20시)
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const times = Array.from({ length: 12 }, (_, i) => `${9 + i}:00`); // 9:00 ~ 20:00

    let teacherSchedule = JSON.parse(localStorage.getItem(TEACHER_SCHEDULE_KEY)) || {};

    /**
     * 스케줄 UI 렌더링
     */
    function renderSchedule() {
        scheduleContainer.innerHTML = '';
        days.forEach(day => {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column p-2 border rounded-md';
            dayColumn.innerHTML = `<h3 class="font-bold mb-2">${day}</h3>`;

            times.forEach(time => {
                const id = `${day}-${time}`;
                const isChecked = teacherSchedule[day] && teacherSchedule[day].includes(time);
                dayColumn.innerHTML += `
                    <div class="flex items-center mb-1">
                        <input type="checkbox" id="${id}" data-day="${day}" data-time="${time}" class="mr-2" ${isChecked ? 'checked' : ''}>
                        <label for="${id}">${time}</label>
                    </div>
                `;
            });
            scheduleContainer.appendChild(dayColumn);
        });
    }

    /**
     * 스케줄 저장
     */
    saveScheduleBtn.addEventListener('click', () => {
        const newSchedule = {};
        document.querySelectorAll('#schedule-container input[type="checkbox"]:checked').forEach(checkbox => {
            const day = checkbox.dataset.day;
            const time = checkbox.dataset.time;
            if (!newSchedule[day]) {
                newSchedule[day] = [];
            }
            newSchedule[day].push(time);
        });
        teacherSchedule = newSchedule;
        localStorage.setItem(TEACHER_SCHEDULE_KEY, JSON.stringify(teacherSchedule));
        alert('스케줄이 저장되었습니다.');
        renderBookings(); // 스케줄 변경 시 예약 현황도 업데이트
    });

    /**
     * 예약 현황 렌더링
     */
    function renderBookings() {
        const bookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || [];
        const attendance = JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || [];
        bookingList.innerHTML = '';

        if (bookings.length === 0) {
            bookingList.innerHTML = '<p class="text-gray-500">예약된 수업이 없습니다.</p>';
            return;
        }

        bookings.forEach(booking => {
            const isAttended = attendance.some(att => att.sessionId === booking.sessionId);
            const bookingItem = document.createElement('div');
            bookingItem.className = `p-3 border rounded-md shadow-sm ${isAttended ? 'bg-green-100' : 'bg-blue-50'}`;
            bookingItem.innerHTML = `
                <p><strong>${booking.studentName}</strong>님 - ${booking.day} ${booking.time}</p>
                <p class="text-sm text-gray-600">세션 ID: ${booking.sessionId}</p>
                <p class="text-sm ${isAttended ? 'text-green-700 font-bold' : 'text-red-500'}">
                    ${isAttended ? '✅ 출석 완료' : '❌ 출석 대기'}
                </p>
            `;
            bookingList.appendChild(bookingItem);
        });
    }

    /**
     * QR 코드 생성
     */
    generateQrBtn.addEventListener('click', () => {
        const sessionId = `session-${Date.now()}`; // 현재 시간 기반 세션 ID
        const qrData = `${window.location.origin}/signature.html?sessionId=${sessionId}`;

        qrcodeDiv.innerHTML = ''; // 기존 QR 코드 제거
        new QRCode(qrcodeDiv, {
            text: qrData,
            width: 200,
            height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        qrInfo.textContent = `세션 ID: ${sessionId} (이 QR 코드를 스캔하여 출석하세요)`;

        // 생성된 세션 ID를 localStorage에 저장 (예약 현황과 연결하기 위함)
        // 실제로는 이 세션 ID를 예약 정보와 함께 저장하거나, 출석 시 사용
        localStorage.setItem('currentQrSessionId', sessionId);
    });

    /**
     * 알림 권한 요청 및 스케줄링
     */
    function requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('이 브라우저는 알림을 지원하지 않습니다.');
            return;
        }

        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('알림 권한이 허용되었습니다.');
                scheduleNotifications();
            } else {
                console.warn('알림 권한이 거부되었습니다.');
            }
        });
    }

    /**
     * 수업 알림 스케줄링 (예시)
     * 실제로는 서버에서 관리하거나, 서비스 워커에서 백그라운드 동기화를 통해 처리하는 것이 좋음
     */
    function scheduleNotifications() {
        // 현재는 간단한 예시로, 실제 수업 시간을 기반으로 알림을 스케줄링해야 함
        // 예를 들어, 다음 수업이 내일 10시라면:
        // const nextClassTime = new Date();
        // nextClassTime.setDate(nextClassTime.getDate() + 1);
        // nextClassTime.setHours(10, 0, 0, 0);

        // 하루 전 알림 (예시: 10초 후)
        setTimeout(() => {
            new Notification('Vocal Class 알림', {
                body: '내일 수업이 있습니다. 준비해주세요!',
                icon: '/images/icon-192x192.png'
            });
        }, 10 * 1000); // 10초 후

        // 10분 전 알림 (예시: 20초 후)
        setTimeout(() => {
            new Notification('Vocal Class 알림', {
                body: '수업 시작 10분 전입니다!',
                icon: '/images/icon-192x192.png'
            });
        }, 20 * 1000); // 20초 후
    }

    // 초기 렌더링
    renderSchedule();
    renderBookings();
    requestNotificationPermission(); // 페이지 로드 시 알림 권한 요청
});
