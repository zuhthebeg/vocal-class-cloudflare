# Vocal Class on Cloudflare - 배포 가이드

cocy.io 도메인으로 Cloudflare에 보컬 수업 관리 서비스를 배포하는 전체 가이드입니다.

## 🎯 아키텍처 개요

```
Cloudflare Pages (정적 호스팅) 
  ↓
Pages Functions (서버리스 API)
  ↓
D1 Database (SQLite) + R2 Storage (파일 저장)
```

## 📦 비용 (무료 티어로 시작)

- **Pages**: 무료 (500 빌드/월, 무제한 요청)
- **D1**: 무료 (5GB 저장소, 5백만 읽기/일, 10만 쓰기/일)
- **R2**: 무료 (10GB 저장소, 100만 Class A 요청)
- **도메인**: cocy.io (이미 구매하신 도메인)

합계: **월 $0** (무료 티어 내에서 시작, 트래픽 증가 시 종량제)

## 🚀 1단계: Cloudflare 계정 설정

### 1.1 Wrangler CLI 설치
```bash
npm install -g wrangler

# 로그인
wrangler login
```

### 1.2 계정 ID 확인
```bash
wrangler whoami
```

## 🗄️ 2단계: D1 데이터베이스 생성

```bash
# 프로젝트 디렉토리로 이동
cd vocal-class-cloudflare

# D1 데이터베이스 생성
wrangler d1 create vocal-class-db
```

출력된 `database_id`를 복사하여 `wrangler.toml` 파일의 해당 위치에 붙여넣으세요.

### 2.1 데이터베이스 스키마 초기화
```bash
# 로컬 테스트용
wrangler d1 execute vocal-class-db --local --file=./schema.sql

# 프로덕션 배포
wrangler d1 execute vocal-class-db --file=./schema.sql
```

## 📦 3단계: R2 버킷 생성

```bash
# R2 버킷 생성
wrangler r2 bucket create vocal-class-storage
```

이미 `wrangler.toml`에 설정되어 있으므로 추가 작업 불필요합니다.

## 🔑 4단계 (선택사항): KV 네임스페이스 생성

세션 관리를 위한 KV 스토리지:

```bash
# KV 네임스페이스 생성
wrangler kv:namespace create SESSIONS

# 출력된 id를 wrangler.toml에 추가
```

## 📁 5단계: 정적 파일 배치

기존 프로젝트의 HTML, CSS, JS 파일을 프로젝트 루트에 배치:

```
vocal-class-cloudflare/
├── wrangler.toml
├── schema.sql
├── functions/
│   └── api/
│       ├── attendance.ts
│       ├── schedule.ts
│       ├── bookings.ts
│       └── recordings.ts
├── index.html
├── teacher.html
├── student.html
├── signature.html
├── tools.html
├── css/
│   └── style.css
├── js/
│   ├── auth.js (수정 필요)
│   ├── teacher.js (수정 필요)
│   ├── student.js (수정 필요)
│   └── ... (기타 파일들)
└── images/
```

## 🔧 6단계: JavaScript 파일 수정

기존 `localStorage` 기반 코드를 API 호출로 변경해야 합니다.

### 6.1 예시: `js/signature.js` 수정

```javascript
// 기존 코드 (localStorage)
localStorage.setItem('attendance', JSON.stringify(data));

// 새 코드 (API 호출)
const response = await fetch('/api/attendance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: sessionId,
    studentName: studentName,
    signature: signatureDataUrl,
  }),
});

const result = await response.json();
if (result.ok) {
  alert('출석이 완료되었습니다!');
}
```

### 6.2 예시: `js/teacher.js` 스케줄 저장

```javascript
// 스케줄 저장
const response = await fetch('/api/schedule', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teacherId: currentUser.id,
    schedules: scheduleData,
  }),
});
```

## 🌐 7단계: Pages 프로젝트 배포

### 7.1 Git 저장소 연결 방식 (추천)

```bash
# GitHub에 저장소 생성 후
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/vocal-class.git
git push -u origin main
```

Cloudflare 대시보드에서:
1. Workers & Pages 페이지로 이동
2. "Create application" → "Pages" → "Connect to Git" 선택
3. 저장소 선택 후 배포 설정:
   - **Build command**: (비워두기)
   - **Build output directory**: `/` 또는 `.`
   - **Root directory**: (비워두기)

### 7.2 Direct Upload 방식

```bash
# Pages 프로젝트 생성
wrangler pages project create vocal-class

# 배포
wrangler pages deploy . --project-name=vocal-class
```

## 🔗 8단계: 커스텀 도메인 연결

### 8.1 Cloudflare 대시보드에서

1. Pages 프로젝트 → "Custom domains" 탭
2. "Set up a custom domain" 클릭
3. `cocy.io` 또는 `www.cocy.io` 입력
4. DNS 레코드 자동 설정 확인

### 8.2 서브도메인 사용 (옵션)

다양한 아이디어를 테스트하려면:
- `vocal.cocy.io` - 보컬 수업 관리
- `beta.cocy.io` - 베타 테스트
- `app.cocy.io` - 메인 앱

각 서브도메인마다 별도 Pages 프로젝트 생성 가능!

## 🧪 9단계: 로컬 개발 환경

```bash
# 로컬 개발 서버 실행 (D1, R2 포함)
wrangler pages dev . --d1=DB --r2=STORAGE

# 또는
npm run dev
```

`package.json`에 추가:
```json
{
  "scripts": {
    "dev": "wrangler pages dev . --d1=DB --r2=STORAGE --kv=SESSIONS",
    "deploy": "wrangler pages deploy ."
  }
}
```

## 🔐 10단계: 환경 변수 설정 (선택사항)

민감한 정보가 있다면:

```bash
wrangler pages secret put API_KEY
# 값 입력
```

Functions에서 사용:
```typescript
const apiKey = context.env.API_KEY;
```

## 📊 11단계: 모니터링

Cloudflare 대시보드에서:
- **Analytics**: 트래픽, 요청 수, 에러율
- **Logs**: 실시간 로그 (Tail Workers)
- **D1 Dashboard**: 쿼리 실행 및 데이터 확인

```bash
# 실시간 로그 보기
wrangler pages deployment tail
```

## 🎨 12단계: 추가 최적화

### 12.1 이미지 최적화
Cloudflare Images (유료) 또는 R2 + Image Resizing 사용

### 12.2 캐싱 전략
```typescript
// functions/_middleware.ts
export async function onRequest(context) {
  const response = await context.next();
  
  // 정적 파일 캐싱
  if (context.request.url.endsWith('.css') || 
      context.request.url.endsWith('.js')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000');
  }
  
  return response;
}
```

### 12.3 보안 헤더
```typescript
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('X-XSS-Protection', '1; mode=block');
```

## 🚦 트러블슈팅

### 문제: "Database binding not found"
**해결**: `wrangler.toml`의 `database_id` 확인

### 문제: CORS 오류
**해결**: Functions에 CORS 헤더 추가
```typescript
response.headers.set('Access-Control-Allow-Origin', '*');
```

### 문제: R2 파일 업로드 실패
**해결**: FormData 사용 및 파일 크기 확인 (최대 100MB)

## 📈 확장 계획

1. **인증 추가**: Cloudflare Access 또는 Auth0
2. **실시간 알림**: Durable Objects + WebSocket
3. **이메일 알림**: Mailchannels (무료)
4. **결제 통합**: Stripe
5. **AI 기능**: Workers AI (음성 분석, 피드백)

## 💰 비용 추정 (스케일업 시)

| 사용량 | Pages | D1 | R2 | 합계/월 |
|--------|-------|----|----|---------|
| ~1,000 사용자 | $0 | $0 | $0 | **$0** |
| ~10,000 사용자 | $0 | $5 | $0.90 | **~$6** |
| ~100,000 사용자 | $20 | $50 | $15 | **~$85** |

## 🎉 완료!

배포가 완료되면 `https://vocal-class.pages.dev` (임시) 및 `https://cocy.io`에서 접근 가능합니다.

## 📚 추가 리소스

- [Cloudflare Pages 문서](https://developers.cloudflare.com/pages/)
- [D1 문서](https://developers.cloudflare.com/d1/)
- [R2 문서](https://developers.cloudflare.com/r2/)
- [Workers 예제](https://developers.cloudflare.com/workers/examples/)
