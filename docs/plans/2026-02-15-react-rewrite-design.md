# Class.cocy.io React Rewrite - Design Plan

## 목표
현재 HTML 멀티페이지 앱을 React SPA로 리라이트. 비즈니스 레벨 UX/UI + 모델 교체 가능한 AI 챗봇.

## 스택
- **React 19 + Vite + TypeScript**
- **Tailwind CSS v4 + shadcn/ui** (비즈니스급 컴포넌트)
- **React Router v7** (SPA 라우팅)
- **Zustand** (상태관리)
- **Cloudflare Pages Functions** (기존 백엔드 유지)
- **D1** (기존 DB 유지)

## 프로젝트 구조
```
vocal-class-cloudflare/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui 기반 공통 컴포넌트
│   │   ├── layout/          # Header, Sidebar, MobileNav, Footer
│   │   ├── auth/            # LoginForm, RoleSelect
│   │   ├── teacher/         # Dashboard, Calendar, Schedule, StudentList
│   │   ├── student/         # Dashboard, TeacherSearch, BookingForm
│   │   ├── chat/            # ChatWindow, MessageBubble, ModelSelector
│   │   └── tools/           # Drawing, Recorder, Signature
│   ├── pages/
│   │   ├── LandingPage.tsx      # 새로 추가! 서비스 소개
│   │   ├── LoginPage.tsx
│   │   ├── TeacherDashboard.tsx
│   │   ├── StudentDashboard.tsx
│   │   ├── ProfileEditPage.tsx
│   │   ├── TeacherProfileView.tsx
│   │   ├── StudentManagePage.tsx
│   │   ├── ToolsPage.tsx
│   │   ├── WorkoutPage.tsx
│   │   ├── ChatPage.tsx
│   │   └── AdminPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useBookings.ts
│   │   ├── useChat.ts
│   │   └── useSchedule.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   └── chatStore.ts
│   ├── lib/
│   │   ├── api.ts           # fetch wrapper
│   │   └── ai-providers.ts  # 모델 추상화 레이어
│   ├── App.tsx
│   └── main.tsx
├── functions/               # 기존 백엔드 (수정)
│   └── api/
│       ├── chatbot.ts       # 모델 교체 가능하도록 리팩토링
│       └── ... (기존 유지)
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## UX/UI 개선 포인트

### 1. 랜딩 페이지 (신규)
- 서비스 소개 히어로 섹션
- 카테고리별 강사 미리보기
- CTA: "강사로 시작하기" / "수업 찾기"
- 신뢰도: 리뷰 하이라이트, 통계

### 2. 인증 플로우
- 현재: 이름만 입력 (보안 없음)
- 개선: 이름 + PIN 또는 이메일 매직링크 (추후)
- 역할 선택 UI 개선 (카드형)

### 3. 네비게이션
- **모바일**: 하단 탭바 (5개 이내)
- **데스크탑**: 사이드바 + 상단바
- 역할별 메뉴 분리 (강사/수강생)

### 4. 대시보드
- 카드 기반 레이아웃
- 오늘의 일정 요약
- 빠른 액션 버튼
- 최근 활동 피드

### 5. 캘린더/예약
- 인터랙티브 캘린더 (터치 친화적)
- 드래그로 시간 선택
- 상태별 색상 코딩

### 6. AI 챗봇 (모델 교체 가능)
- 백엔드: provider 추상화 (Gemini, OpenAI, Claude)
- 설정에서 모델 선택 가능
- 환경변수: `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY` (또는 각 provider별 키)
- Function calling은 provider별 포맷 변환

## AI Provider 추상화 (백엔드)
```typescript
interface AIProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  supportsFunctionCalling: boolean;
}

// providers/gemini.ts - 기존 코드 래핑
// providers/openai.ts - OpenAI API
// providers/anthropic.ts - Claude API

// 환경변수로 선택:
// AI_PROVIDER=gemini|openai|anthropic
// AI_API_KEY=...
// AI_MODEL=gemini-2.0-flash|gpt-4o|claude-sonnet-4
```

## 디자인 시스템
- **Primary**: Indigo → 유지하되 더 세련되게
- **Neutral**: Slate gray 계열
- **Font**: Pretendard (한글) + Inter (영문)
- **Radius**: rounded-xl (부드러운 느낌)
- **Shadow**: 미니멀 그림자
- **Dark mode**: 지원 (추후)

## 마이그레이션 전략
1. React 프로젝트 초기화 (src/ 폴더)
2. 기존 functions/ 는 그대로 유지 (API 호환)
3. 페이지별 순차 포팅
4. wrangler.toml: `pages_build_output_dir = "dist"`로 변경
5. 기존 HTML 파일은 포팅 완료 후 삭제

## Phase 순서
1. **프로젝트 셋업** - Vite + React + Tailwind + shadcn/ui + Router
2. **레이아웃 + 인증** - 공통 레이아웃, 로그인, 라우팅
3. **강사 대시보드** - 캘린더, 스케줄, 예약관리
4. **수강생 대시보드** - 강사검색, 예약, 출석
5. **AI 챗봇** - Provider 추상화 + 새 UI
6. **도구/기타** - 드로잉, 녹음, 운동일지
7. **랜딩 페이지** - 서비스 소개
