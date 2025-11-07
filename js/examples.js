// js/examples.js - One Piece 스타일 영상 관리 시스템

document.addEventListener('DOMContentLoaded', () => {
    const videoTitleInput = document.getElementById('video-title');
    const videoCategoryInput = document.getElementById('video-category');
    const videoUrlInput = document.getElementById('video-url');
    const addVideoBtn = document.getElementById('add-video-btn');
    const videoSearchInput = document.getElementById('video-search');
    const videoListContainer = document.getElementById('video-list');
    const categoryFiltersContainer = document.getElementById('category-filters');

    const videoModal = document.getElementById('video-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalVideoTitle = document.getElementById('modal-video-title');
    const modalVideoCategory = document.getElementById('modal-video-category');
    const modalVideoContainer = document.getElementById('modal-video-container');

    const EXAMPLES_KEY = 'examples';

    let examples = JSON.parse(localStorage.getItem(EXAMPLES_KEY)) || [];
    let currentFilter = '전체';

    // ============================================
    // 데이터 마이그레이션: 기존 영상을 새 스키마로 변환
    // ============================================
    function migrateVideos(videos) {
        return videos.map(video => {
            if (!video.id) {
                return {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    title: video.title || '',
                    url: video.url,
                    category: video.category || '일반',
                    dateAdded: video.dateAdded || new Date().toISOString()
                };
            }
            // 이미 id가 있으면 category가 없을 경우에만 추가
            if (!video.category) {
                video.category = '일반';
            }
            return video;
        });
    }

    // 초기 마이그레이션 실행
    examples = migrateVideos(examples);
    localStorage.setItem(EXAMPLES_KEY, JSON.stringify(examples));

    // ============================================
    // YouTube URL에서 영상 ID 추출
    // ============================================
    function getYouTubeVideoId(url) {
        // youtu.be 형식 처리
        let match = url.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        // youtube.com/watch?v= 형식 처리
        match = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        // youtube.com/embed/ 형식 처리
        match = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        // youtube.com/v/ 형식 처리
        match = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        return null;
    }

    // ============================================
    // 초성 검색을 위한 한글 초성 추출
    // ============================================
    function getKoreanConsonants(text) {
        const f = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const c = text.charCodeAt(i);
            if (c >= 0xAC00 && c <= 0xD7A3) { // 한글 유니코드 범위
                const charCode = c - 0xAC00;
                const jong = charCode % 28;
                const jung = ((charCode - jong) / 28) % 21;
                const cho = (((charCode - jong) / 28) - jung) / 21;
                result += f[cho];
            } else {
                result += text[i];
            }
        }
        return result;
    }

    // ============================================
    // 카테고리 목록 가져오기 (중복 제거)
    // ============================================
    function getUniqueCategories() {
        const categories = [...new Set(examples.map(v => v.category || '일반'))];
        return categories.sort();
    }

    // ============================================
    // 카테고리 필터 렌더링
    // ============================================
    function renderCategoryFilters() {
        const categories = getUniqueCategories();
        categoryFiltersContainer.innerHTML = '';

        // "전체" 버튼
        const allChip = document.createElement('button');
        allChip.className = `dark-category-chip ${currentFilter === '전체' ? 'active' : ''}`;
        allChip.textContent = '전체';
        allChip.dataset.category = '전체';
        allChip.addEventListener('click', () => filterByCategory('전체'));
        categoryFiltersContainer.appendChild(allChip);

        // 각 카테고리 버튼
        categories.forEach(category => {
            const chip = document.createElement('button');
            chip.className = `dark-category-chip ${currentFilter === category ? 'active' : ''}`;
            chip.textContent = category;
            chip.dataset.category = category;
            chip.addEventListener('click', () => filterByCategory(category));
            categoryFiltersContainer.appendChild(chip);
        });
    }

    // ============================================
    // 카테고리별 필터링
    // ============================================
    function filterByCategory(category) {
        currentFilter = category;
        renderCategoryFilters();
        renderVideoList();
    }

    // ============================================
    // 영상 목록 렌더링 (썸네일 기반 리스트)
    // ============================================
    function renderVideoList(videosToRender = null) {
        // 필터 적용
        let videos = videosToRender;
        if (!videos) {
            if (currentFilter === '전체') {
                videos = examples;
            } else {
                videos = examples.filter(v => v.category === currentFilter);
            }
        }

        videoListContainer.innerHTML = '';

        if (videos.length === 0) {
            videoListContainer.innerHTML = `
                <div class="text-center text-gray-500 py-12">
                    <p class="text-lg">등록된 영상이 없습니다.</p>
                    <p class="text-sm mt-2">위 폼에서 새 영상을 추가해보세요! 💎</p>
                </div>
            `;
            return;
        }

        videos.forEach((video) => {
            const videoId = getYouTubeVideoId(video.url);
            if (!videoId) return; // 유효하지 않은 YouTube URL은 스킵

            // 썸네일 URL (YouTube API 활용)
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

            // 비디오 아이템 생성
            const videoItem = document.createElement('div');
            videoItem.className = 'dark-video-item dark-fade-in';

            const titleText = video.title || 'YouTube 영상';

            videoItem.innerHTML = `
                <img src="${thumbnailUrl}"
                     alt="${titleText}"
                     class="dark-video-thumbnail"
                     data-video-id="${videoId}"
                     data-video-title="${titleText}"
                     data-video-category="${video.category}">
                <div class="dark-video-info">
                    <h3 class="dark-video-title">${titleText}</h3>
                    <span class="dark-category-badge">${video.category}</span>
                </div>
                <div class="dark-video-actions">
                    <button class="dark-video-btn dark-video-btn-play"
                            data-video-id="${videoId}"
                            data-video-title="${titleText}"
                            data-video-category="${video.category}"
                            aria-label="영상 재생">
                        ▶️
                    </button>
                    <button class="dark-video-btn dark-video-btn-edit"
                            data-video-id="${video.id}"
                            aria-label="영상 편집">
                        ✏️
                    </button>
                    <button class="dark-video-btn dark-video-btn-delete"
                            data-video-id="${video.id}"
                            aria-label="영상 삭제">
                        🗑️
                    </button>
                </div>
            `;

            videoListContainer.appendChild(videoItem);
        });

        // 이벤트 리스너 추가
        attachVideoEventListeners();
    }

    // ============================================
    // 비디오 이벤트 리스너 연결
    // ============================================
    function attachVideoEventListeners() {
        // 썸네일 클릭 -> 모달 열기
        document.querySelectorAll('.dark-video-thumbnail').forEach(thumb => {
            thumb.addEventListener('click', (e) => {
                const videoId = e.target.dataset.videoId;
                const title = e.target.dataset.videoTitle;
                const category = e.target.dataset.videoCategory;
                openVideoModal(videoId, title, category);
            });
        });

        // 재생 버튼 클릭 -> 모달 열기
        document.querySelectorAll('.dark-video-btn-play').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const videoId = e.currentTarget.dataset.videoId;
                const title = e.currentTarget.dataset.videoTitle;
                const category = e.currentTarget.dataset.videoCategory;
                openVideoModal(videoId, title, category);
            });
        });

        // 편집 버튼 클릭
        document.querySelectorAll('.dark-video-btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const videoId = e.currentTarget.dataset.videoId;
                editVideo(videoId);
            });
        });

        // 삭제 버튼 클릭
        document.querySelectorAll('.dark-video-btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const videoId = e.currentTarget.dataset.videoId;
                deleteVideo(videoId);
            });
        });
    }

    // ============================================
    // 비디오 모달 열기
    // ============================================
    function openVideoModal(videoId, title, category) {
        modalVideoTitle.textContent = title;
        modalVideoCategory.textContent = category;

        // iframe 삽입
        modalVideoContainer.innerHTML = `
            <iframe
                src="https://www.youtube.com/embed/${videoId}?autoplay=1"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
            ></iframe>
        `;

        videoModal.classList.add('active');

        // ESC 키로 닫기
        document.addEventListener('keydown', handleModalEscape);
    }

    // ============================================
    // 비디오 모달 닫기
    // ============================================
    function closeVideoModal() {
        videoModal.classList.remove('active');
        modalVideoContainer.innerHTML = ''; // iframe 제거 (영상 정지)
        document.removeEventListener('keydown', handleModalEscape);
    }

    function handleModalEscape(e) {
        if (e.key === 'Escape') {
            closeVideoModal();
        }
    }

    // 모달 닫기 버튼
    modalCloseBtn.addEventListener('click', closeVideoModal);

    // 모달 배경 클릭 시 닫기
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) {
            closeVideoModal();
        }
    });

    // ============================================
    // 영상 추가
    // ============================================
    addVideoBtn.addEventListener('click', () => {
        const title = videoTitleInput.value.trim();
        const category = videoCategoryInput.value.trim() || '일반';
        const url = videoUrlInput.value.trim();

        if (!url) {
            alert('YouTube URL을 입력해주세요.');
            return;
        }

        if (!getYouTubeVideoId(url)) {
            alert('유효한 YouTube URL을 입력해주세요.\n예: https://youtu.be/rnSaeWKCrkg 또는 https://www.youtube.com/watch?v=rnSaeWKCrkg');
            return;
        }

        const newVideo = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: title,
            url: url,
            category: category,
            dateAdded: new Date().toISOString()
        };

        examples.push(newVideo);
        localStorage.setItem(EXAMPLES_KEY, JSON.stringify(examples));

        videoTitleInput.value = '';
        videoCategoryInput.value = '';
        videoUrlInput.value = '';

        renderCategoryFilters();
        renderVideoList();

        if (typeof showToast === 'function') {
            showToast('영상이 추가되었습니다! 🎉', 'success');
        }
    });

    // ============================================
    // 영상 편집
    // ============================================
    function editVideo(videoId) {
        const video = examples.find(v => v.id === videoId);
        if (!video) return;

        const newTitle = prompt('새 제목을 입력하세요 (비워두면 제목 없음):', video.title || '');
        if (newTitle === null) return; // 취소

        const newCategory = prompt('새 카테고리를 입력하세요:', video.category || '일반');
        if (newCategory === null) return; // 취소

        video.title = newTitle.trim();
        video.category = newCategory.trim() || '일반';

        localStorage.setItem(EXAMPLES_KEY, JSON.stringify(examples));

        renderCategoryFilters();
        renderVideoList();

        if (typeof showToast === 'function') {
            showToast('영상이 수정되었습니다! ✏️', 'success');
        }
    }

    // ============================================
    // 영상 삭제
    // ============================================
    function deleteVideo(videoId) {
        const video = examples.find(v => v.id === videoId);
        if (!video) return;

        const confirmMsg = video.title
            ? `"${video.title}" 영상을 삭제하시겠습니까?`
            : '이 영상을 삭제하시겠습니까?';

        if (!confirm(confirmMsg)) return;

        examples = examples.filter(v => v.id !== videoId);
        localStorage.setItem(EXAMPLES_KEY, JSON.stringify(examples));

        renderCategoryFilters();
        renderVideoList();

        if (typeof showToast === 'function') {
            showToast('영상이 삭제되었습니다. 🗑️', 'success');
        }
    }

    // ============================================
    // 영상 검색
    // ============================================
    videoSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim().toLowerCase();
        if (searchTerm === '') {
            renderVideoList();
            return;
        }

        const filteredVideos = examples.filter(video => {
            const titleLower = (video.title || '').toLowerCase();
            const categoryLower = (video.category || '').toLowerCase();
            const urlLower = video.url.toLowerCase();
            const titleConsonants = getKoreanConsonants(video.title || '').toLowerCase();
            const categoryConsonants = getKoreanConsonants(video.category || '').toLowerCase();

            return titleLower.includes(searchTerm) ||
                   categoryLower.includes(searchTerm) ||
                   urlLower.includes(searchTerm) ||
                   titleConsonants.includes(searchTerm) ||
                   categoryConsonants.includes(searchTerm);
        });
        renderVideoList(filteredVideos);
    });

    // ============================================
    // 초기 렌더링
    // ============================================
    renderCategoryFilters();
    renderVideoList();
});
