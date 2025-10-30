// js/recorder.js

const RECORDINGS_KEY = 'savedRecordings';

document.addEventListener('DOMContentLoaded', () => {
    const recordBtn = document.getElementById('record-btn');
    const stopBtn = document.getElementById('stop-btn');
    const audioPlaybackContainer = document.getElementById('audio-playback-container');
    const savedRecordingsContainer = document.getElementById('saved-recordings');

    let mediaRecorder;
    let audioChunks = [];
    let audioBlob;
    let recordingStartTime;

    // 녹음 시작
    recordBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener('stop', () => {
                audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                renderAudioPlayback(audioBlob);
            });

            mediaRecorder.start();
            recordBtn.disabled = true;
            stopBtn.disabled = false;
            recordingStartTime = new Date();
            console.log('녹음 시작...');
        } catch (err) {
            console.error('녹음 시작 실패:', err);
            alert('마이크 접근 권한이 필요합니다.');
        }
    });

    // 녹음 중지
    stopBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            recordBtn.disabled = false;
            stopBtn.disabled = true;
            console.log('녹음 중지.');
        }
    });

    // 오디오 재생 UI 렌더링
    function renderAudioPlayback(blob, options = {}) {
        const container = options.container || audioPlaybackContainer;
        if (!options.append) {
            container.innerHTML = ''; // 기존 재생기 제거
        }

        const recordingDiv = document.createElement('div');
        recordingDiv.className = 'bg-gray-50 p-3 rounded-lg';

        const audioUrl = URL.createObjectURL(blob);

        const audioPlayer = document.createElement('audio');
        audioPlayer.controls = true;
        audioPlayer.src = audioUrl;
        audioPlayer.className = 'w-full';

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'flex items-center justify-between mt-2';

        const playbackSpeedControl = document.createElement('div');
        playbackSpeedControl.className = 'flex items-center';
        playbackSpeedControl.innerHTML = `
            <label for="playback-speed" class="mr-2">재생 속도:</label>
            <select id="playback-speed" class="p-1 border rounded-md">
                <option value="0.5">0.5x</option>
                <option value="1" selected>1x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
            </select>
        `;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex gap-2';

        if (!options.saved) {
            const saveBtn = document.createElement('button');
            saveBtn.className = 'bg-green-500 text-white px-3 py-1 rounded text-sm';
            saveBtn.textContent = '저장';
            saveBtn.onclick = async () => {
                const name = prompt('녹음 제목을 입력하세요:');
                if (!name) return;

                // Blob을 base64로 변환
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64data = reader.result;
                    
                    const recording = {
                        id: Date.now().toString(),
                        name,
                        date: recordingStartTime.toISOString(),
                        data: base64data
                    };

                    const recordings = JSON.parse(localStorage.getItem(RECORDINGS_KEY) || '[]');
                    recordings.push(recording);
                    localStorage.setItem(RECORDINGS_KEY, JSON.stringify(recordings));
                    
                    loadSavedRecordings();
                };
            };
            actionsDiv.appendChild(saveBtn);
        }

        if (options.id) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'bg-red-500 text-white px-3 py-1 rounded text-sm';
            deleteBtn.textContent = '삭제';
            deleteBtn.onclick = () => {
                if (!confirm('이 녹음을 삭제하시겠습니까?')) return;
                
                const recordings = JSON.parse(localStorage.getItem(RECORDINGS_KEY) || '[]');
                const updatedRecordings = recordings.filter(r => r.id !== options.id);
                localStorage.setItem(RECORDINGS_KEY, JSON.stringify(updatedRecordings));
                
                loadSavedRecordings();
            };
            actionsDiv.appendChild(deleteBtn);
        }

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'bg-blue-500 text-white px-3 py-1 rounded text-sm';
        downloadBtn.textContent = '다운로드';
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = audioUrl;
            a.download = `recording-${new Date().toISOString()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        actionsDiv.appendChild(downloadBtn);

        const speedSelect = playbackSpeedControl.querySelector('#playback-speed');
        speedSelect.addEventListener('change', (e) => {
            audioPlayer.playbackRate = parseFloat(e.target.value);
        });

        if (options.name) {
            const titleDiv = document.createElement('div');
            titleDiv.className = 'font-semibold mb-2';
            titleDiv.textContent = options.name;
            recordingDiv.appendChild(titleDiv);
        }

        controlsDiv.appendChild(playbackSpeedControl);
        controlsDiv.appendChild(actionsDiv);

        recordingDiv.appendChild(audioPlayer);
        recordingDiv.appendChild(controlsDiv);
        container.appendChild(recordingDiv);
    }

    // 저장된 녹음 목록 로드
    function loadSavedRecordings() {
        const recordings = JSON.parse(localStorage.getItem(RECORDINGS_KEY) || '[]');
        savedRecordingsContainer.innerHTML = '';

        recordings.forEach(recording => {
            // base64 데이터를 Blob으로 변환
            const byteString = atob(recording.data.split(',')[1]);
            const mimeType = recording.data.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeType });

            renderAudioPlayback(blob, {
                container: savedRecordingsContainer,
                append: true,
                saved: true,
                id: recording.id,
                name: recording.name
            });
        });
    }

    // 초기 로드
    loadSavedRecordings();
});
