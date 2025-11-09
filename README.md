# Class.cocy.io - AI 기반 종합 교육 플랫폼

> **"강사에게 AI 매니저를 붙여주는 개인 레슨 플랫폼"**

**보컬, PT, 드로잉, 악기 등 다양한 1:1 수업을 지원하는 AI 기반 종합 교육 매칭 플랫폼**

보컬 클래스 시스템에서 시작하여 모든 종류의 개인 레슨을 연결하는 **B2C 마켓플레이스**와 **B2B 강사 관리 시스템**으로 확장하고 있습니다. 강사의 프로필 정보를 기반으로 **AI 상담 챗봇**을 자동 생성하여 수강생이 24시간 자연어로 문의할 수 있습니다.

---

## 🎯 프로젝트 비전

### B2C: 수강생 포털 + AI 상담 챗봇
- 다양한 카테고리의 강사 검색 및 매칭
- **AI 챗봇을 통한 24시간 자동 상담** (Gemini/GPT 연동)
- 실시간 예약 및 출석 관리
- 리뷰 및 평점 시스템
- 수업 도구 (드로잉, 녹음, 예시 영상)

### B2B: 강사 어드민 대시보드
- 일정 관리 및 가용 시간 설정
- 수강생 관리 (출석, 결제, 노트)
- **AI 챗봇 프로필 관리** (자기소개, 경력, 수업료 → 자동 프롬프트 생성)
- 상담 로그 및 통계 (자주 묻는 질문, 전환율)
- 수입 통계 및 정산 내역

---

## 🚀 현재 개발 상태

### ✅ 완료된 기능 (Phase 1)

#### 데이터베이스 & 백엔드
- [x] Cloudflare D1 (SQLite) 데이터베이스 구축
- [x] Cloudflare R2 (S3) 스토리지 연동
- [x] TypeScript 기반 Pages Functions API
- [x] 멀티 카테고리 지원 (보컬, PT, 드로잉, 피아노, 기타, 요가)
- [x] 강사 프로필 시스템
- [x] 리뷰 및 평점 시스템
- [x] 예약 및 출석 관리

#### 프론트엔드
- [x] 로그인 시스템 (임시 이름 기반)
- [x] 강사 대시보드 (스케줄, 예약, 출석)
- [x] 수강생 대시보드 (강사 검색, 예약)
- [x] 강사 프로필 편집 페이지
- [x] 강사 프로필 조회 페이지
- [x] 리뷰 작성 모달
- [x] 캔버스 기반 출석 서명
- [x] 수업 도구 (드로잉, 녹음, 예시 영상)
- [x] PWA 지원 (오프라인, 알림)

---

## ⚙️ AI 챗봇 개발 플로우

1. **강사 프로필 작성** → 자기소개, 경력, 수업료, FAQ 입력
2. **Gemini 프롬프트 자동 생성** → 프로필 데이터 기반 시스템 프롬프트 생성
3. **수강생 상담 챗봇 세션 시작** → 강사 프로필 페이지에서 채팅창 오픈
4. **LLM 응답 스트리밍** → Cloudflare Worker를 통해 실시간 응답 전달
5. **상담 로그 저장 및 분석** (옵션) → 자주 묻는 질문, 예약 전환율 추적

---

## 🧭 로드맵

> **2단계 전략**: 현재 구조로 MVP 검증 → 멀티테넌시 기반 V2로 재설계

### Phase 0: MVP 검증 (V1 - 현재 구조)

| 단계 | 목표 | 설명 | 기간 |
|-------|------|------|------|
| **v0.1** | AI 상담 챗봇 MVP | 기본 강사 등록 + Gemini 연동 + 24시간 자동 상담 | 1주 |
| **v0.2** | 핵심 기능 안정화 | 예약, 출석, 리뷰 시스템 완성 | 1주 |
| **v0.3** | 사용자 피드백 수집 | 실제 사용자 테스트 및 개선 | 1주 |

**목적**: AI 챗봇 및 핵심 기능 빠르게 검증 (총 2-3주)

---

### Phase 1+: V2 재설계 (멀티테넌시 플랫폼)

| 단계 | 목표 | 설명 | 기간 |
|-------|------|------|------|
| **v2.0 설계** | 멀티테넌시 아키텍처 | 도메인별 격리, 다중 역할 시스템 설계 | 1주 |
| **v2.1 코어** | 플랫폼 인프라 구축 | 테넌트 시스템, 다중 역할, 플러그인 구조 | 2주 |
| **v2.2 마이그레이션** | V1 → V2 데이터 이전 | 기존 기능 이전 및 검증 | 1주 |
| **v2.3 확장** | 새로운 도메인 추가 | 교육 외 도메인 (게임, 요리, 숙박 등) | 진행중 |

**목적**: 확장 가능한 멀티 도메인 플랫폼 (총 4-5주)

---

### 주요 변경사항 (V1 → V2)

| 항목 | V1 (현재) | V2 (멀티테넌시) |
|------|----------|----------------|
| **유저 역할** | 단일 역할 (강사 or 수강생) | 다중 역할 (강사+수강생 동시 가능) |
| **도메인** | 교육 전용 (보컬, PT 등) | 완전히 다른 비즈니스 모델 지원 |
| **데이터 격리** | 단일 DB | 테넌트별 격리 (tenant_id) |
| **확장성** | 카테고리 추가만 가능 | 도메인별 플러그인 구조 |
| **예시 도메인** | 보컬, PT, 드로잉, 요가 | + 게임 코칭, 요리 클래스, 숙박 예약 등 |

### 상세 로드맵 (EXPANSION_PLAN.md 참고)

### Phase 2: 수강생 포털 구축 🛒
**목표**: 강사 탐색 및 예약 마켓플레이스

- [ ] 포털 메인 페이지 (`portal.html`)
  - [ ] 카테고리별 필터 UI
  - [ ] 검색 바 (수업명, 강사명)
  - [ ] 정렬 옵션 (평점순, 가격순)
  - [ ] 강사 카드 그리드 레이아웃
- [ ] 강사 상세 페이지 확장
  - [ ] 리뷰 목록 및 평점
  - [ ] 수업 일정 미리보기
- [ ] 내 수업 관리 페이지 (학생용)
- [ ] 즐겨찾기/팔로우 기능

### Phase 3: B2C 포털 디자인 시스템 🎨
**목표**: 모던하고 따뜻한 미니멀 디자인

- [ ] TailwindCSS 기반 디자인 시스템 구축
- [ ] 디자인 톤앤매너 정의
  - **스타일**: 모던 미니멀리즘
  - **컬러**: 웜톤 (따뜻한 베이지, 코랄, 소프트 브라운)
  - **타이포그래피**: 깔끔한 산세리프 폰트
  - **레이아웃**: 여백을 활용한 심플한 구성
- [ ] 컴포넌트 라이브러리 제작
  - [ ] 카드 (강사, 수업)
  - [ ] 버튼 (Primary, Secondary, Ghost)
  - [ ] 폼 요소 (Input, Select, Textarea)
  - [ ] 모달 및 드로어
  - [ ] 토스트 알림
- [ ] 반응형 디자인 (모바일 우선)
- [ ] 다크 모드 지원 (옵션)

### Phase 4: B2B 강사 어드민 대시보드 📊
**목표**: 강사를 위한 전문 관리 도구

- [ ] 어드민 대시보드 메인 (`admin-teacher.html`)
  - [ ] 오늘의 수업 요약 카드
  - [ ] 이번 주 수입 통계
  - [ ] 최근 리뷰 피드
  - [ ] 예약 승인 대기 목록
- [ ] 수강생 관리 페이지 확장
  - [ ] 수강생별 출석률 차트
  - [ ] 결제 내역 및 미수금 추적
  - [ ] 개인 노트 작성 기능
  - [ ] 수강생별 진도 관리
- [ ] 일정 관리 고도화
  - [ ] 캘린더 뷰 (주간/월간)
  - [ ] 반복 일정 설정
  - [ ] 휴무일 관리
  - [ ] 일정 충돌 방지
- [ ] 수업 관리
  - [ ] 수업 패키지 생성 (5회, 10회)
  - [ ] 수업별 자료 업로드 (PDF, 이미지)
  - [ ] 수업 템플릿 저장
- [ ] 정산 시스템
  - [ ] 월별 수입 리포트
  - [ ] 플랫폼 수수료 내역
  - [ ] 정산 신청 및 진행 상태
- [ ] 프로필 분석
  - [ ] 프로필 조회수
  - [ ] 예약 전환율
  - [ ] 평점 변화 추이

### Phase 5: 위치 기반 서비스 📍
- [ ] 내 주변 강사 찾기
- [ ] 지도 UI (Naver/Kakao Map)
- [ ] 거리순 정렬

### Phase 6: 결제 시스템 💳
- [ ] Toss Payments 연동
- [ ] 예약 시 결제 처리
- [ ] 강사 정산 자동화
- [ ] 환불 처리

### Phase 7: 고급 기능 ⚡
- [ ] 실시간 채팅 (Durable Objects)
- [ ] 수업 패키지 할인
- [ ] 친구 초대 이벤트
- [ ] 화상 수업 지원 (WebRTC)
- [ ] 모바일 앱 개발

### Phase 8: 커뮤니티 & 성장 🌱
- [ ] Q&A 게시판
- [ ] 학습 진도 추적
- [ ] 배지/업적 시스템
- [ ] 블로그 (강사 팁 공유)

### Phase 9: 인증 및 보안 (최종) 🔒
- [ ] 이메일/비밀번호 인증
- [ ] 소셜 로그인 (Google, Kakao, Naver)
- [ ] JWT 토큰 기반 세션 관리
- [ ] CSRF, Rate Limiting, XSS 방지

---

## 🛠️ 기술 스택

### Frontend
- **Framework**: Vanilla JavaScript (향후 React/Vue 고려)
- **Styling**: TailwindCSS (웜톤 미니멀 디자인)
- **UI Components**: Custom component library
- **PWA**: Service Worker, Web App Manifest

### Backend
- **Platform**: Cloudflare Pages Functions (Serverless)
- **Language**: TypeScript
- **Database**: Cloudflare D1 (SQLite-based)
- **Storage**: Cloudflare R2 (S3-compatible)

### APIs & Services
- **Payment**: Toss Payments (예정)
- **Maps**: Naver/Kakao Map API (예정)
- **Email**: Resend/SendGrid (예정)
- **Realtime**: Cloudflare Durable Objects (예정)

### Development Tools
- **CLI**: Wrangler (Cloudflare Pages 개발 서버)
- **Version Control**: Git/GitHub
- **Deployment**: Cloudflare Pages (자동 배포)

---

## ⚙️ 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- npm 또는 pnpm
- Cloudflare 계정 (무료)

### 로컬 개발 시작하기

1. **프로젝트 클론**
   ```bash
   git clone https://github.com/your-username/vocal-class-cloudflare.git
   cd vocal-class-cloudflare
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **Wrangler 로그인**
   ```bash
   npx wrangler login
   ```

4. **D1 데이터베이스 생성 (최초 1회)**
   ```bash
   npx wrangler d1 create vocal-class-db
   # 출력된 database_id를 wrangler.toml의 [[d1_databases]] 섹션에 추가
   ```

5. **R2 버킷 생성 (최초 1회)**
   ```bash
   npx wrangler r2 bucket create vocal-class-storage
   ```

6. **데이터베이스 초기화**
   ```bash
   npx wrangler d1 execute vocal-class-db --local --file=./schema.sql
   ```

7. **카테고리 시드 데이터 추가**
   ```bash
   npx wrangler d1 execute vocal-class-db --local --command \
   "INSERT INTO lesson_categories (name, icon, description) VALUES
   ('보컬', '🎤', '보컬 트레이닝'),
   ('PT', '💪', '개인 트레이닝'),
   ('드로잉', '🎨', '그림 그리기'),
   ('피아노', '🎹', '피아노 레슨'),
   ('기타', '🎸', '기타 레슨'),
   ('요가', '🧘', '요가 수업');"
   ```

8. **개발 서버 실행 (포트 8788 필수!)**
   ```bash
   npx wrangler pages dev . --port=8788
   ```

9. **브라우저 접속**
   ```
   http://localhost:8788
   ```

### 주요 명령어

```bash
# 개발 서버 실행
npm run dev
# 또는
npx wrangler pages dev . --port=8788

# 데이터베이스 쿼리 실행 (로컬)
npx wrangler d1 execute vocal-class-db --local --command "SELECT * FROM users"

# 데이터베이스 리셋 (개발 중 자유롭게 가능)
npx wrangler d1 execute vocal-class-db --local --file=./schema.sql

# 프로덕션 배포
npm run deploy
# 또는
npx wrangler pages deploy .

# 실시간 로그 확인
npx wrangler pages deployment tail
```

---

## 📂 프로젝트 구조

```
.
├── functions/api/              # Cloudflare Pages Functions (API)
│   ├── auth.ts                # 인증 (로그인, 사용자 조회)
│   ├── attendance.ts          # 출석 관리 (서명 → R2)
│   ├── bookings.ts            # 예약 관리
│   ├── schedule.ts            # 강사 일정 관리
│   ├── recordings.ts          # 녹음 파일 관리
│   ├── categories.ts          # 카테고리 CRUD
│   ├── reviews.ts             # 리뷰 시스템
│   └── teachers/
│       └── profile.ts         # 강사 프로필 관리
│
├── js/                        # 프론트엔드 JavaScript
│   ├── auth.js               # 인증 로직
│   ├── teacher.js            # 강사 대시보드
│   ├── student.js            # 수강생 대시보드
│   ├── students.js           # 수강생 관리 (강사용)
│   ├── admin.js              # 어드민 페이지
│   ├── signature.js          # 출석 서명
│   ├── drawing.js            # 드로잉 보드
│   ├── recorder.js           # 녹음기
│   ├── examples.js           # 예시 영상 관리
│   └── components.js         # 공통 컴포넌트
│
├── css/
│   ├── style.css             # 전역 스타일
│   └── components.css        # 컴포넌트 스타일
│
├── index.html                # 로그인 페이지
├── teacher.html              # 강사 대시보드
├── student.html              # 수강생 대시보드
├── students.html             # 수강생 관리 페이지
├── admin.html                # 어드민 대시보드
├── signature.html            # 출석 서명 페이지
├── tools.html                # 수업 도구 페이지
├── profile-edit.html         # 강사 프로필 편집
├── teacher-profile-view.html # 강사 프로필 조회
│
├── schema.sql                # D1 데이터베이스 스키마
├── wrangler.toml             # Cloudflare 설정
├── manifest.json             # PWA 매니페스트
├── service-worker.js         # PWA 서비스 워커
│
├── CLAUDE.md                 # 프로젝트 개요 (개발자용)
├── EXPANSION_PLAN.md         # 확장 계획 로드맵
├── QUICKSTART.md             # 5분 빠른 시작 가이드
├── DEPLOYMENT.md             # 배포 가이드
├── MIGRATION.md              # localStorage → API 마이그레이션
└── WORK_LOG.md               # 개발 히스토리
```

---

## 🎨 디자인 가이드라인 (예정)

### B2C 포털 디자인 시스템

**컬러 팔레트 (웜톤 미니멀)**
- Primary: `#E8C4A0` (베이지)
- Secondary: `#F4A582` (코랄)
- Accent: `#C19A6B` (소프트 브라운)
- Background: `#FAFAF8` (오프화이트)
- Text: `#4A4A4A` (다크 그레이)

**타이포그래피**
- Heading: Pretendard/Inter (Bold)
- Body: Pretendard/Inter (Regular)
- Font Size: 14px base, 1.5 scale ratio

**컴포넌트 스타일**
- Border Radius: 12px (카드), 8px (버튼)
- Shadow: Soft, subtle shadows
- Spacing: 8px grid system
- Animation: Subtle, smooth transitions (200-300ms)

---

## 📊 데이터베이스 스키마

주요 테이블:
- `users` - 사용자 (강사/수강생)
- `lesson_categories` - 수업 카테고리
- `teacher_profiles` - 강사 프로필 (bio, 경력, 수업료, 평점)
- `schedules` - 강사 가용 일정 (특정 날짜 기반)
- `bookings` - 예약 내역
- `attendances` - 출석 기록 (서명 이미지 URL)
- `reviews` - 리뷰 및 평점
- `recordings` - 녹음 파일 메타데이터

자세한 스키마는 `schema.sql` 파일 참고.

---

## 🔐 보안 및 인증

**현재 (개발 단계)**
- 임시 이름 기반 인증 (개발 편의성)
- localStorage 세션 관리

**향후 (Phase 9)**
- 이메일/비밀번호 인증
- OAuth 2.0 (Google, Kakao, Naver)
- JWT 토큰 기반 세션
- CSRF 보호
- Rate Limiting
- XSS/SQL Injection 방지

---

## 📖 참고 문서

- [EXPANSION_PLAN.md](./EXPANSION_PLAN.md) - 전체 확장 로드맵
- [CLAUDE.md](./CLAUDE.md) - 개발자 가이드
- [QUICKSTART.md](./QUICKSTART.md) - 5분 빠른 시작
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 프로덕션 배포 가이드
- [MIGRATION.md](./MIGRATION.md) - localStorage → API 마이그레이션
- [WORK_LOG.md](./WORK_LOG.md) - 개발 히스토리

---

## 🔒 개인정보 및 윤리 정책

### AI 챗봇 사용 시 개인정보 보호

- **제한된 범위 응답**: 챗봇은 강사가 제공한 프로필 정보 내에서만 답변하도록 제한
- **개인정보 비포함**: 사용자의 개인정보(이름, 연락처, 결제정보 등)는 LLM 입력에 포함하지 않음
- **상담 로그 비식별화**: 상담 내역은 비식별화 후 통계 목적으로만 활용
- **투명성**: 챗봇이 AI임을 명시하고, 중요한 결정은 강사 본인에게 확인 권장
- **데이터 보관**: 상담 로그는 90일 후 자동 삭제 (통계 데이터는 익명화하여 보관)

### GDPR 및 개인정보보호법 준수

- 사용자 동의 없는 데이터 수집 금지
- 언제든지 데이터 삭제 요청 가능
- 제3자 제공 시 사전 고지 및 동의

---

## 🤝 기여하기

이 프로젝트는 현재 개발 중입니다. 기여를 원하시면:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🧑‍💻 기여자

| 역할 | 이름 / 핸들 |
|------|--------------|
| 기획 / 개발 | [@cocy](https://class.cocy.io) |
| AI 설계 지원 | Claude Code (Anthropic) |

---

## 📄 라이선스

MIT License
Copyright (c) 2025 cocy

---

## 📞 문의

프로젝트 관련 문의사항은 GitHub Issues를 통해 남겨주세요.

---

**마지막 업데이트**: 2025-11-08
**현재 Phase**: Phase 0 - MVP 검증 (v0.1 AI 챗봇 준비 중)
**다음 Phase**: Phase 1+ - V2 재설계 (멀티테넌시 플랫폼)
**장기 비전**: 교육을 넘어 모든 도메인을 지원하는 확장 가능한 플랫폼
