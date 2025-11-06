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

    // 실행취소/다시실행을 위한 히스토리 스택
    let undoStack = [];
    let redoStack = [];
    const MAX_HISTORY = 50; // 최대 히스토리 개수

    // 도형 그리기용 변수
    let shiftPressed = false;  // Shift 키: 직선
    let ctrlPressed = false;   // Ctrl 키: 원/사각형
    let startX = 0;
    let startY = 0;
    let tempImageData = null;  // 임시 캔버스 상태 저장

    // 캔버스 상태 저장 (실행취소용)
    function saveCanvasState() {
        canvasMemory = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    // 캔버스 상태 복원
    function restoreCanvasState() {
        if (canvasMemory) {
            ctx.putImageData(canvasMemory, 0, 0);
        }
    }

    // 히스토리에 현재 상태 저장
    function saveToHistory() {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        undoStack.push(imageData);

        // 최대 히스토리 개수 제한
        if (undoStack.length > MAX_HISTORY) {
            undoStack.shift();
        }

        // 새로운 작업이 추가되면 redo 스택 초기화
        redoStack = [];
    }

    // 실행취소 (Ctrl+Z)
    function undo() {
        if (undoStack.length > 0) {
            // 현재 상태를 redo 스택에 저장
            const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            redoStack.push(currentState);

            // undo 스택에서 이전 상태 가져와서 복원
            const previousState = undoStack.pop();
            ctx.putImageData(previousState, 0, 0);
        }
    }

    // 다시실행 (Ctrl+Shift+Z)
    function redo() {
        if (redoStack.length > 0) {
            // 현재 상태를 undo 스택에 저장
            const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            undoStack.push(currentState);

            // redo 스택에서 다음 상태 가져와서 복원
            const nextState = redoStack.pop();
            ctx.putImageData(nextState, 0, 0);
        }
    }

    // 캔버스 크기 설정 (컨테이너에 맞춤)
    function resizeCanvas() {
        const wrapper = canvas.parentElement;
        const rect = wrapper.getBoundingClientRect();

        // 현재 캔버스 상태 저장
        let imageData = null;
        try {
            if (canvas.width > 0 && canvas.height > 0) {
                imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            }
        } catch (e) {
            console.warn('캔버스 상태 저장 실패:', e);
        }

        // 캔버스 실제 크기를 wrapper 크기와 동일하게 설정
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);

        canvas.width = width;
        canvas.height = height;

        // CSS 크기도 명시적으로 설정 (확대/축소 적용)
        canvas.style.width = `${width * currentZoom}px`;
        canvas.style.height = `${height * currentZoom}px`;

        // wrapper가 overflow되면 스크롤 가능하도록
        if (currentZoom > 1) {
            wrapper.style.overflow = 'auto';
        } else {
            wrapper.style.overflow = 'hidden';
        }

        // 컨텍스트 설정
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentBrushSize;

        // 저장된 상태 복원
        if (imageData) {
            try {
                ctx.putImageData(imageData, 0, 0);
            } catch (e) {
                console.warn('캔버스 상태 복원 실패:', e);
            }
        }

        // 줌 레벨 표시 업데이트
        updateZoomDisplay();
    }

    // 확대/축소 레벨 업데이트
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

        // 시작점 저장 (도형 그리기용)
        startX = x;
        startY = y;

        // 도형 그리기 모드인 경우 현재 캔버스 상태 저장
        if (shiftPressed || ctrlPressed) {
            tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }

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

        if (shiftPressed) {
            // Shift: 직선 그리기
            if (tempImageData) {
                ctx.putImageData(tempImageData, 0, 0);
            }
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(x, y);
            ctx.stroke();
        } else if (ctrlPressed) {
            // Ctrl: 원 그리기
            if (tempImageData) {
                ctx.putImageData(tempImageData, 0, 0);
            }
            const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
            ctx.beginPath();
            ctx.arc(startX, startY, radius, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // 기본: 자유 그리기
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    }

    // 그리기 종료
    function stopDrawing() {
        if (drawing) {
            drawing = false;
            tempImageData = null; // 임시 이미지 데이터 초기화
            ctx.beginPath(); // 새로운 경로 시작

            // 그리기가 완료되면 히스토리에 저장
            saveToHistory();
        }
    }

    // 키보드 이벤트 리스너 (Shift, Ctrl 감지, Undo/Redo)
    document.addEventListener('keydown', (e) => {
        // input, textarea 필드에 포커스가 있으면 키보드 이벤트 무시 (붙여넣기 등을 위해)
        const isInputFocused = document.activeElement.tagName === 'INPUT' ||
                               document.activeElement.tagName === 'TEXTAREA';

        // Ctrl+Shift+Z: 다시실행 (Redo) - input 필드가 아닐 때만
        if (!isInputFocused && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            redo();
            return;
        }

        // Ctrl+Z: 실행취소 (Undo) - input 필드가 아닐 때만
        if (!isInputFocused && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
            return;
        }

        if (e.key === 'Shift') {
            shiftPressed = true;
        } else if (e.key === 'Control' || e.ctrlKey) {
            ctrlPressed = true;
            // input 필드가 아닐 때만 기본 동작 방지
            if (!isInputFocused) {
                e.preventDefault();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
            shiftPressed = false;
        } else if (e.key === 'Control' || e.ctrlKey) {
            ctrlPressed = false;
        }
    });

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
        saveToHistory(); // 지우기 전 상태 저장
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

    // 클립아트 및 저장된 그림 드래그 앤 드롭
    let draggedClipart = null;

    // 클립아트 dragstart
    clipartContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('draggable')) {
            draggedClipart = e.target;
            e.dataTransfer.setData('text/plain', e.target.src);
            e.dataTransfer.effectAllowed = 'copy';
        }
    });

    // 저장된 그림 dragstart
    savedDrawingsContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('draggable')) {
            draggedClipart = e.target;
            e.target.dataset.wasDragged = 'true'; // 드래그 중임을 표시
            e.dataTransfer.setData('text/plain', e.target.dataset.drawingData);
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

                // 현재 캔버스의 드로잉 상태 저장 (실행 취소용)
                saveCanvasState();

                // 클립아트를 드래그한 위치에 배치 (기존 드로잉 위에 오버레이)
                try {
                    // 캔버스 크기의 70%를 최대 크기로 설정 (더 크게)
                    const targetSize = Math.min(canvas.width, canvas.height) * 0.7;
                    const scale = Math.min(
                        targetSize / img.width,
                        targetSize / img.height
                    );

                    const scaledWidth = img.width * scale;
                    const scaledHeight = img.height * scale;

                    // 드롭 위치를 중심으로 배치
                    const rect = canvas.getBoundingClientRect();
                    const mouseX = (e.clientX - rect.left) / currentZoom;
                    const mouseY = (e.clientY - rect.top) / currentZoom;

                    // 이미지의 중심이 마우스 위치에 오도록 조정
                    const x = mouseX - (scaledWidth / 2);
                    const y = mouseY - (scaledHeight / 2);

                    // 기존 드로잉 위에 클립아트 오버레이
                    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

                    // 클립아트 추가 후 히스토리에 저장
                    saveToHistory();

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
            const item = document.createElement('div');
            item.className = 'relative flex-shrink-0';

            const img = document.createElement('img');
            img.src = drawing.dataUrl;
            img.alt = drawing.name;
            img.title = `${drawing.name} - 드래그해서 캔버스에 추가하거나 클릭해서 전체 교체`;
            img.className = 'saved-drawing draggable w-48 h-32 object-contain p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-move';
            img.draggable = true;
            img.dataset.drawingId = drawing.id;
            img.dataset.drawingData = drawing.dataUrl;

            // X 삭제 버튼 (우측 상단)
            const delBtn = document.createElement('button');
            delBtn.className = 'absolute -top-1 -right-1 bg-white text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm shadow hover:bg-red-50 z-10';
            delBtn.title = '삭제';
            delBtn.innerHTML = '&times;';
            delBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (!confirm('이 그림을 삭제하시겠습니까?')) return;

                const drawings = JSON.parse(localStorage.getItem(DRAWINGS_KEY) || '[]');
                const updatedDrawings = drawings.filter(d => d.id !== drawing.id);
                localStorage.setItem(DRAWINGS_KEY, JSON.stringify(updatedDrawings));
                loadSavedDrawings();
            });

            // 전체 교체 버튼 (클릭 시)
            img.addEventListener('click', (e) => {
                // 드래그가 아닌 클릭인 경우에만
                if (e.detail === 1) {
                    setTimeout(() => {
                        if (!img.dataset.wasDragged) {
                            if (!confirm('현재 캔버스의 내용을 삭제하고 이 그림으로 전체 교체하시겠습니까?')) return;

                            const loadImg = new Image();
                            loadImg.onload = () => {
                                saveToHistory(); // 교체 전 상태 저장
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                                ctx.drawImage(loadImg, 0, 0, canvas.width, canvas.height);
                            };
                            loadImg.src = drawing.dataUrl;
                        }
                        delete img.dataset.wasDragged;
                    }, 200);
                }
            });

            const nameDiv = document.createElement('div');
            nameDiv.className = 'pt-1 px-2 text-xs text-gray-600 truncate text-center';
            nameDiv.textContent = drawing.name;

            const wrapper = document.createElement('div');
            wrapper.className = 'relative';
            wrapper.appendChild(img);
            wrapper.appendChild(delBtn);

            item.appendChild(wrapper);
            item.appendChild(nameDiv);
            savedDrawingsContainer.appendChild(item);
        });
    }

    // 최대화 버튼 클릭 이벤트
    maximizeBtn.addEventListener('click', () => {
        const container = document.getElementById('drawing-container');
        const wrapper = document.getElementById('canvas-wrapper');

        // 현재 드로잉 데이터 가져오기
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        container.classList.toggle('fixed');
        container.classList.toggle('inset-0');
        container.classList.toggle('z-50');

        if (container.classList.contains('fixed')) {
            // 최대화 상태
            document.body.style.overflow = 'hidden';
            container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            container.style.padding = '2rem';
            container.style.overflowY = 'auto'; // 스크롤 가능하도록

            // 컨트롤 영역 스타일
            const controls = container.querySelector('.controls');
            controls.classList.add('bg-white', 'p-4', 'rounded-lg', 'shadow-lg', 'mb-4');

            // wrapper를 더 크게 (vh 기반)
            wrapper.style.height = 'calc(100vh - 250px)';
            wrapper.style.width = '100%';
            wrapper.style.maxWidth = '1400px';
            wrapper.style.margin = '0 auto';

            maximizeBtn.innerHTML = '<span class="material-icons">fullscreen_exit</span>작게 보기';
        } else {
            // 원래 상태로 복원
            document.body.style.overflow = '';
            container.style.backgroundColor = '';
            container.style.padding = '';
            container.style.overflowY = '';

            const controls = container.querySelector('.controls');
            controls.classList.remove('bg-white', 'p-4', 'rounded-lg', 'shadow-lg', 'mb-4');

            wrapper.style.height = '500px';
            wrapper.style.width = '';
            wrapper.style.maxWidth = '';
            wrapper.style.margin = '';

            maximizeBtn.innerHTML = '<span class="material-icons">fullscreen</span>크게 보기';
        }

        // 캔버스 크기 재조정 및 이미지 복원
        setTimeout(() => {
            resizeCanvas();
            try {
                ctx.putImageData(imageData, 0, 0);
            } catch (e) {
                console.warn('이미지 복원 실패:', e);
            }
        }, 100);
    });

    // 초기 로드
    loadSavedDrawings();
    loadSavedCliparts(); // 저장된 클립아트 로드

    // 초기 빈 캔버스 상태를 히스토리에 저장
    setTimeout(() => {
        saveToHistory();
    }, 100);
});
