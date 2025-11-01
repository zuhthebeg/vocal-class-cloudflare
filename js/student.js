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
    const teacherSelect = document.getElementById('teacher-select');

    // localStorage 모드 체크
    const isDevelopmentPort = ['3000', '8000', '8080', '5000', '5500'].includes(window.location.port);
    const isLocalhost = window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.startsWith('192.168.') ||
                       window.location.hostname.startsWith('10.') ||
                       !window.location.hostname;
    const USE_LOCAL_STORAGE_ONLY = isLocalhost || isDevelopmentPort;

    // 데이터 구조
    let bookings = []; // 전체 예약 목록
    let myBookings = []; // 내 예약 목록
    let teacherId = null;

    // 달력 상태
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth(); // 0-11
    let selectedDate = null; // 선택된 날짜 (YYYY-MM-DD)

    const BOOKINGS_KEY = 'bookings';

    /**
     * 강사 목록 로드
     */
    async function loadTeachers() {
        try {
            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드에서는 기본 강사 추가
                teacherSelect.innerHTML = '<option value="1">강사1</option>';
                teacherId = 1;
                return;
            }

            // API 모드
            const response = await fetch('/api/auth?role=teacher');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load teachers');
            }

            const teachers = data.users || [];
            teacherSelect.innerHTML = '<option value="">강사를 선택하세요</option>';

            if (teachers.length === 0) {
                teacherSelect.innerHTML += '<option value="" disabled>등록된 강사가 없습니다</option>';
                return;
            }

            teachers.forEach(teacher => {
                const option = document.createElement('option');
                option.value = teacher.id;
                option.textContent = teacher.name;
                teacherSelect.appendChild(option);
            });

            // 강사가 한 명이면 자동 선택하고 달력 렌더링
            if (teachers.length === 1) {
                teacherId = teachers[0].id;
                teacherSelect.value = teacherId;
                renderCalendar(); // 자동 선택 시 달력 업데이트
            }
        } catch (error) {
            console.error('Load teachers error:', error);
            teacherSelect.innerHTML = '<option value="" disabled>강사 목록을 불러오지 못했습니다</option>';
        }
    }

    // 시간 생성 (9:00 ~ 22:00, 30분 단위)
    function generateTimeOptions() {
        const times = [];
        for (let hour = 9; hour <= 22; hour++) {
            times.push(`${String(hour).padStart(2, '0')}:00`);
            if (hour < 22) {
                times.push(`${String(hour).padStart(2, '0')}:30`);
            }
        }
        return times;
    }

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

            // 내가 예약한 날짜 체크 - 상태별로 구분
            const myBooking = myBookings.find(b => {
                const bookingDate = b.day || b.booking_date;
                return bookingDate === dateStr && b.status !== 'cancelled' && b.status !== 'rejected';
            });
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isSelected = dateStr === selectedDate;

            let classNames = 'p-2 border rounded cursor-pointer hover:bg-indigo-50 transition-colors';
            if (isToday) classNames += ' border-indigo-500 font-bold';
            if (isSelected) classNames += ' bg-indigo-200';

            // 예약 상태별 색상
            if (myBooking) {
                if (myBooking.status === 'completed') {
                    classNames += ' bg-blue-400 text-white'; // 출석 완료: 파란색
                } else if (myBooking.status === 'approved') {
                    classNames += ' bg-green-300'; // 승인됨: 초록색
                } else if (myBooking.status === 'pending') {
                    classNames += ' bg-yellow-200'; // 대기중: 노란색
                }
            }

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
     * 선택된 날짜의 시간 선택 패널 표시
     */
    async function showTimeslotPanel() {
        if (!selectedDate) return;
        if (!teacherId) {
            if (typeof showToast === 'function') {
                showToast('강사를 먼저 선택해주세요.', 'error');
            }
            return;
        }

        timeslotPanel.classList.remove('hidden');
        selectedDateTitle.textContent = `${selectedDate} 예약 요청`;

        // 기본 시간 옵션 사용 (학생이 자유롭게 선택)
        const times = generateTimeOptions();

        timeslotContainer.innerHTML = `
            <div class="col-span-full mb-4">
                <p class="text-sm font-medium text-gray-700 mb-3">
                    가능한 시간을 모두 선택하세요 (강사가 선택한 시간 중 하나로 확정됩니다)
                </p>
                <div id="time-checkboxes" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    ${times.map(time => `
                        <label class="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" value="${time}" class="time-checkbox mr-2">
                            <span class="text-sm">${time}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <button id="request-booking-btn" class="col-span-full btn btn-primary w-full">
                예약 요청하기
            </button>
        `;

        // 예약 요청 버튼 이벤트
        document.getElementById('request-booking-btn').addEventListener('click', handleBookingRequest);
    }

    /**
     * 예약 요청 처리
     */
    async function handleBookingRequest() {
        // 선택된 체크박스들 가져오기
        const checkboxes = document.querySelectorAll('.time-checkbox:checked');
        const selectedTimes = Array.from(checkboxes).map(cb => cb.value);

        if (selectedTimes.length === 0) {
            if (typeof showToast === 'function') {
                showToast('최소 1개 이상의 시간을 선택해주세요.', 'error');
            } else {
                alert('최소 1개 이상의 시간을 선택해주세요.');
            }
            return;
        }

        if (!teacherId) {
            if (typeof showToast === 'function') {
                showToast('강사를 먼저 선택해주세요.', 'error');
            } else {
                alert('강사를 먼저 선택해주세요.');
            }
            return;
        }

        // user 체크
        if (!user) {
            if (typeof showToast === 'function') {
                showToast('로그인이 필요합니다.', 'error');
            } else {
                alert('로그인이 필요합니다.');
            }
            window.location.href = '/';
            return;
        }

        const timesText = selectedTimes.join(', ');
        if (!confirm(`${selectedDate}\n가능한 시간: ${timesText}\n\n위 시간들 중 강사가 선택한 시간으로 예약이 확정됩니다.\n요청하시겠습니까?`)) {
            return;
        }

        try {
            if (typeof showLoading === 'function') showLoading(true);

            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                console.warn('🔧 개발 모드: 예약 요청을 localStorage에 저장합니다.');

                const existingBookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');

                const newBooking = {
                    id: Date.now(),
                    studentName: user.name,
                    day: selectedDate,
                    suggestedTimes: selectedTimes,
                    time: null, // 강사가 승인할 때 설정
                    status: 'pending',
                    bookingDate: new Date().toISOString().split('T')[0]
                };

                existingBookings.push(newBooking);
                localStorage.setItem(BOOKINGS_KEY, JSON.stringify(existingBookings));

                if (typeof showLoading === 'function') showLoading(false);
                if (typeof showToast === 'function') {
                    showToast(`${selectedTimes.length}개 시간대로 예약 요청했습니다! (개발 모드)`, 'success');
                } else {
                    alert('예약 요청이 완료되었습니다!');
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
                    bookingDate: selectedDate,
                    suggestedTimeSlots: selectedTimes,
                    status: 'pending'
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '예약 요청 실패');
            }

            if (typeof showLoading === 'function') showLoading(false);
            if (typeof showToast === 'function') {
                showToast('예약 요청이 완료되었습니다! 강사 승인을 기다려주세요.', 'success');
            } else {
                alert('예약 요청이 완료되었습니다! 강사 승인을 기다려주세요.');
            }

            // 패널 닫기
            timeslotPanel.classList.add('hidden');
            selectedDate = null;

            await loadBookings();
            renderCalendar();
        } catch (error) {
            console.error('Booking request error:', error);
            if (typeof showLoading === 'function') showLoading(false);
            if (typeof handleApiError === 'function') {
                handleApiError(error);
            } else {
                alert('예약 요청 중 오류가 발생했습니다: ' + error.message);
            }
        }
    }

    /**
     * 나의 예약 현황 렌더링
     */
    function renderMyBookings() {
        myBookingList.innerHTML = '';

        if (myBookings.length === 0) {
            myBookingList.innerHTML = '<p class="text-gray-500">예약된 수업이 없습니다.</p>';
            return;
        }

        myBookings.forEach(booking => {
            const bookingItem = document.createElement('div');

            // 상태별 스타일링
            let statusClass, statusText, statusIcon;
            switch(booking.status) {
                case 'pending':
                    statusClass = 'bg-yellow-50 border-yellow-200';
                    statusText = '승인 대기중';
                    statusIcon = '⏳';
                    break;
                case 'approved':
                    statusClass = 'bg-green-50 border-green-200';
                    statusText = '승인됨';
                    statusIcon = '✅';
                    break;
                case 'rejected':
                    statusClass = 'bg-red-50 border-red-200';
                    statusText = '거절됨';
                    statusIcon = '❌';
                    break;
                case 'completed':
                    statusClass = 'bg-blue-50 border-blue-200';
                    statusText = '완료';
                    statusIcon = '✓';
                    break;
                case 'cancelled':
                    statusClass = 'bg-gray-50 border-gray-200';
                    statusText = '취소됨';
                    statusIcon = '⊘';
                    break;
                default:
                    statusClass = 'bg-blue-50 border-blue-200';
                    statusText = '확정';
                    statusIcon = '✓';
            }

            // localStorage 형식과 API 형식 모두 지원
            const day = booking.day || booking.booking_date || '';
            const time = booking.time || booking.time_slot || '';
            const bookingDate = booking.bookingDate || booking.booking_date || day;

            bookingItem.className = `p-3 border-2 rounded-md shadow-sm ${statusClass}`;
            bookingItem.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <p class="font-semibold text-gray-800">${day}</p>
                        <p class="text-sm text-gray-600">시간: ${time}</p>
                        <p class="text-xs text-gray-500">요청일: ${bookingDate}</p>
                        <p class="text-sm font-semibold mt-1 ${
                            booking.status === 'approved' ? 'text-green-600' :
                            booking.status === 'pending' ? 'text-yellow-600' :
                            booking.status === 'rejected' ? 'text-red-600' :
                            booking.status === 'completed' ? 'text-blue-600' : 'text-gray-600'
                        }">
                            ${statusIcon} ${statusText}
                        </p>
                    </div>
                    <div class="flex flex-col gap-1">
                        ${booking.status === 'approved' ? `
                            <a href="/signature?bookingId=${booking.id}" class="btn btn-success btn-sm text-center">
                                출석하기
                            </a>
                        ` : ''}
                        ${booking.status === 'pending' || booking.status === 'approved' ? `
                            <button class="cancel-booking-btn btn btn-danger btn-sm" data-booking-id="${booking.id}">
                                취소
                            </button>
                        ` : ''}
                    </div>
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
     * 내 예약 로드
     */
    async function loadBookings() {
        try {
            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                console.warn('🔧 개발 모드: localStorage에서 예약을 로드합니다.');
                const allBookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
                bookings = allBookings;
                myBookings = allBookings.filter(b => b.studentName === user.name);

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
            myBookings = bookings.filter(b =>
                b.student_name === user.name || b.studentName === user.name
            );

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

    // 강사 선택 이벤트
    teacherSelect.addEventListener('change', (e) => {
        teacherId = e.target.value ? parseInt(e.target.value) : null;
        renderCalendar(); // 강사 변경 시 달력 다시 렌더링
    });

    // 초기 렌더링
    await loadTeachers();
    await loadBookings();
    renderCalendar();
});
