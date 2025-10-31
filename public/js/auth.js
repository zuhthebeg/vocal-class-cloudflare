const USER_KEY = 'vocalUser';

/**
 * 로그인 처리 함수
 * @param {string} name - 사용자 이름
 * @param {string} role - 사용자 역할 ('teacher' 또는 'student')
 */
async function login(name, role) {
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

        // localStorage 전용 모드 체크 (API 서버가 없을 때)
        // 포트 8788은 wrangler pages dev이므로 API 사용
        // 기타 개발 포트(3000, 8000 등)는 API 없이 localStorage만 사용
        const isWranglerDev = window.location.port === '8788';
        const isDevelopmentPort = ['3000', '8000', '8080', '5000', '5500'].includes(window.location.port);
        const isLocalhost = window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.startsWith('192.168.') ||
                           window.location.hostname.startsWith('10.') ||
                           !window.location.hostname;

        // wrangler dev나 프로덕션 환경이 아니면 localStorage만 사용
        const USE_LOCAL_STORAGE_ONLY = !isWranglerDev && (isLocalhost || isDevelopmentPort);

        let user;

        if (USE_LOCAL_STORAGE_ONLY) {
            // localStorage 전용 모드: API 호출 없이 로컬에서만 작동
            console.warn('🔧 개발 모드: API 없이 localStorage만 사용합니다.');

            // 간단한 ID 생성 (타임스탬프 기반)
            const userId = Date.now();
            user = { id: userId, name, role };

            // localStorage에 저장
            localStorage.setItem(USER_KEY, JSON.stringify(user));

            if (typeof showLoading === 'function') {
                showLoading(false);
            }

            if (typeof showToast === 'function') {
                showToast(`환영합니다, ${name}님! (개발 모드)`, 'success');
            }

            // 페이지 이동
            setTimeout(() => {
                if (role === 'teacher') {
                    window.location.href = '/teacher';
                } else {
                    window.location.href = '/student';
                }
            }, 500);
            return;
        }

        // API 모드: 실제 서버 호출
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
