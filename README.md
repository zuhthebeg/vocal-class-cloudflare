# 🎵 Vocal Class on Cloudflare

cocy.io 도메인으로 운영하는 보컬 수업 관리 시스템입니다. Cloudflare의 무료 서비스를 최대한 활용하여 비용 효율적으로 구축되었습니다.

## ✨ 주요 특징

- **완전 무료 시작**: Cloudflare Pages, D1, R2 무료 티어 활용
- **서버리스 아키텍처**: 관리 부담 최소화
- **글로벌 CDN**: 전 세계 어디서나 빠른 접속
- **확장 가능**: 트래픽 증가 시 자동 스케일링
- **PWA 지원**: 오프라인에서도 동작

## 🏗️ 아키텍처

```
┌─────────────────────────────────────┐
│   Cloudflare Pages                  │
│   (정적 호스팅 + PWA)                │
│   - index.html                      │
│   - teacher.html                    │
│   - student.html                    │
│   - signature.html                  │
│   - tools.html                      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Pages Functions (서버리스)         │
│   - /api/attendance                 │
│   - /api/schedule                   │
│   - /api/bookings                   │
│   - /api/recordings                 │
└─────────────────────────────────────┘
              ↓
┌─────────────────┬───────────────────┐
│   D1 Database   │   R2 Storage      │
│   (SQLite)      │   (Object Store)  │
│   - 사용자       │   - 서명 이미지    │
│   - 스케줄       │   - 녹음 파일      │
│   - 예약         │                   │
│   - 출석         │                   │
└─────────────────┴───────────────────┘
```

## 💰 비용 분석

### 무료 티어 (월 기준)
- **Cloudflare Pages**: 무제한 요청, 500 빌드
- **D1 Database**: 5GB 저장소, 5백만 읽기, 10만 쓰기
- **R2 Storage**: 10GB 저장소, 100만 요청

### 예상 사용량별 비용
| 활성 사용자 | 월 비용 | 설명 |
|------------|--------|------|
| ~1,000명 | **$0** | 완전 무료 |
| ~10,000명 | **~$5** | D1 초과 요금만 |
| ~100,000명 | **~$85** | 모든 서비스 종량제 |

## 🚀 빠른 시작

### 1. 사전 요구사항
```bash
# Node.js 18+ 설치 확인
node --version

# Wrangler CLI 설치
npm install -g wrangler
```

### 2. 빠른 배포
```bash
# 저장소 클론
git clone <your-repo-url>
cd vocal-class-cloudflare

# 의존성 설치
npm install

# 자동 배포 스크립트 실행
./deploy.sh
```

### 3. 수동 배포 (더 세밀한 제어)

#### 3-1. Cloudflare 로그인
```bash
wrangler login
```

#### 3-2. D1 데이터베이스 생성
```bash
wrangler d1 create vocal-class-db
# 출력된 database_id를 wrangler.toml에 복사
```

#### 3-3. 스키마 초기화
```bash
wrangler d1 execute vocal-class-db --file=./schema.sql
```

#### 3-4. R2 버킷 생성
```bash
wrangler r2 bucket create vocal-class-storage
```

#### 3-5. 배포
```bash
# Direct Upload
wrangler pages deploy . --project-name=vocal-class

# 또는 Git 연결 (Cloudflare 대시보드에서)
```

## 📁 프로젝트 구조

```
vocal-class-cloudflare/
├── wrangler.toml              # Cloudflare 설정
├── schema.sql                 # D1 데이터베이스 스키마
├── package.json               # NPM 설정
├── tsconfig.json              # TypeScript 설정
├── deploy.sh                  # 자동 배포 스크립트
│
├── functions/                 # Pages Functions (API)
│   └── api/
│       ├── attendance.ts      # 출석 API
│       ├── schedule.ts        # 스케줄 API
│       ├── bookings.ts        # 예약 API
│       └── recordings.ts      # 녹음 API
│
├── index.html                 # 로그인 페이지
├── teacher.html               # 강사 페이지
├── student.html               # 수강생 페이지
├── signature.html             # 서명/출석 페이지
├── tools.html                 # 수업 도구 페이지
│
├── css/                       # 스타일시트
├── js/                        # JavaScript 파일
│   ├── auth.js
│   ├── teacher.js
│   ├── student.js
│   ├── signature.js
│   └── ...
│
└── images/                    # 이미지 파일
```

## 🔧 로컬 개발

```bash
# 로컬 개발 서버 실행 (D1, R2 포함)
npm run dev

# 브라우저에서 http://localhost:8788 접속
```

## 📚 문서

- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: 상세 배포 가이드
- **[MIGRATION.md](./MIGRATION.md)**: localStorage → API 마이그레이션 가이드

## 🎯 주요 기능

### 강사 기능
- ✅ 주간 가능 시간 설정
- ✅ 예약 현황 확인
- ✅ QR 코드 출석 체크
- ✅ 수업 도구 (드로잉, 녹음, 예시 영상)

### 수강생 기능
- ✅ 강사 스케줄 확인
- ✅ 수업 예약
- ✅ 출석 서명
- ✅ 예약 내역 확인

### 공통 기능
- ✅ 드로잉 보드 (실시간 판서)
- ✅ 녹음기 (수업 녹음)
- ✅ 예시 영상 관리
- ✅ PWA (오프라인 지원)

## 🔐 보안

- HTTPS 자동 적용
- 세션 기반 인증
- CORS 설정
- XSS/CSRF 방어

## 🌐 커스텀 도메인 연결

### cocy.io 도메인 설정
1. Cloudflare 대시보드 → Pages 프로젝트 선택
2. "Custom domains" 탭
3. "Set up a custom domain" 클릭
4. `cocy.io` 또는 `www.cocy.io` 입력
5. DNS 자동 설정 확인

### 서브도메인 활용 (다양한 아이디어 테스트)
- `vocal.cocy.io` - 보컬 수업
- `beta.cocy.io` - 베타 테스트
- `app.cocy.io` - 메인 앱
- `api.cocy.io` - API 전용

## 📊 모니터링

### Cloudflare 대시보드
- **Analytics**: 트래픽, 성능 지표
- **Logs**: 실시간 로그
- **D1 Dashboard**: SQL 쿼리 실행

### CLI로 실시간 로그 보기
```bash
wrangler pages deployment tail
```

## 🐛 트러블슈팅

### 일반적인 문제

**Q: "Database binding not found" 오류**
```bash
# wrangler.toml에 database_id가 올바르게 설정되었는지 확인
# 없다면 다시 생성
wrangler d1 create vocal-class-db
```

**Q: CORS 오류 발생**
```typescript
// functions/_middleware.ts 추가
export async function onRequest(context) {
    const response = await context.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
}
```

**Q: R2 파일 업로드 실패**
- FormData 사용 확인
- 파일 크기 제한 (최대 100MB)
- 버킷 이름 확인

## 🔄 업데이트 및 배포

```bash
# 변경사항 커밋
git add .
git commit -m "Update features"
git push

# Git 연결 시 자동 배포
# 또는 수동 배포
npm run deploy
```

## 📈 향후 확장 계획

### Phase 1: 기본 기능 (현재)
- ✅ 스케줄 관리
- ✅ 예약 시스템
- ✅ 출석 체크
- ✅ 수업 도구

### Phase 2: 고급 기능
- [ ] 실시간 알림 (Durable Objects + WebSocket)
- [ ] 이메일 알림 (Mailchannels)
- [ ] 결제 연동 (Stripe)
- [ ] 화상 수업 (WebRTC)

### Phase 3: AI 기능
- [ ] Workers AI 음성 분석
- [ ] 자동 피드백 생성
- [ ] 발음 교정 추천
- [ ] 진도 추적 및 분석

## 🤝 기여

이슈와 PR을 환영합니다!

## 📄 라이선스

MIT License

## 💬 지원

- 📧 Email: your-email@example.com
- 💬 Discord: [커뮤니티 링크]
- 📖 문서: [docs.cocy.io]

---

**Made with ❤️ using Cloudflare**
