// js/examples.js

document.addEventListener('DOMContentLoaded', () => {
    const videoTitleInput = document.getElementById('video-title');
    const videoUrlInput = document.getElementById('video-url');
    const addVideoBtn = document.getElementById('add-video-btn');
    const videoSearchInput = document.getElementById('video-search');
    const videoListContainer = document.getElementById('video-list');

    const EXAMPLES_KEY = 'examples';

    let examples = JSON.parse(localStorage.getItem(EXAMPLES_KEY)) || [];

    /**
     * YouTube URL에서 영상 ID 추출
     * @param {string} url - YouTube 영상 URL
     * @returns {string|null} 영상 ID 또는 null
     */
    function getYouTubeVideoId(url) {
        const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([^\s&]+)$/;
        const match = url.match(regExp);
        return (match && match[1].length === 11) ? match[1] : null;
    }

    /**
     * 초성 검색을 위한 한글 초성 추출
     * @param {string} text - 한글 텍스트
     * @returns {string} 초성 문자열
     */
    function getKoreanConsonants(text) {
        const f = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const c = text.charCodeAt(i);
            if (c >= 0xAC00 && c <= 0xD7A3) { // 한글 유니코드 범위
                const charCode = c - 0xAC00;
                const jong = charCode % 28; // 종성
                const jung = ((charCode - jong) / 28) % 21; // 중성
                const cho = (((charCode - jong) / 28) - jung) / 21; // 초성
                result += f[cho];
            } else {
                result += text[i];
            }
        }
        return result;
    }

    /**
     * 영상 목록 렌더링
     * @param {Array} videosToRender - 렌더링할 영상 배열 (검색 결과 등)
     */
    function renderVideoList(videosToRender = examples) {
        videoListContainer.innerHTML = '';
        if (videosToRender.length === 0) {
            videoListContainer.innerHTML = '<p class="text-gray-500 lg:col-span-full">등록된 영상이 없습니다.</p>';
            return;
        }

        videosToRender.forEach((video, index) => {
            const videoId = getYouTubeVideoId(video.url);
            if (!videoId) return; // 유효하지 않은 YouTube URL은 스킵

            const videoCard = document.createElement('div');
            videoCard.className = 'bg-gray-50 p-4 rounded-lg shadow-sm';
            videoCard.innerHTML = `
                <h3 class="font-bold mb-2">${video.title}</h3>
                <div class="relative" style="padding-bottom: 56.25%; height: 0; overflow: hidden;">
                    <iframe
                        class="absolute top-0 left-0 w-full h-full"
                        src="https://www.youtube.com/embed/${videoId}"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                    ></iframe>
                </div>
                <button class="delete-video-btn mt-3 bg-red-500 text-white px-3 py-1 rounded-md text-sm" data-index="${index}">삭제</button>
            `;
            videoListContainer.appendChild(videoCard);
        });

        // 삭제 버튼 이벤트 리스너
        document.querySelectorAll('.delete-video-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const indexToDelete = parseInt(e.target.dataset.index);
                examples.splice(indexToDelete, 1);
                localStorage.setItem(EXAMPLES_KEY, JSON.stringify(examples));
                renderVideoList();
            });
        });
    }

    /**
     * 영상 추가
     */
    addVideoBtn.addEventListener('click', () => {
        const title = videoTitleInput.value.trim();
        const url = videoUrlInput.value.trim();

        if (!title || !url) {
            alert('제목과 YouTube URL을 모두 입력해주세요.');
            return;
        }

        if (!getYouTubeVideoId(url)) {
            alert('유효한 YouTube URL을 입력해주세요.');
            return;
        }

        examples.push({ title, url });
        localStorage.setItem(EXAMPLES_KEY, JSON.stringify(examples));
        videoTitleInput.value = '';
        videoUrlInput.value = '';
        renderVideoList();
    });

    /**
     * 영상 검색
     */
    videoSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim().toLowerCase();
        if (searchTerm === '') {
            renderVideoList();
            return;
        }

        const filteredVideos = examples.filter(video => {
            const titleLower = video.title.toLowerCase();
            const urlLower = video.url.toLowerCase();
            const titleConsonants = getKoreanConsonants(video.title).toLowerCase();

            return titleLower.includes(searchTerm) ||
                   urlLower.includes(searchTerm) ||
                   titleConsonants.includes(searchTerm);
        });
        renderVideoList(filteredVideos);
    });

    // 초기 렌더링
    renderVideoList();
});
