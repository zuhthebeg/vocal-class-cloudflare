# ⚡ 5분 빠른 시작 가이드

cocy.io로 보컬 수업 관리 서비스를 **5분 안에** 배포하는 방법입니다.

## 🎯 목표
- Cloudflare에 서비스 배포
- D1 데이터베이스 생성
- R2 스토리지 설정
- cocy.io 도메인 연결

## ⏱️ 1분: 준비

```bash
# 1. Node.js 확인 (18+ 필요)
node --version

# 2. Wrangler 설치
npm install -g wrangler

# 3. Cloudflare 로그인
wrangler login
```

## ⏱️ 2분: 데이터베이스 & 스토리지

```bash
# 프로젝트로 이동
cd vocal-class-cloudflare

# D1 데이터베이스 생성
wrangler d1 create vocal-class-db

# ⚠️ 출력된 database_id를 복사하여 wrangler.toml 파일에 붙여넣기
# vim wrangler.toml (또는 편집기로 열기)

# 스키마 초기화
wrangler d1 execute vocal-class-db --file=./schema.sql

# R2 버킷 생성
wrangler r2 bucket create vocal-class-storage
```

## ⏱️ 1분: 배포

```bash
# 의존성 설치 (처음 한 번만)
npm install

# 배포!
wrangler pages deploy . --project-name=vocal-class
```

## ⏱️ 1분: 도메인 연결

### 방법 1: 대시보드 사용 (추천)
1. https://dash.cloudflare.com 접속
2. Workers & Pages → vocal-class 프로젝트 선택
3. "Custom domains" 탭 → "Set up a custom domain"
4. `cocy.io` 입력 → 자동 설정 완료!

### 방법 2: CLI 사용
```bash
wrangler pages deployment tail
# 배포 URL 확인 후 대시보드에서 도메인 연결
```

## ✅ 완료!

이제 다음 주소에서 접속 가능합니다:
- **임시 URL**: https://vocal-class.pages.dev
- **커스텀 도메인**: https://cocy.io (설정 후)

## 🎨 다음 단계

### 즉시 가능한 것들
1. ✅ 로그인 (강사/수강생)
2. ✅ 스케줄 설정 (강사)
3. ✅ 수업 예약 (수강생)
4. ✅ 출석 체크
5. ✅ 드로잉 보드 사용

### 코드 수정 필요
기존 `localStorage` 기반 JS 파일들을 API 호출로 변경:

**우선순위 1**: auth.js
```bash
# MIGRATION.md 파일 참고
vim js/auth.js
```

**우선순위 2**: signature.js (출석 기능)
```bash
vim js/signature.js
```

**우선순위 3**: teacher.js, student.js
```bash
vim js/teacher.js
vim js/student.js
```

전체 마이그레이션 가이드는 `MIGRATION.md` 참고!

## 💡 개발 팁

### 로컬 테스트
```bash
# 로컬 개발 서버 (Hot reload)
npm run dev

# 브라우저: http://localhost:8788
```

### 로그 확인
```bash
# 실시간 로그
wrangler pages deployment tail

# D1 쿼리 실행
wrangler d1 execute vocal-class-db --command "SELECT * FROM users"
```

### 빠른 재배포
```bash
npm run deploy
```

## 🚨 문제 발생 시

### "database_id not found"
→ wrangler.toml에 database_id 제대로 입력했는지 확인

### CORS 오류
→ functions/_middleware.ts 파일 추가 필요 (MIGRATION.md 참고)

### 파일 업로드 안됨
→ R2 버킷 이름 확인 (vocal-class-storage)

## 📊 비용 확인

```bash
# Cloudflare 대시보드에서
# Analytics → Usage 확인

# 무료 티어:
# - Pages: 무제한
# - D1: 5GB, 5M reads/day
# - R2: 10GB, 1M requests/month
```

## 🎉 축하합니다!

5분 만에 서버리스 풀스택 앱을 배포했습니다!

### 다음에 할 일
- [ ] 기존 JS 파일들 API로 마이그레이션
- [ ] 사용자 피드백 수집
- [ ] 추가 기능 개발 (MIGRATION.md 참고)
- [ ] 모니터링 설정

### 다른 아이디어 테스트하기
새 프로젝트를 또 만들고 싶다면:

```bash
# 새 프로젝트 생성
mkdir my-new-idea
cd my-new-idea
wrangler pages project create my-new-idea

# 서브도메인 활용
# idea1.cocy.io
# idea2.cocy.io
# ...
```

**무료 티어 내에서 여러 프로젝트를 동시에 운영 가능합니다!**

---

궁금한 점이 있다면:
- 📖 README.md (전체 문서)
- 🚀 DEPLOYMENT.md (상세 배포 가이드)
- 🔄 MIGRATION.md (코드 마이그레이션)
