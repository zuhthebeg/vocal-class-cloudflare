# Vocal Class Cloudflare 작업 로그

## 📋 프로젝트 개요
보컬 클래스 예약 및 출석 관리 시스템
- **Frontend**: HTML, CSS, JavaScript (Tailwind CSS)
- **Backend**: Cloudflare Pages Functions + D1 Database
- **배포**: Cloudflare Pages

---

## 🔧 완료된 작업

### 1. DB 스키마 날짜 기반으로 전환 ✅
**변경 전:**
```sql
schedules (
  day_of_week TEXT CHECK(IN ('monday', 'tuesday', ...))
)
```

**변경 후:**
```sql
schedules (
  specific_date DATE NOT NULL  -- '2025-10-29'
  time_slot TEXT NOT NULL      -- '10:00'
  UNIQUE(teacher_id, specific_date, time_slot)
)

bookings (
  booking_date DATE NOT NULL,
  time_slot TEXT NOT NULL
  -- schedule_id 제거됨
)
```

**파일:** `schema.sql`

---

### 2. API 전면 수정 ✅

#### `functions/api/schedule.ts`
- **POST**: 특정 날짜의 스케줄 저장
  ```json
  {
    "teacherId": 1,
    "date": "2025-10-29",
    "timeSlots": ["10:00", "10:30", "14:00"]
  }
  ```
- **GET**: 날짜 범위 조회
  ```
  /api/schedule?teacherId=1&startDate=2025-10-01&endDate=2025-12-31
  ```
  응답:
  ```json
  {
    "schedules": [...],
    "schedulesByDate": {
      "2025-10-29": ["10:00", "10:30"],
      "2025-10-30": ["14:00", "15:00"]
    }
  }
  ```
- **DELETE**: 특정 날짜/시간 삭제
- **보호 로직**: 예약된 시간은 수정/삭제 불가 (409 Conflict)

#### `functions/api/bookings.ts`
- **POST**: 예약 생성 (scheduleId 제거)
  ```json
  {
    "studentId": 1,
    "teacherId": 1,
    "bookingDate": "2025-10-29",
    "timeSlot": "10:00"
  }
  ```
- **GET**: 예약 조회
  ```
  /api/bookings?studentId=1
  /api/bookings?teacherId=1
  ```
- **DELETE**: 예약 취소 (status='cancelled')

---

### 3. 프론트엔드 달력 UI 변경 ✅

#### Teacher 페이지 (`teacher.html`, `js/teacher.js`)
**기능:**
- 월별 달력 표시
- 날짜 클릭 → 시간 슬롯 패널 표시
- 드래그 선택으로 여러 시간 선택 가능
- 예약된 시간은 빨간색 + 학생 이름 표시 (수정 불가)
- 동적 시간 범위 설정 (9-22시 기본, 변경 가능)

**데이터 구조:**
```javascript
teacherSchedule = {
  "2025-10-29": ["10:00", "10:30"],
  "2025-10-30": ["14:00", "15:00"]
}
```

**주요 함수:**
- `renderCalendar()` - 월별 달력 렌더링
- `showTimeslotPanel()` - 시간 슬롯 선택 UI
- `saveDateScheduleBtn` - API 저장 (localStorage/API 모드 자동 감지)
- `loadSchedule()` - 3개월치 스케줄 조회

#### Student 페이지 (`student.html`, `js/student.js`)
**기능:**
- 강사 스케줄 달력 조회
- 초록색: 예약 가능한 날짜
- 파란색: 내가 예약한 날짜
- 날짜 클릭 → 시간 슬롯 표시
  - 초록색: 예약 가능
  - 파란색: 내 예약
  - 회색: 다른 학생 예약
- 예약/취소 기능

---

### 4. 개발 모드 vs API 모드 자동 감지 ✅

**모든 JS 파일에 적용:**
```javascript
const isDevelopmentPort = ['3000', '8000', '8080', '5000', '5500'].includes(window.location.port);
const isLocalhost = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.startsWith('192.168.') ||
                    window.location.hostname.startsWith('10.') ||
                    !window.location.hostname;
const USE_LOCAL_STORAGE_ONLY = isLocalhost || isDevelopmentPort;

if (USE_LOCAL_STORAGE_ONLY) {
  // localStorage 모드
} else {
  // API 모드
}
```

---

## 🚨 현재 문제: 404 / ERR_FAILED

### 증상
1. ✅ `http://localhost:8788/` → index.html 로드됨
2. ✅ `http://localhost:8788/test.html` → 테스트 페이지 로드됨
3. ❌ 로그인 후 teacher.html, student.html → **ERR_FAILED** 또는 404
4. ❌ 브라우저 주소창에 직접 입력해도 동일

### 시도한 해결 방법

#### 1. 경로 수정 (절대 → 상대)
```javascript
// 변경 전
window.location.href = '/teacher.html';

// 변경 후
window.location.href = 'teacher.html';
```
**파일:** `js/auth.js`, `js/signature.js`, `teacher.html`, `student.html`

#### 2. 프로젝트 구조 재구성
```
vocal-class-cloudflare/
├── public/              ← 정적 파일
│   ├── *.html
│   ├── css/
│   ├── js/
│   ├── _redirects
│   ├── _headers
│   └── _routes.json
├── functions_backup/    ← API (백업 중)
│   └── api/
│       ├── auth.ts
│       ├── schedule.ts
│       ├── bookings.ts
│       └── attendance.ts
├── wrangler.toml
└── schema.sql
```

**wrangler.toml:**
```toml
pages_build_output_dir = "public"

[[d1_databases]]
binding = "DB"
database_name = "vocal-class-db"
database_id = "9f90ac1e-f6d8-4a9b-9e9d-2ae5548ac054"
```

#### 3. Functions 폴더 백업
Functions가 모든 요청을 가로채는 문제 발견
```bash
mv functions functions_backup
```

현재 서버 로그:
```
No Functions. Shimming...
✨ Parsed 0 valid redirect rules.
✨ Parsed 3 valid header rules.
⎔ Starting local server...
[wrangler:info] Ready on http://127.0.0.1:8788
[wrangler:info] GET /css/components.css 304 Not Modified
[wrangler:info] GET /js/components.js 304 Not Modified
```

#### 4. 설정 파일들

**`public/_routes.json`:**
```json
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": ["/*"]
}
```

**`public/_redirects`:**
```
# Cloudflare Pages automatically serves index.html for /
# No redirects needed - static files are served directly
```

**`public/_headers`:**
```
## Static HTML files
/*.html
  Content-Type: text/html; charset=utf-8

## CSS files
/css/*
  Content-Type: text/css; charset=utf-8

## JavaScript files
/js/*
  Content-Type: application/javascript; charset=utf-8
```

---

## 🔍 진단 결과

### 작동하는 것
- ✅ index.html 로드
- ✅ test.html 로드
- ✅ CSS, JS 파일 로드 (304 캐시)
- ✅ 정적 파일 서빙은 정상

### 작동하지 않는 것
- ❌ teacher.html 직접 접근
- ❌ student.html 직접 접근
- ❌ JavaScript에서 `window.location.href` 리다이렉트

### 의심되는 원인
1. **Service Worker 충돌?** - index.html에 PWA 서비스 워커 등록됨
2. **브라우저 캐시 문제?**
3. **특정 HTML 파일의 JavaScript 로드 오류?**
4. **리다이렉트 모드 설정?**

---

## 📝 테스트용 파일 생성됨

### `public/test.html` ✅
```html
<h1>TEST PAGE WORKS! ✅</h1>
<p>If you see this, static HTML serving is working.</p>
```

### `public/test-redirect.html`
```html
<button id="test-btn">Click to go to teacher.html</button>
<script>
  document.getElementById('test-btn').addEventListener('click', () => {
    console.log('Redirecting to teacher.html');
    window.location.href = 'teacher.html';
  });
</script>
```

### `public/index-simple.html`
```html
<a href="teacher.html">강사 페이지로 이동</a>
<a href="student.html">수강생 페이지로 이동</a>
```

---

## 🔧 필요한 추가 진단

1. **브라우저 주소창 직접 입력 테스트:**
   - `http://localhost:8788/teacher.html`
   - `http://localhost:8788/student.html`

2. **브라우저 콘솔 확인 (F12):**
   - Console 탭에서 빨간 에러 메시지
   - Network 탭에서 teacher.html 요청 상태

3. **Service Worker 확인:**
   - F12 → Application → Service Workers
   - 활성화된 Service Worker가 있는지

4. **테스트 파일들로 확인:**
   - test-redirect.html 버튼 클릭 시 작동 여부
   - index-simple.html 링크 클릭 시 작동 여부

---

## 🎯 다음 단계 (Playwright MCP 사용)

1. **자동화 테스트로 정확한 에러 캡처**
   - Playwright로 브라우저 자동화
   - 로그인 → 리다이렉트 과정 추적
   - 콘솔 에러 자동 수집

2. **네트워크 요청 모니터링**
   - teacher.html 요청의 실제 응답 확인
   - 리다이렉트 체인 추적

3. **Service Worker 제거 테스트**
   - PWA 기능 임시 비활성화
   - manifest.json, service-worker.js 제거

---

## 📦 백업된 파일 위치

- **Functions API**: `functions_backup/api/`
- **이전 설정**: Git history

---

## 🔗 관련 문서

- Cloudflare Pages: https://developers.cloudflare.com/pages/
- D1 Database: https://developers.cloudflare.com/d1/
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/

---

## 💡 참고 사항

### DB 초기화 (필요 시)
```bash
wrangler d1 execute vocal-class-db --file=./schema.sql
```

### 로컬 개발 서버 실행
```bash
wrangler pages dev public
```

### 배포
```bash
wrangler pages deploy public
```

---

## ✅ 문제 해결 완료!

### 원인
Cloudflare Pages의 **308 Permanent Redirect**가 `.html` 확장자를 자동으로 제거하면서 발생한 문제

### 해결 방법
모든 링크와 리다이렉트에서 `.html` 확장자 제거

**수정된 파일:**
1. `js/auth.js` - login(), logout(), checkAuth() 리다이렉트
2. `js/components.js` - 인증 에러 리다이렉트
3. `js/teacher.js` - QR 코드 서명 링크
4. `js/signature.js` - 출석 후 리다이렉트
5. `index-simple.html` - 테스트 페이지 링크
6. `teacher.html` - 수업도구 링크
7. `student.html` - 수업도구, 서명 페이지 링크

**변경 예시:**
```javascript
// 변경 전
window.location.href = 'teacher.html';
window.location.href = '/index.html';

// 변경 후
window.location.href = 'teacher';
window.location.href = '/';
```

### 테스트 결과
✅ 로그인 → teacher 페이지 정상 이동
✅ 로그인 → student 페이지 정상 이동
✅ JavaScript 에러 없음
✅ 달력 UI 정상 작동
✅ 드래그 선택 정상 작동

---

**작성일**: 2025-10-30
**상태**: ✅ 완료 - 로컬 개발 환경 정상 작동
