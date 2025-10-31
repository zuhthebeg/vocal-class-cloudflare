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

### 3단계: API 테스트 ✅ **성공!**
- [x] Functions 컴파일 확인 - 모든 API 라우트가 올바르게 설정됨
- [x] D1 및 R2 바인딩 확인 - 로컬 모드에서 정상 바인딩
- [x] /api/test - D1 연결 테스트 성공
- [x] /api/auth - 로그인/회원가입 API 정상 작동 (POST 성공)
- [x] 사용자 생성 및 조회 확인 (총 5명의 사용자 생성됨)

**성공 사례:**
```bash
# 테스트 엔드포인트
curl http://127.0.0.1:8788/api/test
# 응답: {"ok":true,"message":"D1 connection successful",...}

# 인증 엔드포인트
curl -X POST http://127.0.0.1:8788/api/auth \
  -H "Content-Type: application/json" \
  -d '{"name":"NewUser","role":"student"}'
# 응답: {"ok":true,"user":{"id":5,"name":"NewUser","role":"student"}}
```

**해결된 문제:**
- 이전 500 에러는 서버 재시작 및 D1 초기화로 해결됨
- API는 완전히 정상 작동 중

### 4단계: 프론트엔드 통합 (진행 중)
**현재 문제:**
- 정적 파일 제공 이슈: `wrangler pages dev public`에서 정적 파일이 404 반환
- functions 폴더가 프로젝트 루트에 있는데, wrangler가 public 디렉토리에서 실행되면서 찾지 못함

**원인 분석:**
```
프로젝트 구조:
/vocal-class-cloudflare
  /functions       ← wrangler가 여기서 함수를 찾음
    /api
  /public          ← 정적 파일 위치
    index.html
  wrangler.toml

wrangler pages dev public 실행 시:
  - working directory가 public으로 변경됨
  - functions 폴더를 상위 디렉토리에서 찾지 못함
```

**해결 방안:**
1. **임시 해결책 (개발용)**: functions를 public으로 복사 (배포 전 제거)
2. **권장 해결책**: 프로젝트 구조 재설계
   - 옵션 A: public 폴더를 루트로 승격, functions를 public 안으로 이동
   - 옵션 B: 정적 파일을 루트로 이동, public 폴더 제거
3. **배포는 문제없음**: Cloudflare Pages 배포 시에는 `wrangler pages deploy public`으로 public만 배포하며, functions는 자동으로 포함됨

**다음 작업:**
- [ ] 프로젝트 구조 재설계 결정
- [ ] 브라우저에서 전체 플로우 테스트 (API는 작동하므로 curl로 가능)
- [ ] 학생/강사 페이지 기능 테스트

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
