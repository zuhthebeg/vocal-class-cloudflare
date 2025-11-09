const USER_KEY = 'vocalUser';

/**
 * 로그인 처리 함수
 * @param {string} name - 사용자 이름
 * @param {string} role - 사용자 역할 ('teacher' 또는 'student')
 * @param {string|null} categoryId - 강사의 수업 카테고리 ID (강사인 경우에만)
 */
async function login(name, role, categoryId = null) {
    if (!name || !role) {
        if (typeof showToast === 'function') {
            showToast('이름과 역할을 모두 입력해주세요.', 'error');
        } else {
            alert('이름과 역할을 모두 입력해주세요.');
        }
        return;
    }

    try {
        // Show loading
        if (typeof showLoading === 'function') {
            showLoading(true);
        }

        // 항상 API 모드 사용 (개발/프로덕션 모두 D1 데이터베이스 사용)
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role }),
        });

        // 응답이 비어있는지 확인
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('서버에서 올바른 응답을 받지 못했습니다. wrangler pages dev로 서버를 실행해주세요.');
        }

        const text = await response.text();
        let data;

        try {
            data = text ? JSON.parse(text) : {};
        } catch (parseError) {
            console.error('JSON parse error:', parseError, 'Response text:', text);
            throw new Error('서버 응답을 파싱할 수 없습니다.');
        }

        if (!response.ok) {
            throw new Error(data.error || `로그인 실패 (${response.status})`);
        }

        user = data.user;

        // Store user info in localStorage
        localStorage.setItem(USER_KEY, JSON.stringify(user));

        // 강사인 경우 프로필 생성 (카테고리 정보가 있고, 아직 프로필이 없는 경우)
        if (role === 'teacher' && categoryId) {
            try {
                // 프로필이 이미 있는지 확인
                const profileCheckResponse = await fetch(`/api/teachers/profile?userId=${user.id}`);
                const profileCheck = await profileCheckResponse.json();

                // 프로필이 없으면 생성
                if (!profileCheck.success || !profileCheck.profile) {
                    await fetch('/api/teachers/profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user.id,
                            lessonCategoryId: parseInt(categoryId)
                        })
                    });
                    console.log('Teacher profile created with category:', categoryId);
                }
            } catch (profileError) {
                console.error('Failed to create teacher profile:', profileError);
                // 프로필 생성 실패해도 로그인은 계속 진행
            }
        }

        // Hide loading
        if (typeof showLoading === 'function') {
            showLoading(false);
        }

        // Show success message
        if (typeof showToast === 'function') {
            showToast(`환영합니다, ${data.user.name}님!`, 'success');
        }

        // Redirect based on role
        setTimeout(() => {
            if (role === 'teacher') {
                window.location.href = '/teacher';
            } else {
                window.location.href = '/student';
            }
        }, 500);
    } catch (error) {
        console.error('Login error:', error);
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
        if (typeof handleApiError === 'function') {
            handleApiError(error);
        } else {
            alert('로그인 중 오류가 발생했습니다: ' + error.message);
        }
    }
}

/**
 * 로그아웃 처리 함수
 */
function logout() {
    localStorage.removeItem(USER_KEY);
    window.location.href = '/';
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
        window.location.href = '/';
        return;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        alert('이 페이지에 접근할 권한이 없습니다.');
        window.location.href = '/';
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
