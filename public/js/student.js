// js/student.js

document.addEventListener('DOMContentLoaded', async () => {
    // checkAuth(['student']); // 시연용으로 임시 비활성화
    const user = getUser();
    if (user) {
        document.getElementById('user-name').textContent = `환영합니다, ${user.name}님`;
    }

    // DOM 요소
    const calendarContainer = document.getElementById('calendar-container');
    const currentMonthElement = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const timeslotPanel = document.getElementById('timeslot-panel');
    const timeslotContainer = document.getElementById('timeslot-container');
    const selectedDateTitle = document.getElementById('selected-date-title');
    const closeTimeslotBtn = document.getElementById('close-timeslot-btn');
    const myBookingList = document.getElementById('my-booking-list');

    // localStorage 모드 체크
    const isDevelopmentPort = ['3000', '8000', '8080', '5000', '5500'].includes(window.location.port);
    const isLocalhost = window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.startsWith('192.168.') ||
                       window.location.hostname.startsWith('10.') ||
                       !window.location.hostname;
    const USE_LOCAL_STORAGE_ONLY = isLocalhost || isDevelopmentPort;

    // 데이터 구조: 날짜 기반
    let teacherSchedule = {}; // {"2025-10-29": ["10:00", "10:30"], ...}
    let bookings = []; // 전체 예약 목록
    let bookedSlots = new Set(); // 예약된 시간 슬롯 ("2025-10-29-10:00")
    let myBookedSlots = new Set(); // 내가 예약한 시간 슬롯
    let teacherId = null;

    // 달력 상태
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth(); // 0-11
    let selectedDate = null; // 선택된 날짜 (YYYY-MM-DD)

    const TEACHER_SCHEDULE_KEY = 'teacherSchedule';
    const BOOKINGS_KEY = 'bookings';

    /**
     * 달력 렌더링
     */
    function renderCalendar() {
        const year = currentYear;
        const month = currentMonth;

        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월',
                            '7월', '8월', '9월', '10월', '11월', '12월'];
        currentMonthElement.textContent = `${year}년 ${monthNames[month]}`;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay(); // 0 = 일요일

        let calendarHTML = '<div class="grid grid-cols-7 gap-1 text-center">';

        // 요일 헤더
        const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeaders.forEach(day => {
            calendarHTML += `<div class="font-bold text-sm p-2 text-gray-700">${day}</div>`;
        });

        // 빈 칸 (이전 달)
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarHTML += '<div class="p-2"></div>';
        }

        // 날짜들
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasSchedule = teacherSchedule[dateStr] && teacherSchedule[dateStr].length > 0;
            const hasMyBooking = Array.from(myBookedSlots).some(slot => slot.startsWith(dateStr));
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isSelected = dateStr === selectedDate;

            let classNames = 'p-2 border rounded cursor-pointer hover:bg-indigo-50 transition-colors';
            if (isToday) classNames += ' border-indigo-500 font-bold';
            if (isSelected) classNames += ' bg-indigo-200';
            if (hasSchedule) classNames += ' bg-green-100'; // 강사가 스케줄 설정한 날
            if (hasMyBooking) classNames += ' bg-blue-300'; // 내가 예약한 날

            calendarHTML += `<div class="calendar-day ${classNames}" data-date="${dateStr}">${day}</div>`;
        }

        calendarHTML += '</div>';
        calendarContainer.innerHTML = calendarHTML;

        // 날짜 클릭 이벤트
        document.querySelectorAll('.calendar-day').forEach(dayElement => {
            dayElement.addEventListener('click', () => {
                selectedDate = dayElement.dataset.date;
                renderCalendar();
                showTimeslotPanel();
            });
        });
    }

    /**
     * 선택된 날짜의 시간 슬롯 표시
     */
    function showTimeslotPanel() {
        if (!selectedDate) return;

        timeslotPanel.classList.remove('hidden');
        selectedDateTitle.textContent = `${selectedDate} 예약 가능 시간`;

        const availableTimes = teacherSchedule[selectedDate] || [];

        if (availableTimes.length === 0) {
            timeslotContainer.innerHTML = '<p class="text-gray-500 col-span-full">이 날짜에는 예약 가능한 시간이 없습니다.</p>';
            return;
        }

        timeslotContainer.innerHTML = '';
        availableTimes.forEach(time => {
            const slotKey = `${selectedDate}-${time}`;
            const isMyBooking = myBookedSlots.has(slotKey);
            const isBooked = bookedSlots.has(slotKey);

            const slot = document.createElement('div');
            let slotClass = 'p-2 rounded text-center cursor-pointer transition-all text-sm';

            if (isMyBooking) {
                // 내가 이미 예약한 시간
                slotClass += ' bg-blue-500 text-white cursor-default';
                slot.textContent = `${time} (내 예약)`;
                slot.title = '이미 예약한 시간입니다.';
            } else if (isBooked) {
                // 다른 사람이 예약한 시간
                slotClass += ' bg-gray-300 text-gray-600 cursor-not-allowed';
                slot.textContent = `${time} (예약됨)`;
                slot.title = '다른 수강생이 예약한 시간입니다.';
            } else {
                // 예약 가능한 시간
                slotClass += ' bg-green-100 hover:bg-green-200';
                slot.textContent = time;
                slot.dataset.date = selectedDate;
                slot.dataset.time = time;
                slot.addEventListener('click', handleBooking);
            }

            slot.className = slotClass;
            timeslotContainer.appendChild(slot);
        });
    }

    /**
     * 예약 처리
     */
    async function handleBooking(event) {
        const date = event.target.dataset.date;
        const time = event.target.dataset.time;

        if (!confirm(`${date} ${time} 수업을 예약하시겠습니까?`)) {
            return;
        }

        try {
            if (typeof showLoading === 'function') showLoading(true);

            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                console.warn('🔧 개발 모드: 예약을 localStorage에 저장합니다.');

                const existingBookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');

                // 중복 예약 체크
                const duplicate = existingBookings.find(b =>
                    b.studentName === user.name &&
                    b.day === date &&
                    b.time === time &&
                    b.status !== 'cancelled'
                );

                if (duplicate) {
                    throw new Error('이미 예약된 시간입니다.');
                }

                const newBooking = {
                    id: Date.now(),
                    studentName: user.name,
                    day: date,
                    time: time,
                    status: 'confirmed',
                    bookingDate: new Date().toISOString().split('T')[0]
                };

                existingBookings.push(newBooking);
                localStorage.setItem(BOOKINGS_KEY, JSON.stringify(existingBookings));

                if (typeof showLoading === 'function') showLoading(false);
                if (typeof showToast === 'function') {
                    showToast('예약이 완료되었습니다! (개발 모드)', 'success');
                } else {
                    alert('예약이 완료되었습니다!');
                }

                // 패널 닫기
                timeslotPanel.classList.add('hidden');
                selectedDate = null;

                await loadBookings();
                renderCalendar();
                return;
            }

            // API 모드
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: user.id,
                    teacherId: teacherId,
                    bookingDate: date,
                    timeSlot: time
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '예약 실패');
            }

            if (typeof showLoading === 'function') showLoading(false);
            if (typeof showToast === 'function') {
                showToast('예약이 완료되었습니다!', 'success');
            } else {
                alert('예약이 완료되었습니다!');
            }

            // 패널 닫기
            timeslotPanel.classList.add('hidden');
            selectedDate = null;

            await loadBookings();
            renderCalendar();
        } catch (error) {
            console.error('Booking error:', error);
            if (typeof showLoading === 'function') showLoading(false);
            if (typeof handleApiError === 'function') {
                handleApiError(error);
            } else {
                alert('예약 중 오류가 발생했습니다: ' + error.message);
            }
        }
    }

    /**
     * 나의 예약 현황 렌더링
     */
    function renderMyBookings() {
        myBookingList.innerHTML = '';

        const myBookings = bookings.filter(b =>
            b.studentName === user.name || b.student_name === user.name
        );

        if (myBookings.length === 0) {
            myBookingList.innerHTML = '<p class="text-gray-500">예약된 수업이 없습니다.</p>';
            return;
        }

        myBookings.forEach(booking => {
            const bookingItem = document.createElement('div');
            const statusClass = booking.status === 'completed' ? 'bg-green-100' :
                               booking.status === 'cancelled' ? 'bg-gray-100' : 'bg-blue-50';
            const statusText = booking.status === 'completed' ? '✅ 완료' :
                              booking.status === 'cancelled' ? '❌ 취소됨' :
                              booking.status === 'confirmed' ? '⏳ 확정' : '⏱️ 대기중';

            // localStorage 형식과 API 형식 모두 지원
            const day = booking.day || booking.booking_date || '';
            const time = booking.time || booking.time_slot || '';
            const bookingDate = booking.bookingDate || booking.booking_date || day;

            bookingItem.className = `p-3 border rounded-md shadow-sm ${statusClass}`;
            bookingItem.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p><strong>${day}</strong></p>
                        <p class="text-sm text-gray-600">시간: ${time}</p>
                        <p class="text-sm text-gray-500">예약일: ${bookingDate}</p>
                        <p class="text-sm font-semibold">${statusText}</p>
                    </div>
                    ${booking.status !== 'cancelled' && booking.status !== 'completed' ? `
                        <button class="cancel-booking-btn btn btn-danger btn-sm" data-booking-id="${booking.id}">
                            취소
                        </button>
                    ` : ''}
                </div>
            `;
            myBookingList.appendChild(bookingItem);
        });

        // Add cancel event listeners
        document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
            btn.addEventListener('click', handleCancelBooking);
        });
    }

    /**
     * 예약 취소 처리
     */
    async function handleCancelBooking(event) {
        const bookingId = parseInt(event.target.dataset.bookingId);

        if (!confirm('정말로 이 예약을 취소하시겠습니까?')) {
            return;
        }

        try {
            if (typeof showLoading === 'function') showLoading(true);

            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                console.warn('🔧 개발 모드: localStorage에서 예약을 삭제합니다.');

                const existingBookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
                const updatedBookings = existingBookings.filter(b => b.id !== bookingId);

                localStorage.setItem(BOOKINGS_KEY, JSON.stringify(updatedBookings));

                if (typeof showLoading === 'function') showLoading(false);
                if (typeof showToast === 'function') {
                    showToast('예약이 취소되었습니다. (개발 모드)', 'info');
                } else {
                    alert('예약이 취소되었습니다.');
                }

                await loadBookings();
                renderCalendar();
                return;
            }

            // API 모드
            const response = await fetch(`/api/bookings?id=${bookingId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '취소 실패');
            }

            if (typeof showLoading === 'function') showLoading(false);
            if (typeof showToast === 'function') {
                showToast('예약이 취소되었습니다.', 'info');
            } else {
                alert('예약이 취소되었습니다.');
            }

            await loadBookings();
            renderCalendar();
        } catch (error) {
            console.error('Cancel booking error:', error);
            if (typeof showLoading === 'function') showLoading(false);
            if (typeof handleApiError === 'function') {
                handleApiError(error);
            } else {
                alert('예약 취소 중 오류가 발생했습니다: ' + error.message);
            }
        }
    }

    /**
     * 강사 스케줄 로드
     */
    async function loadTeacherSchedule() {
        try {
            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                console.warn('🔧 개발 모드: localStorage에서 강사 스케줄을 로드합니다.');
                const saved = localStorage.getItem(TEACHER_SCHEDULE_KEY);
                teacherSchedule = saved ? JSON.parse(saved) : {};
                renderCalendar();
                return;
            }

            // API 모드 - 날짜 범위로 조회 (현재 달부터 3개월)
            teacherId = 1; // TODO: 강사 선택 기능 추가 시 변경

            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0).toISOString().split('T')[0];

            const response = await fetch(`/api/schedule?teacherId=${teacherId}&startDate=${startDate}&endDate=${endDate}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load schedule');
            }

            // API에서 반환된 날짜별 그룹화 데이터 사용
            teacherSchedule = data.schedulesByDate || {};

            renderCalendar();
        } catch (error) {
            console.error('Load schedule error:', error);
            if (typeof showToast === 'function') {
                showToast('스케줄을 불러오는데 실패했습니다.', 'error');
            }
            renderCalendar();
        }
    }

    /**
     * 내 예약 로드
     */
    async function loadBookings() {
        try {
            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                console.warn('🔧 개발 모드: localStorage에서 예약을 로드합니다.');
                const allBookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
                bookings = allBookings;

                // 예약된 슬롯 수집
                bookedSlots.clear();
                myBookedSlots.clear();
                allBookings.forEach(booking => {
                    if (booking.status !== 'cancelled') {
                        const slotKey = `${booking.day}-${booking.time}`;
                        bookedSlots.add(slotKey);
                        if (booking.studentName === user.name) {
                            myBookedSlots.add(slotKey);
                        }
                    }
                });

                renderMyBookings();
                return;
            }

            // API 모드
            const response = await fetch('/api/bookings');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load bookings');
            }

            bookings = data.bookings || [];

            // 예약된 슬롯 수집
            bookedSlots.clear();
            myBookedSlots.clear();
            bookings.forEach(booking => {
                if (booking.status !== 'cancelled') {
                    const date = booking.booking_date || booking.day;
                    const time = booking.time_slot || booking.time;
                    const slotKey = `${date}-${time}`;
                    bookedSlots.add(slotKey);
                    if (booking.student_name === user.name || booking.studentName === user.name) {
                        myBookedSlots.add(slotKey);
                    }
                }
            });

            renderMyBookings();
        } catch (error) {
            console.error('Load bookings error:', error);
            if (typeof showToast === 'function') {
                showToast('예약 현황을 불러오는데 실패했습니다.', 'error');
            }
            renderMyBookings();
        }
    }

    // 달력 네비게이션 이벤트
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    // 시간 슬롯 패널 닫기
    closeTimeslotBtn.addEventListener('click', () => {
        timeslotPanel.classList.add('hidden');
        selectedDate = null;
        renderCalendar();
    });

    // 초기 렌더링
    await loadTeacherSchedule();
    await loadBookings();
});
