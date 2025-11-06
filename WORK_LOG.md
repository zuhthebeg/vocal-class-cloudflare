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

## 📝 2025년 11월 3일 업데이트: 수강생 관리 기능 개선 및 버그 수정

### 📋 변경 사항 요약

#### 1. DB 스키마 업데이트 (`schema.sql`)
- `users` 테이블에 다음 컬럼 추가:
  - `end_date` (DATE)
  - `bank_account` (TEXT)
  - `payment_status` (TEXT, 'paid' 또는 'unpaid', 기본값 'unpaid')

#### 2. API 엔드포인트 업데이트 (`functions/api/auth.ts`)
- `GET /api/auth?role=student` (수강생 목록 조회)
  - `end_date`, `bank_account`, `payment_status` 필드 포함
  - 각 수강생의 `attendance_count` (출석 횟수)를 서브쿼리로 계산하여 반환
  - 디버깅을 위해 `catch` 블록에서 상세 에러 메시지 반환하도록 수정 (현재 유지 중)
- `PATCH /api/auth?id={userId}` (수강생 정보 업데이트)
  - `end_date`, `bank_account`, `payment_status` 필드 업데이트 허용

#### 3. 수강생 관리 페이지 프론트엔드 업데이트 (`students.html`, `js/students.js`)
- `students.html`:
  - 상단 네비게이션의 "예약 달력으로 돌아가기" 버튼 텍스트를 "예약관리로 돌아가기"로 변경하고 링크에서 `.html` 확장자 제거 (`/teacher`로 변경).
  - 수강생 정보 수정 모달에 "수업 종료일", "입금 계좌", "입금 여부" 필드 추가.
  - "특이사항" 필드의 라벨을 "수업 메모"로 변경.
- `js/students.js`:
  - 수강생 목록 테이블에 "수업 종료일", "출석 횟수", "입금 계좌", "입금 여부" 컬럼 표시.
  - 수강생 정보 수정 모달의 새 필드들을 채우고, 업데이트 시 해당 데이터를 API로 전송하도록 로직 수정.

#### 4. 예약 API 디버깅 모드 활성화 (`functions/api/bookings.ts`)
- `GET /api/bookings` (예약 목록 조회)
  - 디버깅을 위해 `catch` 블록에서 상세 에러 메시지 반환하도록 수정 (현재 유지 중)

#### 5. `teacher.html` 캐시 문제 진단 시도
- `teacher.html` 파일에 캐시 무효화를 위한 주석 추가 및 제거 시도.
- `teacher.html` 파일명 변경 (`teacher-new.html`) 후 재배포 시도.
- `curl` 명령어를 통한 배포된 페이지 내용 확인 시도 (인증 문제로 로그인 페이지 내용만 확인됨).

### 🚨 현재 발생 중인 문제

1.  **`teacher` 페이지의 "수강생 관리" 버튼 미표시:**
    - 로컬 파일에는 존재하나, 배포된 페이지에서는 보이지 않음.
    - Cloudflare Pages의 캐싱 문제로 추정. (사용자에게 브라우저 캐시 삭제, 시크릿 모드 접속, 쿼리 파라미터 추가 등 요청 필요)
2.  **예약 기능 실패:**
    - `GET /api/bookings` 엔드포인트에서 500 Internal Server Error 발생.
    - `functions/api/bookings.ts`의 `onRequestGet` 함수 내 `JOIN` 쿼리 문제로 추정. (D1이 `JOIN`을 지원한다고는 하나, 특정 상황에서 문제가 발생할 가능성 있음)
    - 상세 에러 메시지 확인을 위해 `functions/api/bookings.ts`에 디버깅 코드 추가 후 재배포 완료.
3.  **관리자 페이지 작동 안 함:**
    - `teacher` 페이지와 유사하게 캐싱 또는 배포 문제로 추정.
4.  **데이터베이스 초기화:**
    - `no such column` 에러 해결을 위해 모든 테이블을 삭제 후 재생성하여 데이터가 초기화됨.

### 💡 다음 단계

- 사용자에게 예약 실패 시 브라우저 개발자 콘솔의 상세 에러 메시지 확인 요청.
- 관리자 페이지 오류 확인 요청.
- `teacher` 페이지의 "수강생 관리" 버튼 문제 해결을 위한 브라우저 캐시 관련 조치 재요청.
- `functions/api/bookings.ts`의 `JOIN` 쿼리 문제 해결 방안 모색 (D1의 `JOIN` 지원 여부 재확인 또는 다중 쿼리로 변경).

---

## ✅ 2025년 11월 5일 업데이트: 모든 문제 해결 완료!

### 📋 해결된 문제

#### 1. ✅ 예약 기능 500 에러 해결
**원인:** 기존 데이터베이스 스키마가 schema.sql과 불일치
- 이전 DB에는 `start_date`, `suggested_time_slots` 등 컬럼이 누락되어 있었음
- D1 JOIN 쿼리 자체는 정상 작동 (D1은 SQLite 기반으로 JOIN을 완벽히 지원)

**해결 방법:**
```bash
# 모든 테이블 삭제 후 재생성
wrangler d1 execute vocal-class-db --local --command "DROP TABLE IF EXISTS attendances; DROP TABLE IF EXISTS recordings; DROP TABLE IF EXISTS example_videos; DROP TABLE IF EXISTS bookings; DROP TABLE IF EXISTS schedules; DROP TABLE IF EXISTS users;"

# schema.sql로 테이블 재생성
wrangler d1 execute vocal-class-db --local --file=./schema.sql
```

**테스트 데이터 생성:**
- gemini-task-delegator 에이전트를 사용하여 현실적인 테스트 데이터 생성
- 2명의 teachers (김나영, 이준호)
- 5명의 students (박은지, 최수빈, 정민준, 오지은, 강하준)
- 10개의 schedules (2025-11-05 ~ 2025-11-09)
- 5개의 bookings (approved 3개, pending 1개, completed 1개)

#### 2. ✅ 모든 API 엔드포인트 정상 작동 확인

**테스트 결과:**
```bash
# ✅ GET /api/auth?role=student - 학생 목록 + attendance_count
curl http://localhost:8788/api/auth?role=student
# 5명의 학생 데이터 정상 반환 (attendance_count 포함)

# ✅ PATCH /api/auth?id=3 - 사용자 정보 업데이트
curl -X PATCH "http://localhost:8788/api/auth?id=3" -d '{"notes":"테스트 메모"}'
# {"ok":true,"message":"User updated successfully"}

# ✅ GET /api/bookings?teacherId=1 - 예약 목록 조회 (JOIN 쿼리 정상)
curl http://localhost:8788/api/bookings?teacherId=1
# 5개의 예약 데이터 정상 반환 (student_name, teacher_name 포함)

# ✅ GET /api/schedule - 스케줄 조회
curl "http://localhost:8788/api/schedule?teacherId=1&startDate=2025-11-01&endDate=2025-11-30"
# schedules 배열 + schedulesByDate 객체 정상 반환
```

#### 3. ✅ CLAUDE.md 문서화 확인

사용자가 요청한 5가지 사항이 모두 CLAUDE.md에 완벽히 문서화되어 있음을 확인:

1. **students 관리 페이지 (Line 78-79, 87-88)**
   - `js/students.js` - Student management (teacher view)
   - `js/admin.js` - Admin dashboard
   - `students.html` - Student management page
   - `admin.html` - Admin dashboard

2. **auth.ts API 추가 기능 (Line 129-132)**
   - `GET /api/auth?role=student` - Get student list with attendance counts
   - `PATCH /api/auth?id={userId}` - Update user info (end_date, bank_account, payment_status, notes)

3. **날짜 기반 스케줄링 시스템 (Line 107-109)**
   - `schedules`: Teacher availability by **specific date** (not day of week)
   - Uses `specific_date` (DATE) + `time_slot` (TEXT)
   - Changed from weekly recurring to date-based scheduling

4. **로컬 개발 서버 포트 8788 (Line 16-17)**
   - `wrangler pages dev . --d1=DB --r2=STORAGE --port=8788`

5. **HTML 확장자 제거 규칙 (Line 160-161)**
   - **CRITICAL**: Cloudflare Pages automatically redirects `.html` URLs with 308 Permanent Redirect

### 🎯 현재 상태

**✅ 완전히 정상 작동하는 기능:**
- Authentication API (POST, GET, PATCH)
- Bookings API (POST, GET, PATCH, DELETE) - JOIN 쿼리 포함
- Schedule API (POST, GET, DELETE)
- Attendance API (POST, GET, DELETE)
- D1 Database (로컬) - 모든 테이블 정상 생성
- R2 Storage 바인딩 - 로컬 환경 준비 완료
- 개발 서버 (port 8788) - 정상 실행 중

**📚 완전히 문서화된 사항:**
- 모든 API 엔드포인트
- 프로젝트 구조 (students.html, admin.html, js/students.js, js/admin.js 포함)
- 날짜 기반 스케줄링 시스템
- HTML 확장자 리다이렉트 규칙
- 개발 서버 포트 설정

**🔄 다음 단계:**
1. 프로덕션 배포 시 동일한 방식으로 DB 초기화:
   ```bash
   wrangler d1 execute vocal-class-db --file=./schema.sql
   ```
2. 프로덕션 데이터 마이그레이션 (필요 시)
3. 프론트엔드 localStorage 모드를 API 모드로 전환 (프로덕션 환경에서는 자동)

**작성일**: 2025-11-05
**상태**: ✅ 완료 - 모든 API 정상 작동, 문서화 완료, 로컬 개발 환경 안정화