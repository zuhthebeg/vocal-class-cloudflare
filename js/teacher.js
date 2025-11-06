// js/teacher.js

document.addEventListener('DOMContentLoaded', async () => {
    // checkAuth(['teacher']); // 시연용으로 임시 비활성화
    const user = getUser();
    if (user) {
        document.getElementById('user-name').textContent = `환영합니다, ${user.name}님`;
    }

    const calendarContainer = document.getElementById('calendar-container');
    const currentMonthElement = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const bookingList = document.getElementById('booking-list');
    const generateQrBtn = document.getElementById('generate-qr-btn');
    const generateInstantQrBtn = document.getElementById('generate-instant-qr-btn');
    const qrcodeDiv = document.getElementById('qrcode');
    const qrInfo = document.getElementById('qr-info');
    const attendanceList = document.getElementById('attendance-list');
    const refreshAttendanceBtn = document.getElementById('refresh-attendance-btn');

    // 스케줄 패널 요소
    const schedulePanel = document.getElementById('schedule-panel');
    const scheduleDateTitle = document.getElementById('schedule-date-title');
    const scheduleStartTime = document.getElementById('schedule-start-time');
    const scheduleEndTime = document.getElementById('schedule-end-time');
    const scheduleInterval = document.getElementById('schedule-interval');
    const saveScheduleBtn = document.getElementById('save-schedule-btn');
    const closeScheduleBtn = document.getElementById('close-schedule-btn');

    // 시간표 데이터 (예: 월-일, 9시-22시, 30분 단위)
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const dayMap = {
        '월': 'monday',
        '화': 'tuesday',
        '수': 'wednesday',
        '목': 'thursday',
        '금': 'friday',
        '토': 'saturday',
        '일': 'sunday'
    };
    const reverseDayMap = Object.fromEntries(Object.entries(dayMap).map(([k, v]) => [v, k]));

    // 시간 범위 설정 (기본값: 9시 ~ 22시)
    let startHour = 9;
    let endHour = 22;
    let times = [];

    // 시간 범위 초기화 함수
    function initializeTimeRange() {
        // localStorage에서 저장된 시간 범위 불러오기
        const savedRange = localStorage.getItem('timeRange');
        if (savedRange) {
            const range = JSON.parse(savedRange);
            startHour = range.start;
            endHour = range.end;
        }
        generateTimes();
    }

    // 스케줄 패널용 시간 옵션 생성
    function populateScheduleTimeOptions() {
        if (!scheduleStartTime || !scheduleEndTime) return;

        scheduleStartTime.innerHTML = '';
        scheduleEndTime.innerHTML = '';

        // 0시부터 23시까지
        for (let hour = 0; hour <= 23; hour++) {
            for (let min = 0; min < 60; min += 30) {
                const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

                const startOption = document.createElement('option');
                startOption.value = timeStr;
                startOption.textContent = timeStr;
                if (hour === 18 && min === 0) startOption.selected = true; // 기본값: 18:00
                scheduleStartTime.appendChild(startOption);

                const endOption = document.createElement('option');
                endOption.value = timeStr;
                endOption.textContent = timeStr;
                if (hour === 22 && min === 0) endOption.selected = true; // 기본값: 22:00
                scheduleEndTime.appendChild(endOption);
            }
        }
    }

    // 스케줄 패널 표시
    function showSchedulePanel(date) {
        selectedDate = date;
        scheduleDateTitle.textContent = `${date} 스케줄 설정`;
        schedulePanel.classList.remove('hidden');

        // 예약 패널 숨기기
        const dateBookingsPanel = document.getElementById('date-bookings-panel');
        if (dateBookingsPanel) {
            dateBookingsPanel.classList.add('hidden');
        }
    }

    // 스케줄 패널 닫기
    function closeSchedulePanelFunc() {
        if (schedulePanel) {
            schedulePanel.classList.add('hidden');
        }
    }

    // 스케줄 저장
    async function saveSchedule() {
        if (!user) return;

        const startTime = scheduleStartTime.value;
        const endTime = scheduleEndTime.value;
        const interval = parseInt(scheduleInterval.value);

        // 시간 슬롯 생성
        const timeSlots = [];
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        let currentMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (currentMinutes >= endMinutes) {
            if (typeof showToast === 'function') {
                showToast('종료 시간은 시작 시간보다 늦어야 합니다.', 'error');
            } else {
                alert('종료 시간은 시작 시간보다 늦어야 합니다.');
            }
            return;
        }

        while (currentMinutes <= endMinutes) {
            const h = Math.floor(currentMinutes / 60);
            const m = currentMinutes % 60;
            timeSlots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            currentMinutes += interval;
        }

        try {
            if (typeof showLoading === 'function') showLoading(true);

            const response = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacherId: user.id,
                    date: selectedDate,
                    timeSlots: timeSlots
                })
            });

            const data = await response.json();

            if (typeof showLoading === 'function') showLoading(false);

            if (!response.ok) {
                throw new Error(data.error || '스케줄 저장 실패');
            }

            if (typeof showToast === 'function') {
                showToast(`${timeSlots.length}개 시간 슬롯이 등록되었습니다.`, 'success');
            } else {
                alert(`${timeSlots.length}개 시간 슬롯이 등록되었습니다.`);
            }

            closeSchedulePanelFunc();
            renderCalendar(); // 달력 다시 렌더링

        } catch (error) {
            console.error('Schedule save error:', error);
            if (typeof showLoading === 'function') showLoading(false);
            if (typeof handleApiError === 'function') {
                handleApiError(error);
            } else {
                alert('스케줄 저장 중 오류가 발생했습니다: ' + error.message);
            }
        }
    }

    // 시간 배열 생성 함수 (30분 단위)
    function generateTimes() {
        times = [];
        for (let hour = startHour; hour <= endHour; hour++) {
            times.push(`${hour}:00`);
            if (hour < endHour) { // 마지막 시간의 30분은 제외
                times.push(`${hour}:30`);
            }
        }
    }

    // 시간 선택 드롭다운 초기화 (현재 미사용)
    function initializeTimeSelects() {
        // 제거된 요소들로 인해 주석 처리
        // if (!startHourSelect || !endHourSelect) return;
        // startHourSelect.innerHTML = '';
        // endHourSelect.innerHTML = '';
        // for (let hour = 0; hour <= 23; hour++) {
        //     const startOption = document.createElement('option');
        //     startOption.value = hour;
        //     startOption.textContent = `${hour}:00`;
        //     if (hour === startHour) startOption.selected = true;
        //     startHourSelect.appendChild(startOption);
        //     const endOption = document.createElement('option');
        //     endOption.value = hour;
        //     endOption.textContent = `${hour}:00`;
        //     if (hour === endHour) endOption.selected = true;
        //     endHourSelect.appendChild(endOption);
        // }
    }

    // 시간 범위 적용 버튼 (현재 미사용)
    // if (applyTimeRangeBtn) {
    //     applyTimeRangeBtn.addEventListener('click', () => {
    //         const newStart = parseInt(startHourSelect.value);
    //         const newEnd = parseInt(endHourSelect.value);
    //         if (newStart >= newEnd) {
    //             if (typeof showToast === 'function') {
    //                 showToast('시작 시간은 종료 시간보다 빨라야 합니다.', 'error');
    //             } else {
    //                 alert('시작 시간은 종료 시간보다 빨라야 합니다.');
    //             }
    //             return;
    //         }
    //         startHour = newStart;
    //         endHour = newEnd;
    //         localStorage.setItem('timeRange', JSON.stringify({ start: startHour, end: endHour }));
    //         generateTimes();
    //         renderCalendar();
    //         if (typeof showToast === 'function') {
    //             showToast('운영 시간이 변경되었습니다.', 'success');
    //         }
    //     });
    // }

    // 데이터 구조: 날짜 기반으로 변경 (예: {"2025-10-29": ["10:00", "10:30"], ...})
    let teacherSchedule = {}; // 날짜별 가능 시간
    let bookedSlots = new Set(); // 예약된 시간 슬롯 (형식: "2025-10-29-10:00")
    let bookedSlotsInfo = {}; // 예약 정보 매핑 (slotKey -> {studentName, ...})
    let allBookings = []; // 모든 예약 데이터
    let bookingsByDate = {}; // 날짜별 예약 데이터 (key: "YYYY-MM-DD", value: array of bookings)
    let allStudents = []; // 모든 학생 데이터 (start_date, end_date 포함)
    const TEACHER_SCHEDULE_KEY = 'teacherSchedule';
    const BOOKINGS_KEY = 'bookings';

    // 달력 상태
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth(); // 0-11
    let selectedDate = null; // 선택된 날짜 (YYYY-MM-DD)

    // localStorage 모드 체크
    const isDevelopmentPort = ['3000', '8000', '8080', '5000', '5500', '8788'].includes(window.location.port);
    const isLocalhost = window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.startsWith('192.168.') ||
                       window.location.hostname.startsWith('10.') ||
                       !window.location.hostname;
    const USE_LOCAL_STORAGE_ONLY = false; // API 모드 강제 사용
    console.log('🚀 [INIT] USE_LOCAL_STORAGE_ONLY =', USE_LOCAL_STORAGE_ONLY, 'port:', window.location.port);

    // 드래그 선택 상태
    let isDragging = false;
    let dragStartValue = false;
    let mouseDownPos = null;
    let mouseDownCheckbox = null;

    /**
     * 달력 렌더링
     */
    function renderCalendar() {
        const year = currentYear;
        const month = currentMonth;

        // 월 표시
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        currentMonthElement.textContent = `${year}년 ${monthNames[month]}`;

        // 달력 생성
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay(); // 0 (일요일) ~ 6 (토요일)

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
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isSelected = dateStr === selectedDate;
            const dateBookings = bookingsByDate[dateStr] || [];
            const hasBookings = dateBookings.length > 0;

            // 이 날짜에 수업 기간에 해당하는 학생 수 계산
            const studentsInPeriod = allStudents.filter(student => {
                if (!student.start_date || !student.end_date) return false;
                return dateStr >= student.start_date && dateStr <= student.end_date;
            });
            const studentCount = studentsInPeriod.length;

            // 예약 상태에 따라 다른 색상
            let statusBadge = '';
            if (hasBookings) {
                const completedCount = dateBookings.filter(b => b.status === 'completed').length;
                const approvedCount = dateBookings.filter(b => b.status === 'approved').length;
                const pendingCount = dateBookings.filter(b => b.status === 'pending').length;
                const rejectedCount = dateBookings.filter(b => b.status === 'rejected').length;

                if (completedCount > 0) statusBadge = '🔵'; // 출석 완료: 파란 원
                else if (approvedCount > 0) statusBadge = '🟢';
                else if (pendingCount > 0) statusBadge = '🟡';
                else if (rejectedCount > 0) statusBadge = '🔴';
            }

            let classNames = 'p-2 border rounded cursor-pointer hover:bg-indigo-50 transition-colors relative';
            if (isToday) classNames += ' border-indigo-500 font-bold';
            if (isSelected) classNames += ' bg-indigo-200';
            if (hasBookings) classNames += ' bg-blue-50';
            if (hasSchedule) classNames += ' bg-green-50';

            // 학생 수업 기간 표시 - 연한 주황색 배경
            if (studentCount > 0) {
                classNames += ' border-l-4 border-orange-300';
            }

            calendarHTML += `<div class="calendar-day ${classNames}" data-date="${dateStr}" title="${studentCount > 0 ? `수강생 수업기간` : ''}">
                <div>${day}</div>
                ${statusBadge ? `<div class="text-xs">${statusBadge}</div>` : ''}
            </div>`;
        }

        calendarHTML += '</div>';
        calendarContainer.innerHTML = calendarHTML;

        // 날짜 클릭 이벤트
        document.querySelectorAll('.calendar-day').forEach(dayElement => {
            // 일반 클릭: 예약 현황 보기
            dayElement.addEventListener('click', () => {
                selectedDate = dayElement.dataset.date;
                renderCalendar(); // 다시 렌더링하여 선택 표시
                showDateBookingsPanel();
                renderAttendance(selectedDate); // 선택된 날짜의 출석 현황 표시
            });

            // 우클릭: 스케줄 설정
            dayElement.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // 기본 컨텍스트 메뉴 방지
                const date = dayElement.dataset.date;
                showSchedulePanel(date);
            });
        });
    }

    /**
     * 선택된 날짜의 예약 정보 표시
     */
    function showDateBookingsPanel() {
        const dateBookingsPanel = document.getElementById('date-bookings-panel');
        const dateBookingsTitle = document.getElementById('selected-date-bookings-title');
        const dateBookingsContainer = document.getElementById('date-bookings-container');

        if (!dateBookingsPanel) return;

        const dateBookings = bookingsByDate[selectedDate] || [];

        dateBookingsTitle.textContent = `${selectedDate} 예약 현황`;
        dateBookingsContainer.innerHTML = '';

        if (dateBookings.length === 0) {
            dateBookingsContainer.innerHTML = '<p class="text-gray-500 text-sm">이 날짜에 예약이 없습니다.</p>';
        } else {
            dateBookings.forEach(booking => {
                const statusClass = booking.status === 'completed' ? 'bg-blue-50 border-blue-200' :
                                   booking.status === 'approved' ? 'bg-green-50 border-green-200' :
                                   booking.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                                   booking.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-gray-50';
                const statusText = booking.status === 'completed' ? '🔵 출석완료' :
                                  booking.status === 'approved' ? '✅ 승인됨' :
                                  booking.status === 'pending' ? '⏳ 대기중' :
                                  booking.status === 'rejected' ? '❌ 거절됨' : booking.status;

                const bookingEl = document.createElement('div');
                bookingEl.className = `p-2 border rounded text-sm ${statusClass}`;
                bookingEl.innerHTML = `
                    <p class="font-semibold">${booking.student_name}님</p>
                    <p class="text-xs text-gray-600">시간: ${booking.time_slot}</p>
                    <p class="text-xs font-semibold">${statusText}</p>
                `;
                dateBookingsContainer.appendChild(bookingEl);
            });
        }

        dateBookingsPanel.classList.remove('hidden');
    }

    /**
     * 학생 목록 조회 (나에게 예약 요청한 학생만, start_date, end_date 포함)
     */
    async function loadStudents() {
        try {
            const user = getUser();
            if (!user || !user.id) {
                console.warn('No user found, cannot load students');
                allStudents = [];
                return;
            }

            const response = await fetch(`/api/auth?role=student&teacherId=${user.id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load students');
            }

            allStudents = data.users || [];
            console.log(`📚 Loaded ${allStudents.length} students who have booked with this teacher`);
            renderCalendar(); // 학생 데이터 로드 후 달력 다시 렌더링
        } catch (error) {
            console.error('Load students error:', error);
            allStudents = [];
        }
    }

    // 이전/다음 달 버튼
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

    // 드래그 선택 상태
    let isSlotDragging = false;
    let dragSelectValue = false;

    /**
     * 시간 슬롯 패널 표시 (현재 미사용 - 예약 달력으로 대체됨)
     */
    /* function showTimeslotPanel() {
        if (!selectedDate) return;

        timeslotPanel.classList.remove('hidden');
        selectedDateTitle.textContent = `${selectedDate} 시간 설정`;

        // 현재 선택된 시간들
        const currentTimes = teacherSchedule[selectedDate] || [];

        // 시간 슬롯 렌더링
        timeslotContainer.innerHTML = '';
        times.forEach(time => {
            const slotKey = `${selectedDate}-${time}`;
            const isChecked = currentTimes.includes(time);
            const isBooked = bookedSlots.has(slotKey);

            const slot = document.createElement('div');
            let slotClass = 'p-2 rounded text-center cursor-pointer transition-all text-sm';

            if (isBooked) {
                const bookingInfo = bookedSlotsInfo[slotKey];
                slotClass += ' bg-red-500 text-white cursor-not-allowed';
                slot.innerHTML = `<div>${time}</div><div class="text-xs">${bookingInfo?.studentName || '예약됨'}</div>`;
                slot.addEventListener('click', () => {
                    if (typeof showToast === 'function') {
                        showToast('이미 예약된 시간입니다.', 'warning');
                    }
                });
            } else {
                slotClass += isChecked ? ' bg-indigo-500 text-white' : ' bg-gray-100 hover:bg-indigo-100';
                slot.textContent = time;
                slot.dataset.time = time;
                slot.dataset.selected = isChecked ? 'true' : 'false';

                // 드래그 선택 이벤트
                slot.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    isSlotDragging = true;
                    dragSelectValue = slot.dataset.selected !== 'true';

                    // 현재 슬롯 토글
                    slot.dataset.selected = dragSelectValue.toString();
                    updateSlotStyle(slot);
                });

                slot.addEventListener('mouseenter', () => {
                    if (isSlotDragging) {
                        slot.dataset.selected = dragSelectValue.toString();
                        updateSlotStyle(slot);
                    }
                });

                // 클릭 이벤트 (드래그가 아닐 때만)
                slot.addEventListener('click', () => {
                    if (!isSlotDragging) {
                        const isCurrentlySelected = slot.dataset.selected === 'true';
                        slot.dataset.selected = (!isCurrentlySelected).toString();
                        updateSlotStyle(slot);
                    }
                });
            }

            slot.className = slotClass;
            timeslotContainer.appendChild(slot);
        });
    }

    // 슬롯 스타일 업데이트 함수
    function updateSlotStyle(slot) {
        if (slot.dataset.selected === 'true') {
            slot.classList.remove('bg-gray-100', 'hover:bg-indigo-100');
            slot.classList.add('bg-indigo-500', 'text-white');
        } else {
            slot.classList.remove('bg-indigo-500', 'text-white');
            slot.classList.add('bg-gray-100', 'hover:bg-indigo-100');
        }
    }

    // 전역 mouseup 이벤트 (드래그 종료)
    document.addEventListener('mouseup', () => {
        isSlotDragging = false;
    }); */

    // 시간 슬롯 패널 닫기 (현재 미사용)
    // if (closeTimeslotBtn) {
    //     closeTimeslotBtn.addEventListener('click', () => {
    //         if (timeslotPanel) timeslotPanel.classList.add('hidden');
    //         selectedDate = null;
    //         renderCalendar();
    //     });
    // }

    // 날짜별 스케줄 저장 (현재 미사용)
    /* if (saveDateScheduleBtn) {
    saveDateScheduleBtn.addEventListener('click', async () => {
        if (!selectedDate) return;

        // 선택된 시간들 수집
        const selectedTimes = [];
        document.querySelectorAll('#timeslot-container > div[data-time]').forEach(slot => {
            if (slot.dataset.selected === 'true') {
                selectedTimes.push(slot.dataset.time);
            }
        });

        try {
            if (typeof showLoading === 'function') showLoading(true);

            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                console.warn('🔧 개발 모드: 스케줄을 localStorage에 저장합니다.');

                if (selectedTimes.length > 0) {
                    teacherSchedule[selectedDate] = selectedTimes;
                } else {
                    delete teacherSchedule[selectedDate];
                }

                localStorage.setItem(TEACHER_SCHEDULE_KEY, JSON.stringify(teacherSchedule));

                if (typeof showLoading === 'function') showLoading(false);
                if (typeof showToast === 'function') {
                    showToast(`${selectedDate} 스케줄이 저장되었습니다. (개발 모드)`, 'success');
                } else {
                    alert(`${selectedDate} 스케줄이 저장되었습니다.`);
                }

                timeslotPanel.classList.add('hidden');
                selectedDate = null;
                renderCalendar();
                return;
            }

            // API 모드
            const response = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacherId: user.id,
                    date: selectedDate,
                    timeSlots: selectedTimes
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save schedule');
            }

            // 로컬 상태 업데이트
            if (selectedTimes.length > 0) {
                teacherSchedule[selectedDate] = selectedTimes;
            } else {
                delete teacherSchedule[selectedDate];
            }

            if (typeof showLoading === 'function') showLoading(false);
            if (typeof showToast === 'function') {
                showToast(`${selectedDate} 스케줄이 저장되었습니다.`, 'success');
            } else {
                alert(`${selectedDate} 스케줄이 저장되었습니다.`);
            }

            // timeslotPanel.classList.add('hidden');
            selectedDate = null;
            renderCalendar();
        } catch (error) {
            console.error('Schedule save error:', error);
            if (typeof showLoading === 'function') showLoading(false);
            if (typeof handleApiError === 'function') {
                handleApiError(error);
            } else {
                alert('스케줄 저장 중 오류가 발생했습니다: ' + error.message);
            }
        }
    });
    } */ // end of saveDateScheduleBtn.addEventListener

    /**
     * 주간 스케줄 렌더링 (구버전 - 사용하지 않음)
     */
    /* function renderCalendar() {
        scheduleContainer.innerHTML = '';
        days.forEach(day => {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column p-3 border rounded-lg bg-gray-50';

            const header = document.createElement('h3');
            header.className = 'font-bold mb-3 text-center text-lg text-indigo-600';
            header.textContent = day;
            dayColumn.appendChild(header);

            // 2열 그리드로 배치
            const gridContainer = document.createElement('div');
            gridContainer.className = 'grid grid-cols-2 gap-2';

            times.forEach(time => {
                const id = `${day}-${time}`;
                const slotKey = `${day}-${time}`;
                const isChecked = teacherSchedule[day] && teacherSchedule[day].includes(time);
                const isBooked = bookedSlots.has(slotKey);

                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot-container';

                const label = document.createElement('label');
                label.htmlFor = id;

                // 예약된 시간은 빨간색 배경, 클릭 불가
                let labelClass;
                if (isBooked) {
                    labelClass = 'bg-red-500 text-white cursor-not-allowed';
                } else if (isChecked) {
                    labelClass = 'bg-indigo-500 text-white cursor-pointer';
                } else {
                    labelClass = 'bg-white hover:bg-indigo-50 cursor-pointer';
                }

                label.className = `time-slot-label flex flex-col items-center justify-center p-2 rounded-md transition-all text-sm ${labelClass}`;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = id;
                checkbox.className = 'sr-only';
                checkbox.dataset.day = day;
                checkbox.dataset.time = time;
                checkbox.checked = isChecked;
                checkbox.disabled = isBooked; // 예약된 시간은 체크박스 비활성화

                // 예약된 시간은 편집 불가
                if (isBooked) {
                    label.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (typeof showToast === 'function') {
                            showToast('이미 예약된 시간입니다. 예약을 먼저 취소해주세요.', 'warning');
                        } else {
                            alert('이미 예약된 시간입니다. 예약을 먼저 취소해주세요.');
                        }
                    });
                } else {
                    // 체크박스 변경 시 라벨 스타일 업데이트
                    checkbox.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            label.classList.remove('bg-white', 'hover:bg-indigo-50');
                            label.classList.add('bg-indigo-500', 'text-white');
                        } else {
                            label.classList.remove('bg-indigo-500', 'text-white');
                            label.classList.add('bg-white', 'hover:bg-indigo-50');
                        }
                    });

                    // 드래그 선택 이벤트 (예약되지 않은 시간만)
                    label.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        mouseDownPos = { x: e.clientX, y: e.clientY };
                        mouseDownCheckbox = checkbox;
                    });

                    label.addEventListener('mouseenter', () => {
                        if (isDragging) {
                            checkbox.checked = dragStartValue;
                            checkbox.dispatchEvent(new Event('change'));
                        }
                    });
                }

                const timeText = document.createElement('span');
                timeText.className = 'font-medium';
                timeText.textContent = time;

                label.appendChild(checkbox);
                label.appendChild(timeText);

                // 예약된 시간 표시 (예약자 이름)
                if (isBooked) {
                    const bookingInfo = bookedSlotsInfo[slotKey];
                    const bookedBadge = document.createElement('span');
                    bookedBadge.className = 'text-xs opacity-90 font-semibold';
                    bookedBadge.textContent = bookingInfo?.studentName || '예약됨';
                    label.appendChild(bookedBadge);
                }

                timeSlot.appendChild(label);
                gridContainer.appendChild(timeSlot);
            });

            dayColumn.appendChild(gridContainer);
            scheduleContainer.appendChild(dayColumn);
        });
    } */

    // 전역 mousemove 이벤트 (드래그 감지) - 구버전, 사용 안 함
    /* document.addEventListener('mousemove', (e) => {
        if (mouseDownPos && !isDragging) {
            const dx = e.clientX - mouseDownPos.x;
            const dy = e.clientY - mouseDownPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If mouse moved more than 5px, activate drag mode
            if (distance > 5) {
                isDragging = true;
                dragStartValue = !mouseDownCheckbox.checked;
                mouseDownCheckbox.checked = dragStartValue;
                mouseDownCheckbox.dispatchEvent(new Event('change'));
            }
        }
    });

    // 전역 mouseup 이벤트
    document.addEventListener('mouseup', () => {
        // 드래그 중이 아니었고, mousedown이 있었다면 클릭으로 간주
        if (!isDragging && mouseDownPos && mouseDownCheckbox) {
            mouseDownCheckbox.checked = !mouseDownCheckbox.checked;
            mouseDownCheckbox.dispatchEvent(new Event('change'));
        }

        // Reset drag state
        isDragging = false;
        mouseDownPos = null;
        mouseDownCheckbox = null;
    }); */

    /**
     * 스케줄 저장 (달력 기반으로 전환 예정)
     */
    // TODO: 달력 기반 저장 로직으로 대체
    /* saveScheduleBtn.addEventListener('click', async () => {
        try {
            if (typeof showLoading === 'function') showLoading(true);

            // 스케줄 데이터 수집
            const newSchedule = {};
            document.querySelectorAll('#schedule-container input[type="checkbox"]:checked').forEach(checkbox => {
                const day = checkbox.dataset.day;
                const time = checkbox.dataset.time;
                if (!newSchedule[day]) {
                    newSchedule[day] = [];
                }
                newSchedule[day].push(time);
            });

            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                console.warn('🔧 개발 모드: 스케줄을 localStorage에 저장합니다.');
                localStorage.setItem(TEACHER_SCHEDULE_KEY, JSON.stringify(newSchedule));
                teacherSchedule = newSchedule;

                if (typeof showLoading === 'function') showLoading(false);
                if (typeof showToast === 'function') {
                    showToast('스케줄이 저장되었습니다. (개발 모드)', 'success');
                } else {
                    alert('스케줄이 저장되었습니다.');
                }

                await renderBookings();
                return;
            }

            // API 모드
            const schedules = [];
            document.querySelectorAll('#schedule-container input[type="checkbox"]').forEach(checkbox => {
                const day = checkbox.dataset.day;
                const time = checkbox.dataset.time;
                const isAvailable = checkbox.checked;

                schedules.push({
                    dayOfWeek: dayMap[day],
                    timeSlot: time,
                    isAvailable: isAvailable
                });
            });

            const response = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacherId: user.id,
                    schedules: schedules
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save schedule');
            }

            teacherSchedule = newSchedule;

            if (typeof showLoading === 'function') showLoading(false);
            if (typeof showToast === 'function') {
                showToast('스케줄이 저장되었습니다.', 'success');
            } else {
                alert('스케줄이 저장되었습니다.');
            }

            await renderBookings();
        } catch (error) {
            console.error('Schedule save error:', error);
            if (typeof showLoading === 'function') showLoading(false);
            if (typeof handleApiError === 'function') {
                handleApiError(error, '스케줄 저장');
            } else {
                alert('스케줄 저장 중 오류가 발생했습니다: ' + error.message);
            }
        }
    }); */

    /**
     * 예약 현황 렌더링
     */
    async function renderBookings() {
        try {
            // bookedSlots 초기화
            bookedSlots.clear();
            bookedSlotsInfo = {};

            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                const bookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
                bookingList.innerHTML = '';

                // 예약된 시간 슬롯 수집
                bookings.forEach(booking => {
                    if (booking.status !== 'cancelled') {
                        const slotKey = `${booking.day}-${booking.time}`;
                        bookedSlots.add(slotKey);
                        bookedSlotsInfo[slotKey] = {
                            studentName: booking.studentName,
                            bookingDate: booking.bookingDate
                        };
                    }
                });

                if (bookings.length === 0) {
                    bookingList.innerHTML = '<p class="text-gray-500">예약된 수업이 없습니다.</p>';
                    renderCalendar(); // 달력 다시 렌더링
                    return;
                }

                // 상태별로 정렬: pending -> approved -> rejected -> cancelled
                const sortOrder = { 'pending': 0, 'approved': 1, 'completed': 2, 'rejected': 3, 'cancelled': 4 };
                bookings.sort((a, b) => (sortOrder[a.status] || 99) - (sortOrder[b.status] || 99));

                bookings.forEach(booking => {
                    const bookingItem = document.createElement('div');

                    // 상태별 스타일링
                    let statusClass, statusText, statusIcon;
                    switch(booking.status) {
                        case 'pending':
                            statusClass = 'bg-yellow-50 border-yellow-200 border-2';
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

                    bookingItem.className = `p-4 border rounded-md shadow-sm ${statusClass}`;
                    bookingItem.innerHTML = `
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <p class="font-semibold text-lg">${booking.studentName}님</p>
                                <p class="text-gray-700">${booking.day} ${booking.time}</p>
                                <p class="text-sm text-gray-600">요청일: ${booking.bookingDate || ''}</p>
                                <p class="text-sm font-semibold mt-1 ${
                                    booking.status === 'approved' ? 'text-green-600' :
                                    booking.status === 'pending' ? 'text-yellow-600' :
                                    booking.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                                }">${statusIcon} ${statusText}</p>
                            </div>
                            ${booking.status === 'pending' ? `
                                <div class="flex gap-2">
                                    <button class="approve-booking-btn btn btn-success btn-sm" data-booking-id="${booking.id}">
                                        승인
                                    </button>
                                    <button class="reject-booking-btn btn btn-danger btn-sm" data-booking-id="${booking.id}">
                                        거절
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                    bookingList.appendChild(bookingItem);
                });

                // 승인/거절 버튼 이벤트 리스너 추가
                document.querySelectorAll('.approve-booking-btn').forEach(btn => {
                    btn.addEventListener('click', handleApproveBooking);
                });
                document.querySelectorAll('.reject-booking-btn').forEach(btn => {
                    btn.addEventListener('click', handleRejectBooking);
                });

                renderCalendar(); // 달력 다시 렌더링 (예약된 시간 표시 반영)
                return;
            }

            // API 모드
            const response = await fetch(`/api/bookings?teacherId=${user.id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load bookings');
            }

            // 예약된 시간 슬롯 수집
            if (data.bookings && data.bookings.length > 0) {
                data.bookings.forEach(booking => {
                    if (booking.status !== 'cancelled' && booking.status !== 'rejected' && booking.status !== 'completed') {
                        const slotKey = `${booking.booking_date}-${booking.time_slot}`;
                        bookedSlots.add(slotKey);
                        bookedSlotsInfo[slotKey] = {
                            studentName: booking.student_name,
                            bookingDate: booking.booking_date
                        };
                    }
                });
            }

            bookingList.innerHTML = '';

            if (!data.bookings || data.bookings.length === 0) {
                bookingList.innerHTML = '<p class="text-gray-500">예약된 수업이 없습니다.</p>';
                renderCalendar(); // 스케줄 다시 렌더링
                return;
            }

            // 상태별로 정렬: pending -> approved -> rejected -> cancelled
            const sortOrder = { 'pending': 0, 'approved': 1, 'completed': 2, 'rejected': 3, 'cancelled': 4 };
            data.bookings.sort((a, b) => (sortOrder[a.status] || 99) - (sortOrder[b.status] || 99));

            data.bookings.forEach(booking => {
                const bookingItem = document.createElement('div');

                // 상태별 스타일링
                let statusClass, statusText, statusIcon;
                switch(booking.status) {
                    case 'pending':
                        statusClass = 'bg-yellow-50 border-yellow-200 border-2';
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

                // 제시된 시간 슬롯 표시
                const suggestedTimes = booking.suggested_time_slots || [];
                const hasSuggestedTimes = suggestedTimes.length > 0;

                let suggestedTimesHtml = '';
                if (booking.status === 'pending' && hasSuggestedTimes) {
                    suggestedTimesHtml = `
                        <div class="mt-2">
                            <p class="text-xs font-medium text-gray-700 mb-1">학생 가능 시간:</p>
                            <select id="time-select-${booking.id}" class="text-sm p-1 border rounded w-full max-w-xs">
                                ${suggestedTimes.map(time => `<option value="${time}">${time}</option>`).join('')}
                            </select>
                        </div>
                    `;
                }

                bookingItem.className = `p-4 border rounded-md shadow-sm ${statusClass}`;
                const timeDisplay = booking.time_slot ? booking.time_slot : '(시간 미정)';
                bookingItem.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <p class="font-semibold text-lg">${booking.student_name}님</p>
                            <p class="text-gray-700">${booking.booking_date} ${timeDisplay}</p>
                            <p class="text-sm text-gray-600">요청일: ${booking.created_at ? new Date(booking.created_at).toLocaleDateString('ko-KR') : ''}</p>
                            ${suggestedTimesHtml}
                            <p class="text-sm font-semibold mt-1 ${
                                booking.status === 'approved' ? 'text-green-600' :
                                booking.status === 'pending' ? 'text-yellow-600' :
                                booking.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                            }">${statusIcon} ${statusText}</p>
                        </div>
                        ${booking.status === 'pending' ? `
                            <div class="flex gap-2">
                                <button class="approve-booking-btn btn btn-success btn-sm" data-booking-id="${booking.id}">
                                    승인
                                </button>
                                <button class="reject-booking-btn btn btn-danger btn-sm" data-booking-id="${booking.id}">
                                    거절
                                </button>
                            </div>
                        ` : ''}
                        ${booking.status === 'approved' || booking.status === 'completed' ? `
                            <div class="flex flex-col gap-2">
                                <button class="generate-booking-qr-btn btn btn-primary btn-sm"
                                        data-booking-id="${booking.id}"
                                        data-booking-date="${booking.booking_date}"
                                        data-booking-time="${booking.time_slot || ''}">
                                    📱 QR 생성
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
                bookingList.appendChild(bookingItem);
            });

            // 승인/거절 버튼 이벤트 리스너 추가
            document.querySelectorAll('.approve-booking-btn').forEach(btn => {
                btn.addEventListener('click', handleApproveBooking);
            });
            document.querySelectorAll('.reject-booking-btn').forEach(btn => {
                btn.addEventListener('click', handleRejectBooking);
            });

            // QR 생성 버튼 이벤트 리스너 추가
            document.querySelectorAll('.generate-booking-qr-btn').forEach(btn => {
                btn.addEventListener('click', handleGenerateBookingQR);
            });

            // 예약 데이터를 전역 변수에 저장하고 날짜별로 그룹화
            allBookings = data.bookings;
            bookingsByDate = {};
            data.bookings.forEach(booking => {
                const date = booking.booking_date;
                if (!bookingsByDate[date]) {
                    bookingsByDate[date] = [];
                }
                bookingsByDate[date].push(booking);
            });

            renderCalendar(); // 스케줄 다시 렌더링 (예약된 시간 표시 반영)
        } catch (error) {
            console.error('Load bookings error:', error);
            bookingList.innerHTML = '<p class="text-red-500">예약 현황을 불러오는데 실패했습니다.</p>';
        }
    }

    /**
     * 예약 승인 처리
     */
    async function handleApproveBooking(event) {
        const bookingId = parseInt(event.target.dataset.bookingId);

        // 선택된 시간 가져오기
        const timeSelectElement = document.getElementById(`time-select-${bookingId}`);
        const selectedTime = timeSelectElement ? timeSelectElement.value : null;

        if (!selectedTime) {
            if (typeof showToast === 'function') {
                showToast('시간을 선택해주세요.', 'error');
            } else {
                alert('시간을 선택해주세요.');
            }
            return;
        }

        // 현재 예약의 날짜 가져오기
        const currentBooking = allBookings.find(b => b.id === bookingId);
        if (!currentBooking) {
            alert('예약 정보를 찾을 수 없습니다.');
            return;
        }

        // 같은 날짜, 같은 시간에 이미 승인된 예약이 있는지 확인
        const conflictingBooking = allBookings.find(b =>
            b.id !== bookingId &&
            b.booking_date === currentBooking.booking_date &&
            b.time_slot === selectedTime &&
            b.status === 'approved'
        );

        // 중복 예약이 있으면 경고 메시지 표시
        if (conflictingBooking) {
            const confirmMessage = `같은 시간(${selectedTime})에 이미 승인된 예약이 있습니다.\n학생: ${conflictingBooking.student_name}\n\n그래도 승인하시겠습니까?`;
            if (!confirm(confirmMessage)) {
                return;
            }
        } else {
            if (!confirm(`${selectedTime}으로 이 예약을 승인하시겠습니까?`)) {
                return;
            }
        }

        try {
            if (typeof showLoading === 'function') showLoading(true);

            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                console.warn('🔧 개발 모드: localStorage에서 예약을 승인합니다.');

                const existingBookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
                const booking = existingBookings.find(b => b.id === bookingId);

                if (booking) {
                    booking.status = 'approved';
                    booking.time = selectedTime;
                    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(existingBookings));
                }

                if (typeof showLoading === 'function') showLoading(false);
                if (typeof showToast === 'function') {
                    showToast('예약이 승인되었습니다! (개발 모드)', 'success');
                } else {
                    alert('예약이 승인되었습니다!');
                }

                await renderBookings();
                return;
            }

            // API 모드 - selectedTime을 쿼리 파라미터로 전달
            const response = await fetch(`/api/bookings?id=${bookingId}&action=approve&selectedTime=${encodeURIComponent(selectedTime)}`, {
                method: 'PATCH',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '승인 실패');
            }

            if (typeof showLoading === 'function') showLoading(false);
            if (typeof showToast === 'function') {
                showToast(`${selectedTime}으로 예약이 승인되었습니다!`, 'success');
            } else {
                alert(`${selectedTime}으로 예약이 승인되었습니다!`);
            }

            await renderBookings();
        } catch (error) {
            console.error('Approve booking error:', error);
            if (typeof showLoading === 'function') showLoading(false);
            if (typeof handleApiError === 'function') {
                handleApiError(error);
            } else {
                alert('예약 승인 중 오류가 발생했습니다: ' + error.message);
            }
        }
    }

    /**
     * 예약 거절 처리
     */
    async function handleRejectBooking(event) {
        const bookingId = parseInt(event.target.dataset.bookingId);

        if (!confirm('이 예약을 거절하시겠습니까?')) {
            return;
        }

        try {
            if (typeof showLoading === 'function') showLoading(true);

            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                console.warn('🔧 개발 모드: localStorage에서 예약을 거절합니다.');

                const existingBookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
                const booking = existingBookings.find(b => b.id === bookingId);

                if (booking) {
                    booking.status = 'rejected';
                    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(existingBookings));
                }

                if (typeof showLoading === 'function') showLoading(false);
                if (typeof showToast === 'function') {
                    showToast('예약이 거절되었습니다. (개발 모드)', 'info');
                } else {
                    alert('예약이 거절되었습니다.');
                }

                await renderBookings();
                return;
            }

            // API 모드
            const response = await fetch(`/api/bookings?id=${bookingId}&action=reject`, {
                method: 'PATCH',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '거절 실패');
            }

            if (typeof showLoading === 'function') showLoading(false);
            if (typeof showToast === 'function') {
                showToast('예약이 거절되었습니다.', 'info');
            } else {
                alert('예약이 거절되었습니다.');
            }

            await renderBookings();
        } catch (error) {
            console.error('Reject booking error:', error);
            if (typeof showLoading === 'function') showLoading(false);
            if (typeof handleApiError === 'function') {
                handleApiError(error);
            } else {
                alert('예약 거절 중 오류가 발생했습니다: ' + error.message);
            }
        }
    }

    /**
     * 예약별 QR 코드 생성
     */
    function handleGenerateBookingQR(event) {
        const bookingId = event.target.dataset.bookingId;
        const bookingDate = event.target.dataset.bookingDate;
        const bookingTime = event.target.dataset.bookingTime;

        const qrData = `${window.location.origin}/signature?bookingId=${bookingId}`;

        qrcodeDiv.innerHTML = ''; // 기존 QR 코드 제거
        new QRCode(qrcodeDiv, {
            text: qrData,
            width: 200,
            height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        qrInfo.textContent = `${bookingDate} ${bookingTime} 수업 출석용 QR 코드`;

        // 해당 예약의 출석 현황 표시
        renderAttendanceForBooking(bookingId);

        // 스크롤하여 QR 코드가 보이도록
        qrcodeDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        if (typeof showToast === 'function') {
            showToast(`${bookingDate} ${bookingTime} 수업 QR 생성 완료`, 'success');
        }
    }

    /**
     * 즉석 수업 QR 코드 생성
     */
    function handleGenerateInstantQR() {
        if (!user || !user.id) {
            if (typeof showToast === 'function') {
                showToast('로그인이 필요합니다.', 'error');
            } else {
                alert('로그인이 필요합니다.');
            }
            return;
        }

        // 현재 시간 기준으로 30분 단위 시간대 계산
        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes();
        const startMin = minutes < 30 ? '00' : '30';
        const endMin = minutes < 30 ? '30' : '00';
        const endHour = minutes < 30 ? hour : hour + 1;

        const timeSlot = `${String(hour).padStart(2, '0')}:${startMin}-${String(endHour).padStart(2, '0')}:${endMin}`;
        const today = new Date().toISOString().split('T')[0];

        // 즉석 세션 ID 생성
        const sessionId = `instant_${user.id}_${Date.now()}`;

        // QR 데이터 생성
        const qrData = `${window.location.origin}/signature?sessionId=${sessionId}&teacherId=${user.id}`;

        qrcodeDiv.innerHTML = ''; // 기존 QR 코드 제거
        new QRCode(qrcodeDiv, {
            text: qrData,
            width: 200,
            height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        qrInfo.textContent = `⚡ 즉석 수업 QR 코드 (${today} ${timeSlot})`;

        // 오늘 날짜의 출석 현황 표시
        renderAttendance(today);

        // 스크롤하여 QR 코드가 보이도록
        qrcodeDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        if (typeof showToast === 'function') {
            showToast(`즉석 수업 QR 생성 완료 (${timeSlot})`, 'success');
        }
    }

    /**
     * QR 코드 생성 (일반 QR 생성 버튼 제거 - 예약 기반 QR만 사용)
     * 예약별 QR 생성은 handleGenerateBookingQR 함수 참조
     */

    /**
     * 출석 현황 렌더링
     */
    async function renderAttendance(filterDate = null) {
        try {
            attendanceList.innerHTML = '<p class="text-gray-500 text-sm">출석 현황을 불러오는 중...</p>';

            let attendance = [];

            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                const ATTENDANCE_KEY = 'attendance';
                attendance = JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || '[]');
            } else {
                // API 모드
                const response = await fetch('/api/attendance');
                if (!response.ok) {
                    throw new Error('Failed to fetch attendance records');
                }
                const data = await response.json();
                attendance = data.attendances || [];
            }

            attendanceList.innerHTML = '';

            if (attendance.length === 0) {
                attendanceList.innerHTML = '<p class="text-gray-500 text-sm">출석 기록이 없습니다.</p>';
                return;
            }

            // 현재 강사의 예약 ID 목록 가져오기
            const teacherBookingIds = allBookings
                .filter(b => b.teacher_id === user.id)
                .map(b => b.id);

            // 날짜 및 강사 예약으로 필터링
            const targetDate = filterDate || new Date().toISOString().split('T')[0];
            let todayAttendance = USE_LOCAL_STORAGE_ONLY
                ? attendance.filter(a => a.date === targetDate)
                : attendance.filter(a => a.attended_at && a.attended_at.startsWith(targetDate));

            // 강사의 예약에 해당하는 출석만 필터링
            todayAttendance = todayAttendance.filter(a =>
                a.booking_id && teacherBookingIds.includes(a.booking_id)
            );

            if (todayAttendance.length === 0) {
                attendanceList.innerHTML = '<p class="text-gray-500 text-sm">오늘 출석 기록이 없습니다.</p>';
                return;
            }

            // 최신 순으로 정렬
            todayAttendance.sort((a, b) => {
                const timeA = USE_LOCAL_STORAGE_ONLY ? new Date(a.timestamp) : new Date(a.attended_at);
                const timeB = USE_LOCAL_STORAGE_ONLY ? new Date(b.timestamp) : new Date(b.attended_at);
                return timeB - timeA;
            });

            todayAttendance.forEach(record => {
                const attendanceItem = document.createElement('div');
                attendanceItem.className = 'p-3 border rounded-md bg-green-50 text-sm space-y-2';

                const timestamp = USE_LOCAL_STORAGE_ONLY ? record.timestamp : record.attended_at;
                const time = new Date(timestamp).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const studentName = USE_LOCAL_STORAGE_ONLY ? record.studentName : (record.student_name || `학생 ID: ${record.student_id}`);
                const sessionId = record.session_id || record.sessionId;
                const signatureUrl = record.signature_url || record.signature;

                let html = `
                    <p class="font-semibold">${studentName}</p>
                    <p class="text-xs text-gray-600">출석 시간: ${time}</p>
                    <p class="text-xs text-gray-500">세션: ${sessionId}</p>
                `;

                if (signatureUrl) {
                    html += `
                        <div class="mt-2">
                            <p class="text-xs font-medium mb-1">서명:</p>
                            <img src="${signatureUrl}" alt="서명" class="border border-gray-300 rounded max-w-full h-20 object-contain bg-white">
                        </div>
                    `;
                }

                attendanceItem.innerHTML = html;
                attendanceList.appendChild(attendanceItem);
            });

        } catch (error) {
            console.error('Render attendance error:', error);
            attendanceList.innerHTML = '<p class="text-red-500 text-sm">출석 현황을 불러올 수 없습니다.</p>';
        }
    }

    /**
     * 특정 예약의 출석 현황 렌더링
     */
    async function renderAttendanceForBooking(bookingId) {
        try {
            attendanceList.innerHTML = '<p class="text-gray-500 text-sm">출석 현황을 불러오는 중...</p>';

            let attendance = [];

            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                const ATTENDANCE_KEY = 'attendance';
                attendance = JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || '[]');
            } else {
                // API 모드
                const response = await fetch('/api/attendance');
                if (!response.ok) {
                    throw new Error('Failed to fetch attendance records');
                }
                const data = await response.json();
                attendance = data.attendances || [];
            }

            // bookingId로 필터링 및 강사 검증
            const booking = allBookings.find(b => String(b.id) === String(bookingId));

            // 해당 예약이 현재 강사의 것인지 확인
            if (!booking || booking.teacher_id !== user.id) {
                attendanceList.innerHTML = '<p class="text-red-500 text-sm">권한이 없는 예약입니다.</p>';
                return;
            }

            const bookingAttendance = attendance.filter(a =>
                String(a.booking_id) === String(bookingId)
            );

            attendanceList.innerHTML = '';

            if (bookingAttendance.length === 0) {
                attendanceList.innerHTML = '<p class="text-gray-500 text-sm">이 수업의 출석 기록이 없습니다.</p>';
                return;
            }

            // 최신 순으로 정렬
            bookingAttendance.sort((a, b) => {
                const timeA = USE_LOCAL_STORAGE_ONLY ? new Date(a.timestamp) : new Date(a.attended_at);
                const timeB = USE_LOCAL_STORAGE_ONLY ? new Date(b.timestamp) : new Date(b.attended_at);
                return timeB - timeA;
            });

            bookingAttendance.forEach(record => {
                const attendanceItem = document.createElement('div');
                attendanceItem.className = 'p-3 border rounded-md bg-green-50 text-sm space-y-2';

                const timestamp = USE_LOCAL_STORAGE_ONLY ? record.timestamp : record.attended_at;
                const time = new Date(timestamp).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const studentName = USE_LOCAL_STORAGE_ONLY ? record.studentName : (record.student_name || `학생 ID: ${record.student_id}`);
                const signatureUrl = record.signature_url || record.signature;

                let html = `
                    <p class="font-semibold">${studentName}</p>
                    <p class="text-xs text-gray-600">출석 시간: ${time}</p>
                `;

                if (signatureUrl) {
                    html += `
                        <div class="mt-2">
                            <p class="text-xs font-medium mb-1">서명:</p>
                            <img src="${signatureUrl}" alt="서명" class="border border-gray-300 rounded max-w-full h-20 object-contain bg-white">
                        </div>
                    `;
                }

                attendanceItem.innerHTML = html;
                attendanceList.appendChild(attendanceItem);
            });

        } catch (error) {
            console.error('Render booking attendance error:', error);
            attendanceList.innerHTML = '<p class="text-red-500 text-sm">출석 현황을 불러올 수 없습니다.</p>';
        }
    }

    // 출석 현황 새로고침 버튼
    refreshAttendanceBtn.addEventListener('click', () => {
        renderAttendance();
        if (typeof showToast === 'function') {
            showToast('출석 현황을 새로고침했습니다.', 'info');
        }
    });

    // 즉석 수업 QR 생성 버튼
    if (generateInstantQrBtn) {
        generateInstantQrBtn.addEventListener('click', handleGenerateInstantQR);
    }

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

    /**
     * 스케줄 로드 (API 또는 localStorage)
     */
    async function loadSchedule() {
        try {
            if (USE_LOCAL_STORAGE_ONLY) {
                // localStorage 모드
                console.warn('🔧 개발 모드: localStorage에서 스케줄을 로드합니다.');
                const saved = localStorage.getItem(TEACHER_SCHEDULE_KEY);
                teacherSchedule = saved ? JSON.parse(saved) : {};
                renderCalendar();
                return;
            }

            // API 모드 - 날짜 범위로 조회 (현재 달부터 3개월)
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0).toISOString().split('T')[0];

            const response = await fetch(`/api/schedule?teacherId=${user.id}&startDate=${startDate}&endDate=${endDate}`);
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
            renderCalendar(); // Render empty schedule
        }
    }

    // 날짜별 예약 패널 닫기 버튼 이벤트
    const closeDateBookingsBtn = document.getElementById('close-date-bookings-btn');
    if (closeDateBookingsBtn) {
        closeDateBookingsBtn.addEventListener('click', () => {
            const dateBookingsPanel = document.getElementById('date-bookings-panel');
            if (dateBookingsPanel) {
                dateBookingsPanel.classList.add('hidden');
            }
            selectedDate = null;
            renderCalendar();
        });
    }

    // 초기 렌더링
    initializeTimeRange(); // 시간 범위 초기화
    populateScheduleTimeOptions(); // 스케줄 시간 옵션 생성
    initializeTimeSelects(); // 시간 선택 드롭다운 초기화
    renderCalendar(); // 달력 초기 렌더링
    await loadStudents(); // 학생 목록 로드 (start_date, end_date 포함)
    await loadSchedule();
    await renderBookings();
    renderAttendance(); // 출석 현황 표시
    requestNotificationPermission(); // 페이지 로드 시 알림 권한 요청

    // 스케줄 패널 이벤트 리스너
    if (saveScheduleBtn) {
        saveScheduleBtn.addEventListener('click', saveSchedule);
    }
    if (closeScheduleBtn) {
        closeScheduleBtn.addEventListener('click', closeSchedulePanelFunc);
    }

    // 현재 시간으로 QR 생성 버튼 이벤트 리스너
    if (generateQrBtn) {
        generateQrBtn.addEventListener('click', () => {
            // 현재 시간을 sessionId로 사용 (익명 서명용)
            const now = new Date();
            const sessionId = now.toISOString();
            const qrData = `${window.location.origin}/signature?sessionId=${encodeURIComponent(sessionId)}`;

            qrcodeDiv.innerHTML = ''; // 기존 QR 코드 제거
            new QRCode(qrcodeDiv, {
                text: qrData,
                width: 200,
                height: 200,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });

            // 한국 시간으로 표시
            const kstOffset = 9 * 60;
            const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);
            const timeStr = kstNow.toISOString().substring(0, 19).replace('T', ' ');

            qrInfo.textContent = `익명 출석용 QR 코드 (생성시간: ${timeStr} KST)`;

            // 출석 현황 새로고침
            renderAttendance();

            if (typeof showToast === 'function') {
                showToast('익명 출석용 QR 코드가 생성되었습니다.', 'success');
            }
        });
    }

    // 출석 새로고침 버튼 이벤트 리스너
    if (refreshAttendanceBtn) {
        refreshAttendanceBtn.addEventListener('click', () => {
            renderAttendance();
            if (typeof showToast === 'function') {
                showToast('출석 현황이 새로고침되었습니다.', 'success');
            }
        });
    }
});
