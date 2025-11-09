# 코드 구조 확장성 개선 제안 (REFACTORING.md)

> **전략 변경**: 현재 구조로 MVP 먼저 완성 → 검증 후 멀티테넌시 기반 V2로 재설계

## 🎯 2단계 접근 전략

### Phase 0: MVP 완성 및 검증 (현재 구조) - 1~2주
**목표**: 핵심 기능 빠르게 검증
- AI 챗봇 기본 구현 (Gemini 연동)
- 강사 등록, 수업 예약, 출석, 리뷰 기능 완성
- 실제 사용자 피드백 수집
- **이후 V2 재설계로 전환**

### Phase 1+: V2 재설계 (멀티테넌시) - 2~4주
**목표**: 확장 가능한 플랫폼으로 완전 재구축
- 멀티테넌시 아키텍처 (도메인 = 테넌트)
- 다중 역할 시스템 (한 유저가 강사+수강생 동시 가능)
- 도메인별 플러그인 시스템
- 완전히 다른 비즈니스 모델도 지원 (교육, 게임, 숙박 등)

---

## 📊 현재 구조 분석

### 현재 상태
```
functions/api/
├── auth.ts                 # 인증
├── attendance.ts           # 출석
├── bookings.ts            # 예약
├── bookings/instant.ts    # 즉시 예약
├── categories.ts          # 카테고리
├── drawings.ts            # 드로잉
├── recordings.ts          # 녹음
├── reviews.ts             # 리뷰
├── schedule.ts            # 일정
└── teachers/
    └── profile.ts         # 강사 프로필

js/
├── auth.js                # 인증 로직
├── teacher.js             # 강사 대시보드
├── student.js             # 수강생 대시보드
├── students.js            # 수강생 관리
├── admin.js               # 어드민
├── signature.js           # 서명
├── drawing.js             # 드로잉
├── recorder.js            # 녹음
├── examples.js            # 예시 영상
├── components.js          # 공통 컴포넌트
└── login.js               # 로그인
```

---

## ⚠️ 확장성 문제점

### 1. **백엔드 API 구조**

#### 문제점:
- **파일 간 중복 코드**: 각 API 파일마다 DB 쿼리, 에러 핸들링, 응답 형식이 반복됨
- **타입 정의 부재**: TypeScript를 사용하지만 공통 타입/인터페이스 없음
- **미들웨어 부재**: 인증, 로깅, 에러 핸들링을 각 함수마다 수동으로 처리
- **비즈니스 로직과 라우팅 혼재**: 컨트롤러와 서비스 레이어 분리 필요

#### 예시 (현재):
```typescript
// functions/api/bookings.ts
export async function onRequestPost(context) {
  try {
    const { DB } = context.env;
    const body = await context.request.json();

    // 직접 쿼리 작성
    const result = await DB.prepare(`INSERT INTO bookings ...`).bind(...).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // 각 파일마다 에러 핸들링 반복
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### 2. **프론트엔드 구조**

#### 문제점:
- **Vanilla JS의 한계**: 컴포넌트 재사용성 낮음, 상태 관리 복잡
- **API 호출 중복**: 각 파일마다 `fetch()` 호출 반복
- **페이지별 파일 분리**: `teacher.js`, `student.js` 등이 모놀리식으로 커짐
- **타입 안정성 부재**: JavaScript라서 런타임 에러 위험

#### 예시 (현재):
```javascript
// js/student.js (500+ 줄)
async function loadTeachers() {
  try {
    const response = await fetch('/api/auth?role=teacher');
    const data = await response.json();
    // ... 처리 로직
  } catch (error) {
    console.error(error);
  }
}

// js/teacher.js에도 유사한 패턴 반복
```

### 3. **데이터베이스 접근**

#### 문제점:
- **Raw SQL everywhere**: 쿼리 빌더나 ORM 없이 직접 SQL 작성
- **쿼리 재사용 불가**: 같은 쿼리를 여러 파일에서 반복
- **타입 안정성 부재**: 쿼리 결과 타입 추론 불가
- **마이그레이션 관리 없음**: schema.sql 하나로만 관리

---

## 💡 개선 방안

### Phase 1: 백엔드 리팩토링 (우선순위: 높음)

#### 1.1 계층 구조 도입

```
functions/
├── api/                    # API 라우트 (컨트롤러만)
│   ├── auth.ts
│   ├── bookings.ts
│   └── ...
├── services/              # 비즈니스 로직
│   ├── auth.service.ts
│   ├── booking.service.ts
│   └── ...
├── repositories/          # DB 접근 레이어
│   ├── user.repository.ts
│   ├── booking.repository.ts
│   └── base.repository.ts
├── middleware/            # 공통 미들웨어
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   └── logger.middleware.ts
├── types/                 # TypeScript 타입 정의
│   ├── api.types.ts
│   ├── db.types.ts
│   └── common.types.ts
└── utils/                 # 유틸리티 함수
    ├── response.util.ts
    ├── validation.util.ts
    └── date.util.ts
```

#### 1.2 예시 코드

**타입 정의** (`functions/types/db.types.ts`):
```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'teacher' | 'student';
  created_at: string;
}

export interface Booking {
  id: number;
  student_id: number;
  teacher_id: number;
  booking_date: string;
  time_slot: string;
  status: 'confirmed' | 'cancelled' | 'completed';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

**Repository 패턴** (`functions/repositories/booking.repository.ts`):
```typescript
import { D1Database } from '@cloudflare/workers-types';
import { Booking } from '../types/db.types';

export class BookingRepository {
  constructor(private db: D1Database) {}

  async findById(id: number): Promise<Booking | null> {
    const result = await this.db.prepare(`
      SELECT * FROM bookings WHERE id = ?
    `).bind(id).first<Booking>();

    return result;
  }

  async findByStudent(studentId: number): Promise<Booking[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM bookings WHERE student_id = ? ORDER BY booking_date DESC
    `).bind(studentId).all<Booking>();

    return results;
  }

  async create(booking: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
    const result = await this.db.prepare(`
      INSERT INTO bookings (student_id, teacher_id, booking_date, time_slot, status)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      booking.student_id,
      booking.teacher_id,
      booking.booking_date,
      booking.time_slot,
      booking.status
    ).first<Booking>();

    return result!;
  }

  async updateStatus(id: number, status: Booking['status']): Promise<void> {
    await this.db.prepare(`
      UPDATE bookings SET status = ? WHERE id = ?
    `).bind(status, id).run();
  }
}
```

**Service 레이어** (`functions/services/booking.service.ts`):
```typescript
import { BookingRepository } from '../repositories/booking.repository';
import { Booking } from '../types/db.types';

export class BookingService {
  constructor(private bookingRepo: BookingRepository) {}

  async getStudentBookings(studentId: number): Promise<Booking[]> {
    return this.bookingRepo.findByStudent(studentId);
  }

  async createBooking(data: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
    // 비즈니스 로직: 중복 예약 체크
    // 비즈니스 로직: 시간 충돌 체크
    // 비즈니스 로직: 강사 가용성 체크

    return this.bookingRepo.create(data);
  }

  async cancelBooking(bookingId: number, userId: number): Promise<void> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.student_id !== userId) {
      throw new Error('Unauthorized');
    }

    await this.bookingRepo.updateStatus(bookingId, 'cancelled');
  }
}
```

**미들웨어** (`functions/middleware/error.middleware.ts`):
```typescript
import { ApiResponse } from '../types/api.types';

export function createErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const response: ApiResponse = {
    success: false,
    error: message
  };

  return new Response(JSON.stringify(response), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function createSuccessResponse<T>(data: T, message?: string): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**리팩토링된 API** (`functions/api/bookings.ts`):
```typescript
import { BookingRepository } from '../repositories/booking.repository';
import { BookingService } from '../services/booking.service';
import { createErrorResponse, createSuccessResponse } from '../middleware/error.middleware';

export async function onRequestGet(context) {
  try {
    const { DB } = context.env;
    const url = new URL(context.request.url);
    const studentId = url.searchParams.get('studentId');

    if (!studentId) {
      throw new Error('studentId is required');
    }

    const bookingRepo = new BookingRepository(DB);
    const bookingService = new BookingService(bookingRepo);

    const bookings = await bookingService.getStudentBookings(parseInt(studentId));

    return createSuccessResponse({ bookings });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function onRequestPost(context) {
  try {
    const { DB } = context.env;
    const body = await context.request.json();

    const bookingRepo = new BookingRepository(DB);
    const bookingService = new BookingService(bookingRepo);

    const booking = await bookingService.createBooking(body);

    return createSuccessResponse({ booking }, 'Booking created successfully');
  } catch (error) {
    return createErrorResponse(error);
  }
}
```

---

### Phase 2: 프론트엔드 리팩토링 (우선순위: 중간)

#### 2.1 API 클라이언트 추상화

**API Client** (`js/lib/api-client.js`):
```javascript
class ApiClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// 싱글톤 인스턴스
const api = new ApiClient();
```

**서비스 레이어** (`js/services/booking.service.js`):
```javascript
class BookingService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async getMyBookings(studentId) {
    const response = await this.api.get('/bookings', { studentId });
    return response.data.bookings;
  }

  async createBooking(bookingData) {
    const response = await this.api.post('/bookings', bookingData);
    return response.data.booking;
  }

  async cancelBooking(bookingId) {
    await this.api.delete(`/bookings/${bookingId}`);
  }
}

const bookingService = new BookingService(api);
```

**사용 예시** (`js/student.js`):
```javascript
// 이전 (300+ 줄)
async function loadMyBookings() {
  try {
    const response = await fetch('/api/bookings?studentId=' + user.id);
    const data = await response.json();
    if (data.success) {
      renderBookings(data.bookings);
    }
  } catch (error) {
    console.error(error);
  }
}

// 개선 후 (간결함)
async function loadMyBookings() {
  try {
    const bookings = await bookingService.getMyBookings(user.id);
    renderBookings(bookings);
  } catch (error) {
    handleError(error);
  }
}
```

#### 2.2 컴포넌트 시스템 도입 (선택사항)

**간단한 컴포넌트 클래스**:
```javascript
class Component {
  constructor(selector) {
    this.el = document.querySelector(selector);
  }

  render(html) {
    if (this.el) {
      this.el.innerHTML = html;
    }
  }

  on(event, selector, handler) {
    this.el.addEventListener(event, (e) => {
      if (e.target.matches(selector)) {
        handler(e);
      }
    });
  }
}

class BookingCard extends Component {
  constructor(selector, booking) {
    super(selector);
    this.booking = booking;
  }

  render() {
    const html = `
      <div class="card">
        <h3>${this.booking.teacher_name}</h3>
        <p>${this.booking.booking_date} ${this.booking.time_slot}</p>
        <button class="cancel-btn" data-id="${this.booking.id}">취소</button>
      </div>
    `;
    super.render(html);
  }
}
```

---

### Phase 3: AI 챗봇 통합 구조 (우선순위: 높음)

#### 3.1 AI 서비스 레이어 추가

```
functions/
├── services/
│   ├── ai/
│   │   ├── chatbot.service.ts      # 챗봇 세션 관리
│   │   ├── prompt.builder.ts       # 프롬프트 자동 생성
│   │   ├── gemini.client.ts        # Gemini API 클라이언트
│   │   └── conversation.logger.ts  # 상담 로그 저장
│   └── ...
└── api/
    └── ai/
        ├── chat.ts                  # POST /api/ai/chat
        └── prompt-preview.ts        # GET /api/ai/prompt-preview
```

**프롬프트 빌더** (`functions/services/ai/prompt.builder.ts`):
```typescript
import { TeacherProfile } from '../../types/db.types';

export class PromptBuilder {
  static buildSystemPrompt(profile: TeacherProfile): string {
    return `당신은 ${profile.teacher_name} 강사님의 AI 상담 비서입니다.

**강사 정보:**
- 이름: ${profile.teacher_name}
- 카테고리: ${profile.category_name}
- 경력: ${profile.certification || '정보 없음'}
- 자기소개: ${profile.bio || '정보 없음'}
- 시간당 수업료: ${profile.hourly_rate ? profile.hourly_rate.toLocaleString() + '원' : '문의 요망'}

**역할:**
- 수강생의 질문에 친절하고 정확하게 답변하세요.
- 강사님의 수업 방식, 경력, 수업료 등에 대해 안내하세요.
- 예약 방법, 수업 진행 방식 등을 설명하세요.
- 개인정보(연락처, 주소 등)는 절대 공유하지 마세요.
- 확실하지 않은 정보는 "강사님께 직접 문의해주세요"라고 안내하세요.

**금지사항:**
- 강사가 제공하지 않은 정보는 추측하지 마세요.
- 개인정보를 요구하거나 공유하지 마세요.
- 다른 강사와 비교하거나 평가하지 마세요.`;
  }

  static buildUserContext(conversationHistory: Array<{ role: string; content: string }>): string {
    return conversationHistory.map(msg =>
      `${msg.role === 'user' ? '수강생' : 'AI'}: ${msg.content}`
    ).join('\n');
  }
}
```

**Gemini 클라이언트** (`functions/services/ai/gemini.client.ts`):
```typescript
export class GeminiClient {
  constructor(private apiKey: string) {}

  async chat(systemPrompt: string, userMessage: string, history: any[] = []) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...history,
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  async *chatStream(systemPrompt: string, userMessage: string, history: any[] = []) {
    // 스트리밍 구현
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...history,
          { role: 'user', parts: [{ text: userMessage }] }
        ]
      })
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      yield chunk;
    }
  }
}
```

**챗봇 API** (`functions/api/ai/chat.ts`):
```typescript
import { GeminiClient } from '../../services/ai/gemini.client';
import { PromptBuilder } from '../../services/ai/prompt.builder';
import { TeacherProfileRepository } from '../../repositories/teacher-profile.repository';

export async function onRequestPost(context) {
  try {
    const { DB, GEMINI_API_KEY } = context.env;
    const { teacherId, message, history = [] } = await context.request.json();

    // 강사 프로필 조회
    const profileRepo = new TeacherProfileRepository(DB);
    const profile = await profileRepo.findByTeacherId(teacherId);

    if (!profile) {
      throw new Error('Teacher profile not found');
    }

    // 시스템 프롬프트 생성
    const systemPrompt = PromptBuilder.buildSystemPrompt(profile);

    // Gemini API 호출
    const gemini = new GeminiClient(GEMINI_API_KEY);
    const response = await gemini.chat(systemPrompt, message, history);

    // 상담 로그 저장 (비동기)
    // await conversationLogger.log(teacherId, message, response);

    return new Response(JSON.stringify({
      success: true,
      data: { response }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

---

## 🎯 우선순위 로드맵 (업데이트)

### Phase 0: MVP 완성 (현재 구조) - 1~2주 ⚡
**현재 코드베이스로 빠르게 검증**

1. **AI 챗봇 MVP** (최우선)
   - Gemini API 연동
   - 프롬프트 자동 생성 (강사 프로필 기반)
   - 기본 채팅 UI (teacher-profile-view.html에 추가)
   - 상담 로그 간단히 저장 (chat_logs 테이블)

2. **핵심 기능 안정화**
   - 강사 등록 → 프로필 작성 → AI 챗봇 자동 생성
   - 수강생 강사 검색 → 챗봇 상담 → 예약
   - 출석 체크 → 리뷰 작성

3. **사용자 테스트**
   - 실제 강사/수강생 피드백 수집
   - 핵심 기능 검증 및 개선

### Phase 1: V2 아키텍처 설계 - 1주 📐
**멀티테넌시 기반 재설계 계획**

1. **데이터베이스 스키마 설계**
   - 멀티테넌시 구조 (모든 테이블에 tenant_id)
   - 다중 역할 시스템 (users ↔ user_roles ↔ roles)
   - 도메인별 설정 테이블 (tenants, domain_configs)

2. **백엔드 아키텍처 설계**
   - 계층 구조 (Repository → Service → Controller)
   - 도메인별 플러그인 시스템
   - 공통 비즈니스 로직 추상화

3. **마이그레이션 전략**
   - V1 데이터 → V2 마이그레이션 스크립트
   - 점진적 전환 계획

### Phase 2: V2 구현 및 마이그레이션 - 2~3주 🔨
**새로운 코드베이스 구축**

1. **코어 시스템 구현**
   - 멀티테넌시 인프라
   - 다중 역할 시스템
   - 공통 API 레이어

2. **도메인 플러그인 개발**
   - 교육 도메인 (보컬, PT 등)
   - 확장 가능한 플러그인 인터페이스

3. **데이터 마이그레이션 & 테스트**
   - V1 → V2 데이터 이전
   - 기능 동작 검증
   - 프로덕션 배포

### Phase 3: 도메인 확장 - 진행중 🌐
**새로운 비즈니스 모델 추가**

1. **게임/엔터테인먼트 도메인**
   - 게임 코칭, 스트리밍 멘토링

2. **완전히 다른 도메인**
   - 숙박 예약, 상품 판매 등
   - 도메인별 커스터마이징

---

## 📝 다음 단계

### Immediate Actions
1. ✅ **Phase 0 시작**: AI 챗봇 MVP 구현 (현재 구조)
2. ✅ **ARCHITECTURE_V2.md 작성**: 멀티테넌시 설계 문서화
3. ✅ **README.md 업데이트**: 로드맵 반영

### 중요 결정사항
- **Phase 0 완료 기준**: AI 챗봇 동작 + 사용자 피드백 10건 이상
- **V2 전환 시점**: Phase 0 검증 완료 후 즉시 시작
- **병렬 개발 여부**: V1 유지보수와 V2 개발 분리

---

**작성일**: 2025-11-08
**업데이트**: 2025-11-08 (2단계 전략으로 변경)
**작성자**: Claude Code
**다음 리뷰**: Phase 0 완료 시 (1~2주 후)
