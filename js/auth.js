const USER_KEY = 'vocalUser';

/**
 * 로그인 처리 함수
 * @param {string} name - 사용자 이름
 * @param {string} role - 사용자 역할 ('teacher' 또는 'student')
 */
function login(name, role) {
    if (!name || !role) {
        alert('이름과 역할을 모두 입력해주세요.');
        return;
    }
    const user = { name, role };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    
    // 역할에 따라 페이지 이동
    if (role === 'teacher') {
        window.location.href = '/teacher.html';
    } else {
        window.location.href = '/student.html';
    }
}

/**
 * 로그아웃 처리 함수
 */
function logout() {
    localStorage.removeItem(USER_KEY);
    window.location.href = '/index.html';
}

/**
 * 현재 로그인된 사용자 정보를 가져오는 함수
 * @returns {object|null} 사용자 정보 객체 또는 null
 */
function getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

/**
 * 페이지 접근 권한을 확인하는 함수
 * @param {string[]} allowedRoles - 허용된 역할 배열
 */
function checkAuth(allowedRoles = []) {
    const user = getUser();
    if (!user) {
        alert('로그인이 필요합니다.');
        window.location.href = '/index.html';
        return;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        alert('이 페이지에 접근할 권한이 없습니다.');
        window.location.href = '/index.html';
        return;
    }
}

// 공통적으로 로그아웃 버튼에 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});
