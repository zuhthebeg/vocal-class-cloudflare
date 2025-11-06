document.addEventListener('DOMContentLoaded', () => {
    checkAuth(['teacher']);

    const studentListContainer = document.getElementById('student-list-container');
    const modal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const cancelBtn = document.getElementById('cancel-edit-btn');

    let students = [];

    async function fetchStudents() {
        try {
            const user = getUser();
            if (!user || !user.id) {
                studentListContainer.innerHTML = '<p class="text-red-500">로그인 정보를 찾을 수 없습니다.</p>';
                return;
            }

            const response = await fetch(`/api/auth?role=student&teacherId=${user.id}`);
            if (!response.ok) throw new Error('Failed to fetch students');
            const data = await response.json();
            students = data.users || [];
            renderStudents();
        } catch (error) {
            studentListContainer.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    }

    function renderStudents() {
        if (students.length === 0) {
            studentListContainer.innerHTML = '<p>등록된 수강생이 없습니다.</p>';
            return;
        }

        let tableHtml = `
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="py-3 px-4 text-left">이름</th>
                        <th class="py-3 px-4 text-left">수업 시작일</th>
                        <th class="py-3 px-4 text-left">수업 종료일</th>
                        <th class="py-3 px-4 text-left">출석 횟수</th>
                        <th class="py-3 px-4 text-left">입금 계좌</th>
                        <th class="py-3 px-4 text-left">입금 여부</th>
                        <th class="py-3 px-4 text-left">수업 메모</th>
                        <th class="py-3 px-4 text-left">작업</th>
                    </tr>
                </thead>
                <tbody>`;

        students.forEach(student => {
            tableHtml += `
                <tr class="border-b">
                    <td class="py-3 px-4 font-medium">${student.name}</td>
                    <td class="py-3 px-4">${student.start_date || '-'}</td>
                    <td class="py-3 px-4">${student.end_date || '-'}</td>
                    <td class="py-3 px-4">${student.attendance_count || 0}</td>
                    <td class="py-3 px-4">${student.bank_account || '-'}</td>
                    <td class="py-3 px-4">${student.payment_status === 'paid' ? '완납' : '미납'}</td>
                    <td class="py-3 px-4 truncate max-w-xs">${student.notes || '-'}</td>
                    <td class="py-3 px-4">
                        <button class="btn btn-secondary btn-sm edit-btn" data-id="${student.id}">수정</button>
                    </td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';
        studentListContainer.innerHTML = tableHtml;

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', handleEditClick);
        });
    }

    function handleEditClick(event) {
        const studentId = event.target.dataset.id;
        const student = students.find(s => s.id == studentId);
        if (!student) return;

        document.getElementById('edit-student-id').value = student.id;
        document.getElementById('edit-name').value = student.name;
        document.getElementById('edit-start-date').value = student.start_date || '';
        document.getElementById('edit-end-date').value = student.end_date || '';
        document.getElementById('edit-payment-info').value = student.payment_info || '';
        document.getElementById('edit-bank-account').value = student.bank_account || '';
        document.getElementById('edit-payment-status').value = student.payment_status || 'unpaid';
        document.getElementById('edit-notes').value = student.notes || '';

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function closeModal() {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const studentId = document.getElementById('edit-student-id').value;
        const updatedData = {
            start_date: document.getElementById('edit-start-date').value,
            end_date: document.getElementById('edit-end-date').value,
            payment_info: document.getElementById('edit-payment-info').value,
            bank_account: document.getElementById('edit-bank-account').value,
            payment_status: document.getElementById('edit-payment-status').value,
            notes: document.getElementById('edit-notes').value,
        };

        try {
            const response = await fetch(`/api/auth?id=${studentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '업데이트 실패');
            }
            
            showToast('수강생 정보가 업데이트되었습니다.', 'success');
            closeModal();
            fetchStudents(); // Refresh the list
        } catch (error) {
            showToast(`오류: ${error.message}`, 'error');
        }
    }

    cancelBtn.addEventListener('click', closeModal);
    editForm.addEventListener('submit', handleFormSubmit);

    fetchStudents();
});
