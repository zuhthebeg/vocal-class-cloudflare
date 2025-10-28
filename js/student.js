// js/student.js

document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['student']); // 학생만 접근 가능
    const user = getUser();
    if (user) {
        document.getElementById('user-name').textContent = `환영합니다, ${user.name}님`;
    }

    const teacherScheduleContainer = document.getElementById('teacher-schedule-container');
    const myBookingList = document.getElementById('my-booking-list');

    const TEACHER_SCHEDULE_KEY = 'teacherSchedule';
    const BOOKINGS_KEY = 'bookings';
    const ATTENDANCE_KEY = 'attendance';

    // 시간표 데이터 (예: 월-일, 9시-20시)
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const times = Array.from({ length: 12 }, (_, i) => `${9 + i}:00`); // 9:00 ~ 20:00

    let teacherSchedule = JSON.parse(localStorage.getItem(TEACHER_SCHEDULE_KEY)) || {};
    let bookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || [];

    /**
     * 강사 스케줄 UI 렌더링
     */
    function renderTeacherSchedule() {
        teacherScheduleContainer.innerHTML = '';
        if (Object.keys(teacherSchedule).length === 0) {
            teacherScheduleContainer.innerHTML = '<p class="text-gray-500 lg:col-span-full">강사 스케줄이 아직 설정되지 않았습니다.</p>';
            return;
        }

        days.forEach(day => {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column p-2 border rounded-md';
            dayColumn.innerHTML = `<h3 class="font-bold mb-2">${day}</h3>`;

            times.forEach(time => {
                const isAvailable = teacherSchedule[day] && teacherSchedule[day].includes(time);
                const isBooked = bookings.some(b => b.studentName === user.name && b.day === day && b.time === time);
                
                const timeSlot = document.createElement('div');
                timeSlot.className = `flex items-center mb-1 p-1 rounded-sm ${isAvailable ? 'bg-indigo-100 cursor-pointer hover:bg-indigo-200' : 'bg-gray-100 text-gray-400'} ${isBooked ? 'bg-green-300 hover:bg-green-400' : ''}`;
                timeSlot.textContent = time;
                timeSlot.dataset.day = day;
                timeSlot.dataset.time = time;

                if (isAvailable && !isBooked) {
                    timeSlot.addEventListener('click', handleBooking);
                } else if (isBooked) {
                    timeSlot.title = '이미 예약된 시간입니다.';
                }

                dayColumn.appendChild(timeSlot);
            });
            teacherScheduleContainer.appendChild(dayColumn);
        });
    }

    /**
     * 예약 처리
     */
    function handleBooking(event) {
        const day = event.target.dataset.day;
        const time = event.target.dataset.time;

        if (confirm(`${day} ${time} 수업을 예약하시겠습니까?`)) {
            const sessionId = `booking-${Date.now()}-${user.name.replace(/\s/g, '')}`;
            const newBooking = {
                sessionId: sessionId,
                studentName: user.name,
                day: day,
                time: time,
                bookedAt: new Date().toISOString()
            };
            bookings.push(newBooking);
            localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
            alert('예약이 완료되었습니다!');
            renderTeacherSchedule();
            renderMyBookings();
        }
    }

    /**
     * 나의 예약 현황 렌더링
     */
    function renderMyBookings() {
        const attendance = JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || [];
        myBookingList.innerHTML = '';

        const myBookings = bookings.filter(b => b.studentName === user.name);

        if (myBookings.length === 0) {
            myBookingList.innerHTML = '<p class="text-gray-500">예약된 수업이 없습니다.</p>';
            return;
        }

        myBookings.forEach(booking => {
            const isAttended = attendance.some(att => att.sessionId === booking.sessionId);
            const bookingItem = document.createElement('div');
            bookingItem.className = `p-3 border rounded-md shadow-sm ${isAttended ? 'bg-green-100' : 'bg-blue-50'}`;
            bookingItem.innerHTML = `
                <p><strong>${booking.day} ${booking.time}</strong></p>
                <p class="text-sm text-gray-600">세션 ID: ${booking.sessionId}</p>
                <p class="text-sm ${isAttended ? 'text-green-700 font-bold' : 'text-red-500'}">
                    ${isAttended ? '✅ 출석 완료' : '❌ 출석 대기'}
                </p>
            `;
            myBookingList.appendChild(bookingItem);
        });
    }

    // 초기 렌더링
    renderTeacherSchedule();
    renderMyBookings();
});
