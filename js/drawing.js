// js/drawing.js

const DRAWINGS_KEY = 'savedDrawings';
const CLIPARTS_KEY = 'savedCliparts';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('drawing-board');
    const ctx = canvas.getContext('2d');
    const colorPicker = document.getElementById('color-picker');
    const brushSize = document.getElementById('brush-size');
    const clearCanvasBtn = document.getElementById('clear-canvas-btn');
    const saveDrawingBtn = document.getElementById('save-drawing-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomLevelDisplay = document.getElementById('zoom-level');
    const drawingContainer = document.getElementById('drawing-container');
    const savedDrawingsContainer = document.getElementById('saved-drawings');
    const clipartContainer = document.getElementById('clipart-container');

    let currentZoom = 1.0;  // 현재 확대/축소 레벨
    const ZOOM_STEP = 0.1;  // 확대/축소 단계
    const MAX_ZOOM = 3.0;   // 최대 확대 배율
    const MIN_ZOOM = 0.5;   // 최소 축소 배율

    let isMaximized = false;

    let drawing = false;
    let currentBrushSize = brushSize.value;
    let currentColor = colorPicker.value;

    let canvasMemory = null; // 캔버스 상태 저장용 변수

    // 캔버스 상태 저장
    function saveCanvasState() {
        canvasMemory = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    // 캔버스 상태 복원
    function restoreCanvasState() {
        if (canvasMemory) {
            ctx.putImageData(canvasMemory, 0, 0);
        }
    }

    // 캔버스 크기 설정 (16:9 비율 유지)
    function resizeCanvas() {
        const canvasWrapper = canvas.parentElement;
        const container = canvasWrapper.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // 캔버스 기본 크기 (16:9 비율)
        const BASE_WIDTH = 1280;
        const BASE_HEIGHT = 720;
        
        // 컨테이너 내부 사용 가능한 크기 계산 (패딩 32px 고려)
        const availableWidth = rect.width - 32;
        const availableHeight = rect.height - 32;
        
        // 기본 스케일 계산 (컨테이너에 맞추기)
        const baseScale = Math.min(
            availableWidth / BASE_WIDTH,
            availableHeight / BASE_HEIGHT
        );
        
        // 현재 캔버스 상태 저장
        let imageData = null;
        try {
            if (canvas.width > 0 && canvas.height > 0) {
                imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            }
        } catch (e) {
            console.warn('캔버스 상태 저장 실패:', e);
        }
        
        // 캔버스 실제 크기 설정
        const width = Math.floor(BASE_WIDTH);
        const height = Math.floor(BASE_HEIGHT);
        canvas.width = width;
        canvas.height = height;
        
        // 캔버스 표시 크기 설정 (확대/축소 고려)
        const displayWidth = Math.floor(width * baseScale * currentZoom);
        const displayHeight = Math.floor(height * baseScale * currentZoom);
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        
        // 컨텍스트 설정
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(1, 1); // 기본 스케일로 설정
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentBrushSize * currentZoom;
        
        // 저장된 상태 복원
        if (imageData) {
            ctx.putImageData(imageData, 0, 0);
        }
        
        // 줌 레벨 표시 업데이트
        updateZoomDisplay();
        
        // zoom level 표시 업데이트
        updateZoomLevel();
    }
    
    // 확대/축소 레벨 업데이트
    function updateZoomLevel() {
        zoomLevelDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
    }
    
    // 확대/축소 관련 함수들
    function updateZoomDisplay() {
        const percent = Math.round(currentZoom * 100);
        zoomLevelDisplay.textContent = `${percent}%`;
    }

    function updateZoom(newZoom) {
        if (newZoom >= MIN_ZOOM && newZoom <= MAX_ZOOM) {
            const oldZoom = currentZoom;
            currentZoom = newZoom;
            
            // 캔버스 크기와 브러시 크기 조정
            resizeCanvas();
            
            // 스크롤 위치 조정 (줌 중심점 유지)
            const container = canvas.parentElement.parentElement;
            const rect = canvas.getBoundingClientRect();
            const centerX = container.scrollLeft + container.clientWidth / 2;
            const centerY = container.scrollTop + container.clientHeight / 2;
            
            const newScrollX = (centerX - container.clientWidth / 2) * (newZoom / oldZoom);
            const newScrollY = (centerY - container.clientHeight / 2) * (newZoom / oldZoom);
            
            container.scrollTo(newScrollX, newScrollY);
        }
    }

    zoomInBtn.addEventListener('click', () => {
        updateZoom(currentZoom * 1.2); // 20% 확대
    });
    
    zoomOutBtn.addEventListener('click', () => {
        updateZoom(currentZoom / 1.2); // 20% 축소
    });
    
    // 마우스 휠로 확대/축소
    canvas.parentElement.parentElement.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1.1 : 0.9;
            updateZoom(currentZoom * delta);
        }
    }, { passive: false });
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 그리기 시작
    function startDrawing(e) {
        drawing = true;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // 캔버스의 실제 크기와 표시 크기의 비율 계산
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // 클라이언트 좌표를 캔버스 좌표로 변환
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    // 그리기
    function draw(e) {
        if (!drawing) return;
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // 캔버스의 실제 크기와 표시 크기의 비율 계산
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // 클라이언트 좌표를 캔버스 좌표로 변환
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    // 그리기 종료
    function stopDrawing() {
        drawing = false;
        ctx.beginPath(); // 새로운 경로 시작
    }

    // 이벤트 리스너
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchcancel', stopDrawing);

    // 색상 변경
    colorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
        ctx.strokeStyle = currentColor;
    });

    // 붓 굵기 변경
    brushSize.addEventListener('input', (e) => {
        currentBrushSize = e.target.value;
        ctx.lineWidth = currentBrushSize;
    });

    // 캔버스 지우기
    clearCanvasBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // 클립아트 URL 입력 및 추가 기능 (compact)
    const clipartUrlInput = document.getElementById('clipart-url-compact') || document.getElementById('clipart-url');
    const addClipartBtn = document.getElementById('add-clipart-btn-compact') || document.getElementById('add-clipart-btn');

    // 클립아트 저장 함수
    function saveClipart(url) {
        const cliparts = JSON.parse(localStorage.getItem(CLIPARTS_KEY) || '[]');
        if (!cliparts.includes(url)) {
            cliparts.push(url);
            localStorage.setItem(CLIPARTS_KEY, JSON.stringify(cliparts));
        }
    }

    // 저장된 클립아트 로드 함수
    function loadSavedCliparts() {
        const cliparts = JSON.parse(localStorage.getItem(CLIPARTS_KEY) || '[]');
        clipartContainer.innerHTML = ''; // 기존 클립아트 초기화
        
        cliparts.forEach(url => {
            const item = document.createElement('div');
            item.className = 'relative flex-shrink-0';

            const img = document.createElement('img');
            img.src = url;
            img.className = 'clipart draggable w-20 h-20 object-contain rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-move bg-gray-50 p-1';
            img.draggable = true;
            img.alt = '저장된 클립아트';

            const del = document.createElement('button');
            del.className = 'absolute -top-1 -right-1 bg-white text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow';
            del.title = '삭제';
            del.innerHTML = '&times;';
            del.addEventListener('click', (ev) => {
                ev.stopPropagation();
                deleteClipart(url, item);
            });

            item.appendChild(img);
            item.appendChild(del);
            clipartContainer.appendChild(item);
        });
    }

    // 클립아트 삭제
    function deleteClipart(url, el) {
        const cliparts = JSON.parse(localStorage.getItem(CLIPARTS_KEY) || '[]');
        const updated = cliparts.filter(u => u !== url);
        localStorage.setItem(CLIPARTS_KEY, JSON.stringify(updated));
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    addClipartBtn && addClipartBtn.addEventListener('click', () => {
        const url = clipartUrlInput.value.trim();
        if (url) {
            // 작은 썸네일 아이템 생성 (same structure as loadSavedCliparts)
            const item = document.createElement('div');
            item.className = 'relative flex-shrink-0';

            const img = document.createElement('img');
            img.src = url;
            img.className = 'clipart draggable w-20 h-20 object-contain rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-move bg-gray-50 p-1';
            img.draggable = true;

            const del = document.createElement('button');
            del.className = 'absolute -top-1 -right-1 bg-white text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow';
            del.title = '삭제';
            del.innerHTML = '&times;';
            del.addEventListener('click', (ev) => {
                ev.stopPropagation();
                deleteClipart(url, item);
            });

            img.onerror = () => { alert('이미지를 불러올 수 없습니다. URL을 확인해주세요.'); };
            img.onload = () => {
                saveClipart(url);
                item.appendChild(img);
                item.appendChild(del);
                clipartContainer.appendChild(item);
                clipartUrlInput.value = '';
            };
        }
    });

    // 클립아트 드래그 앤 드롭
    let draggedClipart = null;

    clipartContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('draggable')) {
            draggedClipart = e.target;
            e.dataTransfer.setData('text/plain', e.target.src);
            e.dataTransfer.effectAllowed = 'copy';
        }
    });

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    function loadImageWithCORS(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => {
                // crossOrigin이 실패하면 로컬 프록시나 기본 이미지로 대체
                const fallbackImg = new Image();
                fallbackImg.onload = () => resolve(fallbackImg);
                fallbackImg.onerror = reject;
                fallbackImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+7J2066+47KeAPC90ZXh0Pjwvc3ZnPg==';
            };
            img.src = src;
        });
    }

    canvas.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (draggedClipart) {
            try {
                const imgSrc = e.dataTransfer.getData('text/plain');
                const img = await loadImageWithCORS(imgSrc);
                
                // 현재 캔버스의 드로잉 상태 저장
                saveCanvasState();
                
                // 캔버스 크기에 맞게 이미지 그리기
                try {
                    ctx.clearRect(0, 0, canvas.width, canvas.height); // 캔버스 초기화
                    
                    // 이미지를 캔버스 크기에 맞게 비율 유지하며 그리기
                    const scale = Math.min(
                        canvas.width / img.width,
                        canvas.height / img.height
                    );
                    
                    const scaledWidth = img.width * scale;
                    const scaledHeight = img.height * scale;
                    
                    // 이미지를 캔버스 중앙에 배치
                    const x = (canvas.width - scaledWidth) / 2;
                    const y = (canvas.height - scaledHeight) / 2;
                    
                    // 배경색을 흰색으로 설정
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // 이미지를 배경으로 그리기
                    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                    
                } catch (err) {
                    console.warn('이미지 그리기 실패:', err);
                    restoreCanvasState();
                }
            } catch (err) {
                console.error('이미지 로드 실패:', err);
            }
            draggedClipart = null;
        }
    });

    // 그림 저장
    saveDrawingBtn.addEventListener('click', () => {
        const drawingName = prompt('저장할 그림의 이름을 입력하세요:');
        if (!drawingName) return;

        const drawing = {
            id: Date.now().toString(),
            name: drawingName,
            dataUrl: canvas.toDataURL(),
            date: new Date().toISOString()
        };

        const drawings = JSON.parse(localStorage.getItem(DRAWINGS_KEY) || '[]');
        drawings.push(drawing);
        localStorage.setItem(DRAWINGS_KEY, JSON.stringify(drawings));

        loadSavedDrawings();
    });

    // 저장된 그림 불러오기
    function loadSavedDrawings() {
        const drawings = JSON.parse(localStorage.getItem(DRAWINGS_KEY) || '[]');
        savedDrawingsContainer.innerHTML = '';

        drawings.forEach(drawing => {
            const div = document.createElement('div');
            div.className = 'relative group bg-gray-100 rounded-lg flex-shrink-0 w-48';
            div.innerHTML = `
                <div class="relative">
                    <img src="${drawing.dataUrl}" alt="${drawing.name}" 
                         class="w-48 h-32 object-contain p-2 bg-white rounded-lg shadow-sm"
                         title="${drawing.name}">
                    <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                        <button class="edit-drawing bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                                data-id="${drawing.id}">
                            <span class="material-icons text-sm">edit</span>수정
                        </button>
                        <button class="delete-drawing bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                                data-id="${drawing.id}">
                            <span class="material-icons text-sm">delete</span>삭제
                        </button>
                    </div>
                </div>
                <div class="pt-1 px-2 text-xs text-gray-600 truncate">${drawing.name}</div>
            `;

            // 그림 수정
            div.querySelector('.edit-drawing').addEventListener('click', () => {
                if (!confirm('현재 캔버스의 내용이 삭제되고 이 그림을 불러옵니다. 계속하시겠습니까?')) return;

                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = drawing.dataUrl;
            });

            // 그림 삭제
            div.querySelector('.delete-drawing').addEventListener('click', () => {
                if (!confirm('이 그림을 삭제하시겠습니까?')) return;

                const drawings = JSON.parse(localStorage.getItem(DRAWINGS_KEY) || '[]');
                const updatedDrawings = drawings.filter(d => d.id !== drawing.id);
                localStorage.setItem(DRAWINGS_KEY, JSON.stringify(updatedDrawings));
                loadSavedDrawings();
            });

            savedDrawingsContainer.appendChild(div);
        });
    }

    // 최대화 버튼 클릭 이벤트
    maximizeBtn.addEventListener('click', () => {
        const container = document.getElementById('drawing-container');
        const canvasContainer = container.querySelector('.canvas-container');
        
        // 현재 드로잉 데이터 가져오기
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        container.classList.toggle('fixed');
        container.classList.toggle('inset-0');
        container.classList.toggle('z-50');
        
        if (container.classList.contains('fixed')) {
            // 최대화 상태일 때 스타일 적용
            document.body.style.overflow = 'hidden'; // 스크롤 방지
            container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'; // 어두운 배경
            container.style.padding = '2rem';
            
            // 컨트롤 영역 스타일 조정
            const controls = container.querySelector('.controls');
            controls.classList.add('bg-white', 'p-4', 'rounded-lg', 'shadow-lg', 'mb-6');
            
            // 최대화 상태일 때 캔버스 크기 조정
            const containerWidth = container.clientWidth - 64; // 패딩 고려
            const containerHeight = container.clientHeight - 280; // 헤더와 컨트롤 영역 고려
            
            // 16:9 비율 유지
            const aspectRatio = 16 / 9;
            let newWidth = containerWidth;
            let newHeight = containerWidth / aspectRatio;
            
            if (newHeight > containerHeight) {
                newHeight = containerHeight;
                newWidth = containerHeight * aspectRatio;
            }
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // 캔버스를 컨테이너 중앙에 배치
            canvasContainer.style.width = `${newWidth}px`;
            canvasContainer.style.height = `${newHeight}px`;
            canvasContainer.style.margin = 'auto';
            canvasContainer.style.backgroundColor = 'white';
            canvasContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            
            maximizeBtn.innerHTML = '<span class="material-icons">fullscreen_exit</span>작게 보기';
            
            // 캔버스 크기 조정 후 이미지 데이터 복원
            setTimeout(() => {
                resizeCanvas();
                ctx.putImageData(imageData, 0, 0);
            }, 100);
        } else {
            // 원래 상태로 복원
            document.body.style.overflow = '';
            container.style.backgroundColor = '';
            container.style.padding = '';
            
            // 컨트롤 영역 스타일 복원
            const controls = container.querySelector('.controls');
            controls.classList.remove('bg-white', 'p-4', 'rounded-lg', 'shadow-lg', 'mb-6');
            
            canvasContainer.style.width = '';
            canvasContainer.style.height = '';
            canvasContainer.style.margin = '';
            canvasContainer.style.backgroundColor = '';
            canvasContainer.style.boxShadow = '';
            
            // 캔버스 크기 조정 후 이미지 데이터 복원
            setTimeout(() => {
                resizeCanvas();
                ctx.putImageData(imageData, 0, 0);
            }, 100);
            
            maximizeBtn.innerHTML = '<span class="material-icons">fullscreen</span>크게 보기';
        }
        
        // 저장된 캔버스 상태 복원
        restoreCanvasState(savedState);
    });    // 초기 로드
    loadSavedDrawings();
    loadSavedCliparts(); // 저장된 클립아트 로드
});
