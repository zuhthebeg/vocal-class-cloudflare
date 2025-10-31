# Cloudflare Functions 수정 사항

## 문제점 분석 (2025-10-31)

### 1. D1 데이터베이스 미초기화
**증상:**
```
D1_ERROR: no such table: users: SQLITE_ERROR
```

**원인:**
- 로컬 D1 데이터베이스에 schema.sql이 실행되지 않음
- functions/api/*.ts 파일들이 users, schedules, bookings 등의 테이블에 접근하지만 테이블이 존재하지 않음

**해결:**
```bash
# 로컬 D1 초기화
wrangler d1 execute vocal-class-db --local --file=./schema.sql

# 프로덕션 D1 초기화 (배포 시)
wrangler d1 execute vocal-class-db --file=./schema.sql
```

**영향받는 파일:**
- `functions/api/auth.ts` - users 테이블 사용
- `functions/api/schedule.ts` - schedules, bookings 테이블 사용
- `functions/api/bookings.ts` - bookings, users 테이블 사용
- `functions/api/attendance.ts` - attendances, users 테이블 사용
- `functions/api/recordings.ts` - recordings, users 테이블 사용

---

### 2. R2 바인딩 비활성화
**위치:** `wrangler.toml:12-14`

**원인:**
```toml
# R2 버킷 바인딩 (녹음파일, 서명 이미지 저장)
#[[r2_buckets]]
#binding = "STORAGE"
#bucket_name = "vocal-class-storage"
```

**문제:**
- `functions/api/attendance.ts`와 `functions/api/recordings.ts`가 `env.STORAGE`를 사용
- R2 바인딩이 없으면 런타임 에러 발생

**해결:**
```toml
# R2 버킷 바인딩 (녹음파일, 서명 이미지 저장)
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "vocal-class-storage"
```

**추가 작업:**
```bash
# 로컬 개발시에는 자동으로 로컬 R2 에뮬레이터 사용
# 프로덕션 배포 전 R2 버킷 생성 필요
wrangler r2 bucket create vocal-class-storage
```

---

### 3. auth.js의 포트 감지 문제
**위치:** `public/js/auth.js:26`

**원인:**
```javascript
const isDevelopmentPort = ['3000', '8000', '8080', '5000', '5500'].includes(window.location.port);
```
- wrangler pages dev의 기본 포트 8788이 개발 포트 목록에 없음
- 포트 8788에서 실행 시 API를 호출하지 않고 localStorage만 사용

**결과:**
- 콘솔 메시지: "🔧 개발 모드: API 없이 localStorage만 사용합니다."
- API 엔드포인트가 호출되지 않아 functions 테스트 불가

**해결:**
```javascript
const isDevelopmentPort = ['3000', '8000', '8080', '5000', '5500', '8788'].includes(window.location.port);
```

**영향받는 파일:**
- `public/js/auth.js` - 로그인/회원가입
- `public/js/student.js` - 학생 예약 시스템 (동일한 패턴 사용)
- `public/js/teacher.js` - 강사 스케줄 관리 (동일한 패턴 사용)

---

### 4. compatibility_date 설정 문제
**위치:** `wrangler.toml:2`

**경고 메시지:**
```
[wrangler:warn] The latest compatibility date supported by the installed
Cloudflare Workers Runtime is "2025-10-11", but you've requested "2025-10-28".
Falling back to "2025-10-11"...
```

**원인:**
- 설정된 날짜가 설치된 wrangler 버전에서 지원하지 않음

**해결:**
```toml
compatibility_date = "2025-10-11"
```

---

## 수정 작업 순서

### 1단계: 설정 파일 수정
- [x] wrangler.toml - compatibility_date 수정
- [x] wrangler.toml - R2 바인딩 활성화
- [x] public/js/auth.js - wrangler dev 포트 8788에서 API 사용하도록 수정

### 2단계: 데이터베이스 초기화
- [x] 로컬 D1 데이터베이스 스키마 적용 (`wrangler d1 execute vocal-class-db --local --file=./schema.sql`)
- [x] 데이터베이스 테이블 생성 확인 (users, schedules, bookings, attendances, recordings, example_videos)

### 3단계: API 테스트 (진행 중)
- [x] Functions 컴파일 확인 - 모든 API 라우트가 올바르게 설정됨
- [x] D1 및 R2 바인딩 확인 - 로컬 모드에서 정상 바인딩
- [ ] /api/auth - 500 에러 발생 원인 조사 필요
- [ ] /api/schedule - 테스트 대기
- [ ] /api/bookings - 테스트 대기

**현재 문제:**
- API 호출 시 500 Internal Server Error 발생
- wrangler 로그에 에러 상세 내용이 표시되지 않음
- functions는 정상적으로 컴파일되고 라우팅도 올바르게 설정됨
- D1 데이터베이스 테이블도 정상적으로 생성됨

**다음 디버깅 단계:**
1. functions/api/auth.ts에 console.log 추가하여 함수가 호출되는지 확인
2. wrangler 로그 파일 직접 확인 (`C:\Users\zuhth\AppData\Roaming\xdg.config\.wrangler\logs\`)
3. 간단한 테스트 함수 작성하여 D1 연결 테스트
4. TypeScript 타입 에러 확인

### 4단계: 프론트엔드 통합 테스트 (대기)
- [ ] 브라우저에서 로그인 테스트
- [ ] 학생 페이지에서 예약 테스트
- [ ] 강사 페이지에서 스케줄 관리 테스트

---

## 배포 전 체크리스트

### 로컬 개발 환경
- [x] wrangler.toml 설정 확인
- [ ] `wrangler d1 execute vocal-class-db --local --file=./schema.sql` 실행
- [ ] `wrangler pages dev public --port=8788` 실행
- [ ] http://127.0.0.1:8788 에서 기능 테스트

### 프로덕션 배포
- [ ] R2 버킷 생성: `wrangler r2 bucket create vocal-class-storage`
- [ ] D1 데이터베이스 초기화: `wrangler d1 execute vocal-class-db --file=./schema.sql`
- [ ] Pages 프로젝트 배포: `wrangler pages deploy public`
- [ ] 배포된 URL에서 기능 테스트

---

## 추가 개선 사항 (선택사항)

### 1. wrangler 버전 업그레이드
```bash
npm install -D wrangler@latest
```

### 2. package.json 스크립트 개선
```json
{
  "scripts": {
    "dev": "wrangler pages dev public --port=8788",
    "db:init:local": "wrangler d1 execute vocal-class-db --local --file=./schema.sql",
    "db:init:prod": "wrangler d1 execute vocal-class-db --file=./schema.sql",
    "deploy": "wrangler pages deploy public"
  }
}
```

### 3. 환경 변수 관리
- `.dev.vars` 파일에 개발 환경 변수 추가 (이미 .dev.vars.example 존재)

---

## 참고 문서
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Cloudflare D1 Database](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Storage](https://developers.cloudflare.com/r2/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
