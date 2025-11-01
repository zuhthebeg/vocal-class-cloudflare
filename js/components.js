// js/components.js - 재사용 가능한 UI 컴포넌트 함수들

/**
 * Toast 알림 표시
 * @param {string} message - 표시할 메시지
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - 표시 시간 (ms), 기본 3000ms
 */
function showToast(message, type = 'info', duration = 3000) {
    // Toast 컨테이너가 없으면 생성
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Toast 아이콘 선택
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    // Toast 요소 생성
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="닫기">&times;</button>
    `;

    // 닫기 버튼 이벤트
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });

    // Toast 추가
    container.appendChild(toast);

    // 자동 제거
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

/**
 * Toast 제거 애니메이션
 */
function removeToast(toast) {
    toast.classList.add('hiding');
    setTimeout(() => {
        toast.remove();

        // 컨테이너에 Toast가 없으면 컨테이너도 제거
        const container = document.querySelector('.toast-container');
        if (container && container.children.length === 0) {
            container.remove();
        }
    }, 300);
}

/**
 * 모달 표시
 * @param {object} options - 모달 옵션
 * @param {string} options.title - 모달 제목
 * @param {string} options.content - 모달 내용 (HTML 가능)
 * @param {Array} options.buttons - 버튼 배열 [{text, onClick, className}]
 * @param {Function} options.onClose - 닫기 콜백
 */
function showModal({
    title = '',
    content = '',
    buttons = [],
    onClose = null
}) {
    // 기존 모달 제거
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    // 모달 오버레이 생성
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // 모달 내용 생성
    const modal = document.createElement('div');
    modal.className = 'modal';

    // 헤더
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" aria-label="닫기">&times;</button>
    `;

    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.innerHTML = content;

    // Footer (버튼이 있는 경우)
    let footer = null;
    if (buttons.length > 0) {
        footer = document.createElement('div');
        footer.className = 'modal-footer';

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = btn.className || 'btn btn-primary';
            button.textContent = btn.text || '확인';
            button.addEventListener('click', () => {
                if (btn.onClick) {
                    btn.onClick();
                }
                closeModal(overlay, onClose);
            });
            footer.appendChild(button);
        });
    }

    // 조립
    modal.appendChild(header);
    modal.appendChild(body);
    if (footer) {
        modal.appendChild(footer);
    }
    overlay.appendChild(modal);

    // 닫기 이벤트
    const closeBtn = header.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => {
        closeModal(overlay, onClose);
    });

    // 오버레이 클릭 시 닫기
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal(overlay, onClose);
        }
    });

    // ESC 키로 닫기
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal(overlay, onClose);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // DOM에 추가
    document.body.appendChild(overlay);

    return overlay;
}

/**
 * 모달 닫기
 */
function closeModal(overlay, onClose) {
    overlay.remove();
    if (onClose) {
        onClose();
    }
}

/**
 * 확인 모달 (간편 함수)
 * @param {string} message - 확인 메시지
 * @param {Function} onConfirm - 확인 시 콜백
 * @param {string} title - 제목 (기본: '확인')
 */
function showConfirm(message, onConfirm, title = '확인') {
    return showModal({
        title: title,
        content: `<p style="font-size: 1rem; color: #4b5563;">${message}</p>`,
        buttons: [
            {
                text: '취소',
                className: 'btn btn-secondary',
                onClick: () => {}
            },
            {
                text: '확인',
                className: 'btn btn-primary',
                onClick: onConfirm
            }
        ]
    });
}

/**
 * 알림 모달 (간편 함수)
 * @param {string} message - 알림 메시지
 * @param {string} title - 제목 (기본: '알림')
 */
function showAlert(message, title = '알림') {
    return showModal({
        title: title,
        content: `<p style="font-size: 1rem; color: #4b5563;">${message}</p>`,
        buttons: [
            {
                text: '확인',
                className: 'btn btn-primary'
            }
        ]
    });
}

/**
 * 로딩 오버레이 표시/숨기기
 * @param {boolean|string} show - true면 표시, false면 숨김, 문자열이면 해당 메시지로 표시
 * @param {string} message - 로딩 메시지 (show가 boolean일 때 사용)
 */
function showLoading(show = true, message = '처리 중...') {
    // show가 false면 숨기기
    if (show === false) {
        hideLoading();
        return;
    }

    // show가 문자열이면 메시지로 사용
    if (typeof show === 'string') {
        message = show;
    }

    // 기존 로딩 제거
    const existing = document.querySelector('.loading-overlay');
    if (existing) {
        existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'global-loading';
    overlay.setAttribute('role', 'alert');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.setAttribute('aria-busy', 'true');
    overlay.innerHTML = `
        <div class="spinner" aria-hidden="true"></div>
        <div class="loading-text">${message}</div>
    `;

    document.body.appendChild(overlay);
    return overlay;
}

/**
 * 로딩 오버레이 숨기기
 */
function hideLoading() {
    const overlay = document.getElementById('global-loading');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Empty State 생성
 * @param {object} options - 옵션
 * @param {string} options.icon - 아이콘 (emoji 또는 text)
 * @param {string} options.title - 제목
 * @param {string} options.message - 메시지
 */
function createEmptyState({ icon = '📭', title = '데이터가 없습니다', message = '' }) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-title">${title}</div>
        ${message ? `<div class="empty-state-message">${message}</div>` : ''}
    `;
    return div;
}

/**
 * API 에러 처리 유틸리티
 * @param {Error} error - 에러 객체
 * @param {string} context - 에러 발생 컨텍스트 (선택사항)
 */
function handleApiError(error, context = '') {
    console.error('API Error:', error, context ? `Context: ${context}` : '');

    let message = '오류가 발생했습니다.';

    // 네트워크 에러
    if (!navigator.onLine) {
        message = '인터넷 연결을 확인해주세요. 오프라인 상태입니다.';
    }
    else if (error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Network request failed')) {
        message = '네트워크 연결을 확인해주세요. 인터넷 연결이 불안정합니다.';
    }
    // 타임아웃 에러
    else if (error.message.includes('timeout')) {
        message = '요청 시간이 초과되었습니다. 다시 시도해주세요.';
    }
    // 서버 에러 (5xx)
    else if (error.message.includes('500') || error.message.includes('Internal server error')) {
        message = '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    // 인증 에러 (401, 403)
    else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        message = '인증이 필요합니다. 다시 로그인해주세요.';
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
    else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        message = '접근 권한이 없습니다.';
    }
    // 요청 에러 (400)
    else if (error.message.includes('400') || error.message.includes('Bad request')) {
        message = '잘못된 요청입니다. 입력 내용을 확인해주세요.';
    }
    // 404 에러
    else if (error.message.includes('404') || error.message.includes('Not found')) {
        message = '요청한 리소스를 찾을 수 없습니다.';
    }
    // 일반 에러 메시지
    else if (error.message) {
        message = error.message;
    }

    // 컨텍스트가 있으면 추가
    if (context) {
        message = `${context}: ${message}`;
    }

    showToast(message, 'error');
    return message;
}

/**
 * 날짜 포맷팅 유틸리티
 * @param {Date|string} date - 날짜
 * @param {string} format - 'date', 'time', 'datetime'
 */
function formatDate(date, format = 'datetime') {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) {
        return '잘못된 날짜';
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    switch (format) {
        case 'date':
            return `${year}-${month}-${day}`;
        case 'time':
            return `${hours}:${minutes}`;
        case 'datetime':
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        default:
            return d.toLocaleString('ko-KR');
    }
}

/**
 * 디바운스 함수
 * @param {Function} func - 실행할 함수
 * @param {number} delay - 지연 시간 (ms)
 */
function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * 온라인/오프라인 상태 감지
 */
function initNetworkStatusDetection() {
    window.addEventListener('online', () => {
        showToast('인터넷 연결이 복구되었습니다.', 'success');
    });

    window.addEventListener('offline', () => {
        showToast('인터넷 연결이 끊어졌습니다. 일부 기능이 제한될 수 있습니다.', 'warning');
    });

    // 초기 상태 확인
    if (!navigator.onLine) {
        showToast('현재 오프라인 상태입니다.', 'warning');
    }
}

// 페이지 로드 시 네트워크 상태 감지 초기화
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNetworkStatusDetection);
    } else {
        initNetworkStatusDetection();
    }
}

/**
 * localStorage 안전하게 사용
 * @param {string} key - 키
 * @param {any} value - 값 (저장 시)
 */
function safeLocalStorage(key, value = undefined) {
    try {
        if (value === undefined) {
            // 읽기
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } else {
            // 쓰기
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        }
    } catch (error) {
        console.error('localStorage error:', error);

        // Quota 초과 에러
        if (error.name === 'QuotaExceededError') {
            showToast('저장 공간이 부족합니다. 일부 데이터를 삭제해주세요.', 'warning');
        }

        return value === undefined ? null : false;
    }
}

// 전역으로 내보내기 (필요 시)
if (typeof window !== 'undefined') {
    window.UIComponents = {
        showToast,
        showModal,
        showConfirm,
        showAlert,
        showLoading,
        hideLoading,
        createEmptyState,
        handleApiError,
        formatDate,
        debounce,
        safeLocalStorage
    };
}
