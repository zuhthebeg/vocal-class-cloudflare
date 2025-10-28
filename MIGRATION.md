# localStorage → Cloudflare API 마이그레이션 가이드

기존 프로젝트의 `localStorage` 기반 코드를 Cloudflare API로 전환하는 구체적인 가이드입니다.

## 🔄 마이그레이션 체크리스트

- [ ] 1. D1 데이터베이스 생성 및 초기화
- [ ] 2. R2 버킷 생성
- [ ] 3. Functions API 배포
- [ ] 4. 인증 로직 수정 (auth.js)
- [ ] 5. 스케줄 관리 수정 (teacher.js)
- [ ] 6. 예약 시스템 수정 (student.js)
- [ ] 7. 출석 기능 수정 (signature.js)
- [ ] 8. 녹음 기능 수정 (recorder.js)
- [ ] 9. 테스트 및 검증

## 📝 1. auth.js 수정

### 기존 코드
```javascript
// localStorage 사용
function login(name, role) {
    const user = { name, role };
    localStorage.setItem('user', JSON.stringify(user));
    // ...
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}
```

### 새 코드
```javascript
// API 사용 + sessionStorage (임시)
async function login(name, role) {
    try {
        // 서버에 사용자 조회/생성 요청
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role })
        });
        
        const data = await response.json();
        
        if (data.ok) {
            // 세션에 사용자 정보 저장 (보안 향상)
            sessionStorage.setItem('user', JSON.stringify(data.user));
            
            // 역할에 따라 페이지 이동
            if (role === 'teacher') {
                window.location.href = '/teacher.html';
            } else {
                window.location.href = '/student.html';
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('로그인 중 오류가 발생했습니다.');
    }
}

function getUser() {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function logout() {
    sessionStorage.removeItem('user');
    window.location.href = '/';
}
```

### 추가 필요: `/api/users/login` 엔드포인트

```typescript
// functions/api/users/login.ts
export async function onRequestPost(context) {
    const { request, env } = context;
    const { name, role } = await request.json();
    
    // 사용자 조회
    let user = await env.DB.prepare(
        'SELECT * FROM users WHERE name = ? AND role = ?'
    ).bind(name, role).first();
    
    // 없으면 생성
    if (!user) {
        const result = await env.DB.prepare(
            'INSERT INTO users (name, role) VALUES (?, ?) RETURNING *'
        ).bind(name, role).first();
        user = result;
    }
    
    return Response.json({ ok: true, user });
}
```

## 📅 2. teacher.js - 스케줄 관리 수정

### 기존 코드
```javascript
function saveSchedule() {
    const scheduleData = collectScheduleData();
    localStorage.setItem('teacherSchedule', JSON.stringify(scheduleData));
    alert('스케줄이 저장되었습니다!');
}

function loadSchedule() {
    const data = localStorage.getItem('teacherSchedule');
    return data ? JSON.parse(data) : [];
}
```

### 새 코드
```javascript
async function saveSchedule() {
    const user = getUser();
    const scheduleData = collectScheduleData();
    
    try {
        const response = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teacherId: user.id,
                schedules: scheduleData
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            alert('스케줄이 저장되었습니다!');
            loadSchedule(); // 새로고침
        } else {
            alert('저장 실패: ' + result.error);
        }
    } catch (error) {
        console.error('Save schedule error:', error);
        alert('스케줄 저장 중 오류가 발생했습니다.');
    }
}

async function loadSchedule() {
    const user = getUser();
    
    try {
        const response = await fetch(`/api/schedule?teacherId=${user.id}`);
        const data = await response.json();
        
        if (data.schedules) {
            renderSchedule(data.schedules);
        }
    } catch (error) {
        console.error('Load schedule error:', error);
    }
}

// 스케줄 데이터 수집
function collectScheduleData() {
    const schedules = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
        document.querySelectorAll(`[data-day="${day}"]`).forEach(slot => {
            if (slot.checked) {
                schedules.push({
                    dayOfWeek: day,
                    timeSlot: slot.dataset.time,
                    isAvailable: true
                });
            }
        });
    });
    
    return schedules;
}
```

## 🎓 3. student.js - 예약 시스템 수정

### 기존 코드
```javascript
function bookLesson(scheduleId, date) {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    bookings.push({ scheduleId, date, studentName: user.name });
    localStorage.setItem('bookings', JSON.stringify(bookings));
}
```

### 새 코드
```javascript
async function bookLesson(scheduleId, date) {
    const user = getUser();
    
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: user.id,
                teacherId: 1, // 강사 ID (실제로는 동적으로)
                scheduleId: scheduleId,
                bookingDate: date
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            alert('예약이 완료되었습니다!');
            loadMyBookings(); // 예약 목록 새로고침
        } else if (response.status === 409) {
            alert('이미 예약된 시간입니다.');
        } else {
            alert('예약 실패: ' + result.error);
        }
    } catch (error) {
        console.error('Booking error:', error);
        alert('예약 중 오류가 발생했습니다.');
    }
}

async function loadMyBookings() {
    const user = getUser();
    
    try {
        const response = await fetch(`/api/bookings?studentId=${user.id}`);
        const data = await response.json();
        
        if (data.bookings) {
            renderBookings(data.bookings);
        }
    } catch (error) {
        console.error('Load bookings error:', error);
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('예약을 취소하시겠습니까?')) return;
    
    try {
        const response = await fetch(`/api/bookings?id=${bookingId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.ok) {
            alert('예약이 취소되었습니다.');
            loadMyBookings();
        }
    } catch (error) {
        console.error('Cancel booking error:', error);
    }
}
```

## ✍️ 4. signature.js - 출석 기능 수정

### 기존 코드
```javascript
function submitSignature() {
    const signatureData = canvas.toDataURL('image/png');
    const attendance = {
        sessionId: sessionId,
        studentName: user.name,
        timestamp: new Date().toISOString(),
        signature: signatureData
    };
    
    localStorage.setItem('attendance_' + sessionId, JSON.stringify(attendance));
}
```

### 새 코드
```javascript
async function submitSignature() {
    const user = getUser();
    const signatureData = canvas.toDataURL('image/png');
    const sessionId = new URLSearchParams(window.location.search).get('session');
    
    // 빈 캔버스 체크
    if (isCanvasBlank()) {
        alert('서명을 해주세요.');
        return;
    }
    
    try {
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                studentName: user.name,
                bookingId: null, // 예약 ID가 있으면 추가
                signature: signatureData
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            alert('출석이 완료되었습니다!');
            window.location.href = '/student.html';
        } else {
            alert('출석 처리 실패: ' + result.error);
        }
    } catch (error) {
        console.error('Attendance submission error:', error);
        alert('출석 처리 중 오류가 발생했습니다.');
    }
}

function isCanvasBlank() {
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
}
```

## 🎤 5. recorder.js - 녹음 기능 수정

### 기존 코드
```javascript
function saveRecording(blob) {
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64data = reader.result;
        localStorage.setItem('recording_' + Date.now(), base64data);
    };
    reader.readAsDataURL(blob);
}
```

### 새 코드
```javascript
async function saveRecording(blob, title = 'Untitled') {
    const user = getUser();
    const formData = new FormData();
    
    formData.append('userId', user.id);
    formData.append('title', title);
    formData.append('audio', blob, `recording_${Date.now()}.webm`);
    
    try {
        const response = await fetch('/api/recordings', {
            method: 'POST',
            body: formData // FormData는 Content-Type을 자동 설정
        });
        
        const result = await response.json();
        
        if (result.ok) {
            alert('녹음이 저장되었습니다!');
            loadSavedRecordings();
        } else {
            alert('저장 실패: ' + result.error);
        }
    } catch (error) {
        console.error('Recording save error:', error);
        alert('녹음 저장 중 오류가 발생했습니다.');
    }
}

async function loadSavedRecordings() {
    const user = getUser();
    
    try {
        const response = await fetch(`/api/recordings?userId=${user.id}`);
        const data = await response.json();
        
        if (data.recordings) {
            renderRecordings(data.recordings);
        }
    } catch (error) {
        console.error('Load recordings error:', error);
    }
}

async function playRecording(recordingId) {
    try {
        const response = await fetch(`/api/recordings?id=${recordingId}`);
        const blob = await response.blob();
        
        const audio = new Audio(URL.createObjectURL(blob));
        audio.play();
    } catch (error) {
        console.error('Play recording error:', error);
    }
}

async function deleteRecording(recordingId) {
    if (!confirm('녹음을 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`/api/recordings?id=${recordingId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.ok) {
            alert('녹음이 삭제되었습니다.');
            loadSavedRecordings();
        }
    } catch (error) {
        console.error('Delete recording error:', error);
    }
}
```

## 🧪 테스트 방법

### 로컬 개발 환경
```bash
# 1. 의존성 설치
npm install

# 2. 로컬 D1 초기화
npm run d1:local

# 3. 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:8788 접속
```

### 프로덕션 배포 전 체크리스트
- [ ] 모든 API 엔드포인트가 정상 작동하는지 확인
- [ ] 에러 처리가 제대로 되어있는지 확인
- [ ] 로딩 인디케이터 추가
- [ ] CORS 설정 확인
- [ ] 보안 헤더 설정

## 🎨 선택적 개선사항

### 1. 로딩 인디케이터 추가
```javascript
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// 사용 예시
async function saveSchedule() {
    showLoading();
    try {
        // API 호출
    } finally {
        hideLoading();
    }
}
```

### 2. 에러 토스트 메시지
```javascript
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}
```

### 3. 오프라인 지원 (PWA)
Service Worker에서 네트워크 요청 실패 시 캐시된 데이터 사용

## 📊 마이그레이션 진행 상황 추적

```javascript
// 각 페이지에서 마이그레이션 완료 여부 체크
const MIGRATION_STATUS = {
    auth: true,      // ✅ 완료
    teacher: false,  // ⏳ 진행 중
    student: false,  // ❌ 미완료
    signature: true, // ✅ 완료
    recorder: false, // ❌ 미완료
};

console.log('Migration Status:', MIGRATION_STATUS);
```

## 🆘 문제 해결

### API 호출이 실패할 때
1. 브라우저 개발자도구 → Network 탭 확인
2. 요청 URL, 메서드, 페이로드 확인
3. 응답 상태 코드 및 에러 메시지 확인

### CORS 오류
Functions에 CORS 헤더가 없을 수 있음. `_middleware.ts` 추가:
```typescript
// functions/_middleware.ts
export async function onRequest(context) {
    const response = await context.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
}
```
