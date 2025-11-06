document.addEventListener('DOMContentLoaded', () => {
    const password = prompt('관리자 비밀번호를 입력하세요:');
    if (password !== 'cocy') {
        alert('비밀번호가 틀렸습니다.');
        document.body.innerHTML = '';
        return;
    }

    // Element references
    const loadTeachersBtn = document.getElementById('load-teachers-btn');
    const teachersList = document.getElementById('teachers-list');
    const loadStudentsBtn = document.getElementById('load-students-btn');
    const studentsList = document.getElementById('students-list');
    const loadBookingsBtn = document.getElementById('load-bookings-btn');
    const bookingsList = document.getElementById('bookings-list');
    const loadAttendanceBtn = document.getElementById('load-attendance-btn');
    const attendanceList = document.getElementById('attendance-list');

    // Generic fetch and render function
    async function loadAndRender(endpoint, listElement, renderFn) {
        listElement.innerHTML = '<p>데이터를 불러오는 중...</p>';
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderFn(data, listElement);
        } catch (error) {
            listElement.innerHTML = `<p class="text-red-500">데이터 로딩 실패: ${error.message}</p>`;
        }
    }

    // Generic delete function
    async function deleteItem(endpoint, id, listElement, loadFn) {
        if (!confirm(`정말로 ID ${id} 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }
        try {
            const response = await fetch(`${endpoint}?id=${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            alert(`ID ${id} 항목이 삭제되었습니다.`);
            loadFn(); // Refresh the list
        } catch (error) {
            alert(`삭제 실패: ${error.message}`);
        }
    }

    // Render functions
    const renderUsers = (data, element) => {
        const users = data.users || [];
        if (users.length === 0) {
            element.innerHTML = '<p>데이터가 없습니다.</p>';
            return;
        }
        element.innerHTML = `
            <table class="min-w-full bg-white">
                <thead><tr><th class="py-2 px-4 border-b">ID</th><th class="py-2 px-4 border-b">이름</th><th class="py-2 px-4 border-b">역할</th><th class="py-2 px-4 border-b">작업</th></tr></thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td class="py-2 px-4 border-b">${user.id}</td>
                            <td class="py-2 px-4 border-b">${user.name}</td>
                            <td class="py-2 px-4 border-b">${user.role}</td>
                            <td class="py-2 px-4 border-b"><button class="btn btn-danger btn-sm delete-user-btn" data-id="${user.id}">삭제</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        element.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const listId = element.id;
                let loadFn;
                if (listId === 'teachers-list') loadFn = loadTeachers;
                if (listId === 'students-list') loadFn = loadStudents;
                deleteItem('/api/auth', id, element, loadFn);
            });
        });
    };

    const renderBookings = (data, element) => {
        const bookings = data.bookings || [];
        if (bookings.length === 0) {
            element.innerHTML = '<p>데이터가 없습니다.</p>';
            return;
        }
        element.innerHTML = `
            <table class="min-w-full bg-white">
                <thead><tr><th class="py-2 px-4 border-b">ID</th><th class="py-2 px-4 border-b">학생</th><th class="py-2 px-4 border-b">강사</th><th class="py-2 px-4 border-b">날짜</th><th class="py-2 px-4 border-b">시간</th><th class="py-2 px-4 border-b">상태</th><th class="py-2 px-4 border-b">작업</th></tr></thead>
                <tbody>
                    ${bookings.map(b => `
                        <tr>
                            <td class="py-2 px-4 border-b">${b.id}</td>
                            <td class="py-2 px-4 border-b">${b.student_name}</td>
                            <td class="py-2 px-4 border-b">${b.teacher_name}</td>
                            <td class="py-2 px-4 border-b">${b.booking_date}</td>
                            <td class="py-2 px-4 border-b">${b.time_slot || '미정'}</td>
                            <td class="py-2 px-4 border-b">${b.status}</td>
                            <td class="py-2 px-4 border-b"><button class="btn btn-danger btn-sm delete-booking-btn" data-id="${b.id}">삭제</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        element.querySelectorAll('.delete-booking-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteItem('/api/bookings', e.target.dataset.id, element, loadBookings));
        });
    };

    const renderAttendance = (data, element) => {
        const attendances = data.attendances || [];
        if (attendances.length === 0) {
            element.innerHTML = '<p>데이터가 없습니다.</p>';
            return;
        }
        element.innerHTML = `
            <table class="min-w-full bg-white">
                <thead><tr><th class="py-2 px-4 border-b">ID</th><th class="py-2 px-4 border-b">학생</th><th class="py-2 px-4 border-b">세션 ID</th><th class="py-2 px-4 border-b">출석 시간</th><th class="py-2 px-4 border-b">작업</th></tr></thead>
                <tbody>
                    ${attendances.map(a => `
                        <tr>
                            <td class="py-2 px-4 border-b">${a.id}</td>
                            <td class="py-2 px-4 border-b">${a.student_name}</td>
                            <td class="py-2 px-4 border-b">${a.session_id}</td>
                            <td class="py-2 px-4 border-b">${new Date(a.attended_at).toLocaleString()}</td>
                            <td class="py-2 px-4 border-b"><button class="btn btn-danger btn-sm delete-attendance-btn" data-id="${a.id}">삭제</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        element.querySelectorAll('.delete-attendance-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteItem('/api/attendance', e.target.dataset.id, element, loadAttendance));
        });
    };

    // Load functions
    const loadTeachers = () => loadAndRender('/api/auth?role=teacher', teachersList, renderUsers);
    const loadStudents = () => loadAndRender('/api/auth?role=student', studentsList, renderUsers);
    const loadBookings = () => loadAndRender('/api/bookings', bookingsList, renderBookings);
    const loadAttendance = () => loadAndRender('/api/attendance', attendanceList, renderAttendance);

    // Event Listeners
    loadTeachersBtn.addEventListener('click', loadTeachers);
    loadStudentsBtn.addEventListener('click', loadStudents);
    loadBookingsBtn.addEventListener('click', loadBookings);
    loadAttendanceBtn.addEventListener('click', loadAttendance);

    // Delete All Listeners
    document.getElementById('delete-all-teachers-btn').addEventListener('click', () => deleteAllItems('/api/auth?role=teacher', '강사', loadTeachers));
    document.getElementById('delete-all-students-btn').addEventListener('click', () => deleteAllItems('/api/auth?role=student', '수강생', loadStudents));
    document.getElementById('delete-all-bookings-btn').addEventListener('click', () => deleteAllItems('/api/bookings', '예약', loadBookings));
    document.getElementById('delete-all-attendance-btn').addEventListener('click', () => deleteAllItems('/api/attendance', '출석', loadAttendance));

    async function deleteAllItems(endpoint, itemType, loadFn) {
        if (!confirm(`정말로 모든 ${itemType} 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }
        try {
            const response = await fetch(endpoint, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            alert(`모든 ${itemType} 데이터가 삭제되었습니다.`);
            loadFn(); // Refresh the list
        } catch (error) {
            alert(`전체 삭제 실패: ${error.message}`);
        }
    }
});