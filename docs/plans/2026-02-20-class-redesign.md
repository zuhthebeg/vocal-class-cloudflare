# Class.cocy.io 재설계 — "취미의 기록"

## 컨셉

**Travly = 여행의 기록, Class = 취미의 기록**

개인 취미/레슨 여정을 기록하고 AI가 성장을 도와주는 앱.
강사 매칭 플랫폼이 아니라, **개인의 취미 일지** + **AI 코치**.

## 핵심 기능 (MVP)

### 1. 취미 관리
- 내 취미 등록 (보컬, 헬스, 드로잉, 피아노, 기타, 요가, 수영 등)
- 카테고리별 아이콘/색상
- 커스텀 취미 추가 가능

### 2. 기록 (엔트리)
- 오늘 뭘 했는지 기록 (레슨/연습/혼자연습)
- 시간, 내용, 기분(이모지), 메모
- 사진 첨부 가능
- 날짜별 타임라인

### 3. 타임라인
- 시간순 내 기록 흐름
- 취미별 필터
- 월별/주별 보기

### 4. 통계 대시보드
- 총 연습시간, 연속 기록일(스트릭), 이번달 기록수
- 취미별 시간 분포 (도넛차트)
- 주간 활동 히트맵

### 5. AI 코치
- 기록 기반 개인 피드백
- 연습 팁, 다음 단계 제안
- "이번 주 보컬 3회 연습했네요. 호흡법에 집중해보세요" 같은 맞춤 조언
- Gemini via AI Gateway

### 6. 목표 설정
- "이번 달 보컬 레슨 8회" 같은 목표
- 진행률 시각화

## 페이지 구조

```
/ (홈) — 오늘의 기록 + 최근 활동 + 빠른 기록 버튼
/timeline — 전체 타임라인
/new — 새 기록 작성
/entry/:id — 기록 상세/수정
/stats — 통계 대시보드
/ai — AI 코치 채팅
/hobbies — 내 취미 관리
/profile — 프로필/설정
```

## DB 스키마 (D1)

```sql
-- 사용자
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    google_id TEXT UNIQUE,
    email TEXT,
    picture TEXT,
    auth_provider TEXT DEFAULT 'guest',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 취미
CREATE TABLE hobbies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT DEFAULT '🎯',
    color TEXT DEFAULT '#6366f1',
    sort_order INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 기록
CREATE TABLE entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    hobby_id INTEGER NOT NULL,
    entry_type TEXT DEFAULT 'practice',
    title TEXT,
    content TEXT,
    duration_min INTEGER DEFAULT 0,
    mood TEXT,
    entry_date TEXT NOT NULL,
    photos TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (hobby_id) REFERENCES hobbies(id)
);

-- 목표
CREATE TABLE goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    hobby_id INTEGER,
    title TEXT NOT NULL,
    target_count INTEGER DEFAULT 0,
    current_count INTEGER DEFAULT 0,
    deadline TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (hobby_id) REFERENCES hobbies(id)
);

-- AI 대화
CREATE TABLE ai_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 기술 스택

- **프론트**: React + Vite + TypeScript + Tailwind CSS
- **백엔드**: CF Pages Functions (TypeScript)
- **DB**: Cloudflare D1
- **AI**: Gemini 2.5 Flash via AI Gateway
- **인증**: Google OAuth + Guest (Travly 패턴 재사용)
- **배포**: CF Pages (vocal-class-cloudflare 프로젝트)
- **도메인**: class.cocy.io

## 디자인 방향

- 다크 테마 기본 (Travly처럼)
- 부드러운 그라데이션 + 카드 UI
- 모바일 퍼스트
- 하단 탭 네비게이션 (홈/타임라인/+기록/통계/AI)
- 취미별 컬러 코딩
- 이모지 활용 (기분, 카테고리 아이콘)

## 차별점

1. **기록 중심** — 매칭/예약이 아닌 개인 일지
2. **AI 코치** — 기록 데이터 기반 맞춤 피드백
3. **심플** — 복잡한 기능 없이 기록 → 통계 → AI 피드백
4. **유저 1명부터 가치** — 네트워크 효과 불필요
