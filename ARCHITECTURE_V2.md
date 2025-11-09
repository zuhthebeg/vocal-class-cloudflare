# ARCHITECTURE_V2.md - 멀티테넌시 플랫폼 설계

> **Phase 1+ (V2)**: 확장 가능한 멀티 도메인 플랫폼 아키텍처

## 📋 목차

1. [개요](#개요)
2. [핵심 설계 원칙](#핵심-설계-원칙)
3. [데이터베이스 스키마](#데이터베이스-스키마)
4. [백엔드 아키텍처](#백엔드-아키텍처)
5. [프론트엔드 아키텍처](#프론트엔드-아키텍처)
6. [도메인 플러그인 시스템](#도메인-플러그인-시스템)
7. [마이그레이션 전략](#마이그레이션-전략)
8. [확장 시나리오](#확장-시나리오)

---

## 개요

### V1 → V2 주요 변경사항

| 항목 | V1 (현재) | V2 (멀티테넌시) |
|------|----------|----------------|
| **유저 역할** | 단일 역할 (teacher or student) | 다중 역할 (teacher + student 동시) |
| **도메인** | 교육 전용 | 완전히 다른 비즈니스 모델 지원 |
| **데이터 격리** | 단일 DB | 테넌트별 격리 (tenant_id) |
| **확장성** | 카테고리 추가만 가능 | 도메인별 플러그인 |
| **예시** | 보컬, PT, 드로잉 | + 게임 코칭, 요리, 숙박 예약 |

### 지원 대상 도메인

1. **교육 (Education)**: 1:1 레슨 (보컬, PT, 악기, 미술 등)
2. **게임/엔터테인먼트 (Gaming)**: 게임 코칭, 스트리밍 멘토링
3. **요리 (Cooking)**: 요리 클래스, 레시피 구독
4. **숙박 (Accommodation)**: 게스트하우스 예약
5. **기타 완전히 다른 비즈니스 모델**: 무제한 확장 가능

---

## 핵심 설계 원칙

### 1. 멀티테넌시 (Multi-tenancy)
- **도메인 = 테넌트**: 각 비즈니스 도메인이 하나의 테넌트
- **완전 격리**: 모든 데이터는 `tenant_id`로 격리
- **독립 설정**: 테넌트별 커스터마이징 가능

### 2. 다중 역할 시스템 (Multi-role)
- **한 유저 = 여러 역할**: 강사이면서 동시에 수강생 가능
- **Many-to-Many 관계**: `users ↔ user_roles ↔ roles`
- **역할별 권한**: 도메인 + 역할 조합으로 권한 관리

### 3. 도메인 플러그인 아키텍처
- **플러그인 시스템**: 각 도메인은 독립적인 플러그인
- **공통 인터페이스**: 예약, 결제, 리뷰 등 공통 로직 추상화
- **커스터마이징**: 도메인별 특화 기능 자유롭게 추가

### 4. API 우선 (API-first)
- **RESTful API**: 모든 비즈니스 로직은 API로 노출
- **타입 안전성**: TypeScript로 엔드투엔드 타입 정의
- **버전 관리**: API 버전 관리 (v1, v2 등)

---

## 데이터베이스 스키마

### 핵심 테이블

#### 1. **tenants** (테넌트)
```sql
CREATE TABLE tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_name TEXT UNIQUE NOT NULL,           -- 예: "education", "gaming", "cooking"
    display_name TEXT NOT NULL,                 -- 예: "교육 플랫폼", "게임 코칭"
    subdomain TEXT UNIQUE,                      -- 예: "edu.class.cocy.io"
    status TEXT DEFAULT 'active',               -- 'active', 'suspended', 'archived'
    settings JSON,                              -- 테넌트별 커스텀 설정
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**예시 데이터**:
```sql
INSERT INTO tenants (domain_name, display_name, subdomain, settings) VALUES
('education', '교육 플랫폼', 'edu', '{"features": ["ai_chatbot", "recordings"], "theme": "indigo"}'),
('gaming', '게임 코칭', 'gaming', '{"features": ["live_streaming", "replay_analysis"], "theme": "purple"}'),
('cooking', '요리 클래스', 'cooking', '{"features": ["recipe_sharing", "ingredient_list"], "theme": "orange"}');
```

---

#### 2. **users** (사용자)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,                 -- 이메일 (전역 고유)
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'Asia/Seoul',
    locale TEXT DEFAULT 'ko-KR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**변경 사항**:
- V1의 `role` 컬럼 제거 → `user_roles` 테이블로 이동
- 전역 사용자 관리 (테넌트 간 공유 가능)

---

#### 3. **roles** (역할 정의)
```sql
CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,                 -- 테넌트 격리
    name TEXT NOT NULL,                         -- 예: "teacher", "student", "coach", "gamer"
    display_name TEXT NOT NULL,                 -- 예: "강사", "수강생", "코치", "게이머"
    permissions JSON,                           -- 역할별 권한 설정
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, name)
);
```

**예시 데이터**:
```sql
-- 교육 도메인 역할
INSERT INTO roles (tenant_id, name, display_name, permissions) VALUES
(1, 'teacher', '강사', '{"can_create_schedule": true, "can_view_attendance": true}'),
(1, 'student', '수강생', '{"can_book_lesson": true, "can_submit_attendance": true}');

-- 게임 도메인 역할
INSERT INTO roles (tenant_id, name, display_name, permissions) VALUES
(2, 'coach', '코치', '{"can_create_session": true, "can_analyze_replay": true}'),
(2, 'gamer', '게이머', '{"can_book_coaching": true, "can_upload_replay": true}');
```

---

#### 4. **user_roles** (사용자-역할 매핑)
```sql
CREATE TABLE user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,                 -- 중복 정규화 (빠른 조회)
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(user_id, role_id)
);
```

**예시 시나리오**:
```sql
-- 사용자 Alice (id=1)는:
-- - 교육 도메인에서 강사 (보컬 선생님)
-- - 교육 도메인에서 수강생 (PT 수강 중)
-- - 게임 도메인에서 게이머 (LOL 코칭 받음)

INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES
(1, 1, 1),  -- 교육 강사
(1, 2, 1),  -- 교육 수강생
(1, 4, 2);  -- 게임 게이머
```

---

#### 5. **domain_configs** (도메인별 설정)
```sql
CREATE TABLE domain_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    config_key TEXT NOT NULL,                   -- 예: "booking_interval", "max_participants"
    config_value JSON NOT NULL,                 -- 설정 값
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, config_key)
);
```

**예시 데이터**:
```sql
-- 교육 도메인: 예약 단위 30분
INSERT INTO domain_configs (tenant_id, config_key, config_value) VALUES
(1, 'booking_interval_minutes', '30'),
(1, 'max_advance_booking_days', '90');

-- 게임 도메인: 예약 단위 60분
INSERT INTO domain_configs (tenant_id, config_key, config_value) VALUES
(2, 'booking_interval_minutes', '60'),
(2, 'replay_file_max_size_mb', '500');
```

---

#### 6. **schedules** (일정 - 멀티테넌트 버전)
```sql
CREATE TABLE schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,                 -- 테넌트 격리
    provider_id INTEGER NOT NULL,               -- 서비스 제공자 (강사, 코치 등)
    specific_date DATE NOT NULL,
    time_slot TEXT NOT NULL,                    -- 예: "10:00", "14:30"
    status TEXT DEFAULT 'available',            -- 'available', 'booked', 'blocked'
    max_participants INTEGER DEFAULT 1,         -- 1:1 or 그룹 수업
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (provider_id) REFERENCES users(id),
    UNIQUE(tenant_id, provider_id, specific_date, time_slot)
);

CREATE INDEX idx_schedules_tenant ON schedules(tenant_id, provider_id, specific_date);
```

---

#### 7. **bookings** (예약 - 멀티테넌트 버전)
```sql
CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,                 -- 테넌트 격리
    consumer_id INTEGER NOT NULL,               -- 소비자 (수강생, 게이머 등)
    provider_id INTEGER NOT NULL,               -- 제공자 (강사, 코치 등)
    booking_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',            -- 'confirmed', 'completed', 'cancelled'
    metadata JSON,                              -- 도메인별 추가 데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (consumer_id) REFERENCES users(id),
    FOREIGN KEY (provider_id) REFERENCES users(id),
    UNIQUE(tenant_id, provider_id, booking_date, time_slot)
);

CREATE INDEX idx_bookings_tenant ON bookings(tenant_id, consumer_id);
CREATE INDEX idx_bookings_provider ON bookings(tenant_id, provider_id);
```

---

#### 8. **attendances** (출석 - 멀티테넌트 버전)
```sql
CREATE TABLE attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,                 -- 테넌트 격리
    booking_id INTEGER NOT NULL,
    consumer_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    attended_at TIMESTAMP NOT NULL,
    signature_url TEXT,                         -- R2 경로
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (consumer_id) REFERENCES users(id),
    FOREIGN KEY (provider_id) REFERENCES users(id)
);

CREATE INDEX idx_attendances_tenant ON attendances(tenant_id, consumer_id);
```

---

#### 9. **profiles** (프로필 - 도메인별 확장 가능)
```sql
CREATE TABLE profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,                 -- 테넌트 격리
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,                   -- 어떤 역할의 프로필인지
    bio TEXT,
    certification TEXT,
    hourly_rate INTEGER,
    metadata JSON,                              -- 도메인별 커스텀 필드
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    UNIQUE(tenant_id, user_id, role_id)
);
```

**예시 데이터**:
```sql
-- Alice의 보컬 강사 프로필
INSERT INTO profiles (tenant_id, user_id, role_id, bio, hourly_rate, metadata) VALUES
(1, 1, 1, '10년 경력 보컬 트레이너', 50000, '{"specialties": ["팝", "재즈"], "languages": ["ko", "en"]}');

-- Alice의 게임 게이머 프로필
INSERT INTO profiles (tenant_id, user_id, role_id, bio, metadata) VALUES
(2, 1, 4, '다이아 티어 LOL 플레이어', '{"rank": "Diamond III", "main_champions": ["Ahri", "LeBlanc"]}');
```

---

### 전체 스키마 ERD (간소화)

```
┌─────────────┐
│  tenants    │
│  (도메인)    │
└──────┬──────┘
       │
       ├───────────────────────────────────────┐
       │                                       │
┌──────▼──────┐                        ┌──────▼──────┐
│   roles     │                        │domain_configs│
│  (역할)      │                        │ (도메인설정)  │
└──────┬──────┘                        └─────────────┘
       │
       │      ┌─────────────┐
       └──────►  user_roles │◄──────┐
              │ (사용자역할)  │       │
              └──────┬──────┘       │
                     │          ┌───┴───────┐
                     └──────────►   users   │
                                │  (사용자)  │
                                └───┬───────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼───────┐          ┌────────▼────────┐         ┌───────▼────────┐
│   schedules   │          │    bookings     │         │   profiles     │
│   (일정)       │          │    (예약)        │         │   (프로필)      │
└───────────────┘          └────────┬────────┘         └────────────────┘
                                    │
                           ┌────────▼────────┐
                           │   attendances   │
                           │    (출석)        │
                           └─────────────────┘
```

---

## 백엔드 아키텍처

### 계층 구조 (Layered Architecture)

```
┌─────────────────────────────────────────┐
│         API Routes (Controller)         │  ← HTTP 요청 처리
├─────────────────────────────────────────┤
│         Service Layer (Business)        │  ← 비즈니스 로직
├─────────────────────────────────────────┤
│      Repository Layer (Data Access)     │  ← DB 쿼리
├─────────────────────────────────────────┤
│         Database (D1 SQLite)            │  ← 데이터 저장
└─────────────────────────────────────────┘
```

### 디렉토리 구조

```
functions/
├── api/                          # API 엔드포인트 (Cloudflare Pages Functions)
│   ├── v2/
│   │   ├── auth.ts              # 인증 API
│   │   ├── tenants.ts           # 테넌트 관리
│   │   ├── users.ts             # 사용자 관리
│   │   ├── bookings.ts          # 예약 API
│   │   └── [...tenant]/         # 테넌트별 동적 라우팅
│   │       └── [resource].ts    # 도메인 플러그인 API
│   └── v1/                      # V1 하위 호환성 유지
│
├── services/                    # 비즈니스 로직
│   ├── auth.service.ts
│   ├── tenant.service.ts
│   ├── booking.service.ts
│   ├── domains/                 # 도메인별 서비스
│   │   ├── education/
│   │   │   ├── lesson.service.ts
│   │   │   └── attendance.service.ts
│   │   ├── gaming/
│   │   │   ├── coaching.service.ts
│   │   │   └── replay.service.ts
│   │   └── cooking/
│   │       └── recipe.service.ts
│   └── ai/
│       ├── prompt.builder.ts
│       └── chatbot.service.ts
│
├── repositories/                # 데이터 액세스
│   ├── tenant.repository.ts
│   ├── user.repository.ts
│   ├── role.repository.ts
│   ├── booking.repository.ts
│   ├── schedule.repository.ts
│   └── attendance.repository.ts
│
├── middleware/                  # 미들웨어
│   ├── auth.middleware.ts       # JWT 인증
│   ├── tenant.middleware.ts     # 테넌트 컨텍스트 설정
│   ├── rbac.middleware.ts       # 역할 기반 권한 검사
│   └── cors.middleware.ts
│
├── types/                       # TypeScript 타입 정의
│   ├── db.types.ts              # DB 스키마 타입
│   ├── api.types.ts             # API 요청/응답 타입
│   └── domain.types.ts          # 도메인별 타입
│
└── utils/                       # 유틸리티
    ├── db.utils.ts
    ├── validation.utils.ts
    └── date.utils.ts
```

---

### 핵심 패턴 구현 예시

#### 1. Tenant Context Middleware
```typescript
// functions/middleware/tenant.middleware.ts
import { Context } from '@cloudflare/workers-types';

export interface TenantContext {
  tenantId: number;
  tenantName: string;
}

export async function withTenant(context: any, next: () => Promise<Response>) {
  const url = new URL(context.request.url);
  const subdomain = url.hostname.split('.')[0]; // 예: "edu" from "edu.class.cocy.io"

  // 테넌트 조회
  const tenant = await context.env.DB.prepare(`
    SELECT id, domain_name FROM tenants WHERE subdomain = ?
  `).bind(subdomain).first();

  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Invalid tenant' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 테넌트 컨텍스트 추가
  context.tenant = {
    tenantId: tenant.id,
    tenantName: tenant.domain_name
  };

  return next();
}
```

---

#### 2. Repository Pattern (Multi-tenant aware)
```typescript
// functions/repositories/booking.repository.ts
import { D1Database } from '@cloudflare/workers-types';
import { Booking, CreateBookingInput } from '../types/db.types';

export class BookingRepository {
  constructor(
    private db: D1Database,
    private tenantId: number  // 테넌트 컨텍스트
  ) {}

  async findById(id: number): Promise<Booking | null> {
    // 테넌트 격리 자동 적용
    const result = await this.db.prepare(`
      SELECT * FROM bookings
      WHERE id = ? AND tenant_id = ?
    `).bind(id, this.tenantId).first<Booking>();

    return result;
  }

  async findByConsumer(consumerId: number): Promise<Booking[]> {
    const { results } = await this.db.prepare(`
      SELECT b.*, u.name as provider_name
      FROM bookings b
      JOIN users u ON b.provider_id = u.id
      WHERE b.consumer_id = ? AND b.tenant_id = ?
      ORDER BY b.booking_date DESC, b.time_slot DESC
    `).bind(consumerId, this.tenantId).all<Booking>();

    return results;
  }

  async create(input: CreateBookingInput): Promise<Booking> {
    const result = await this.db.prepare(`
      INSERT INTO bookings (
        tenant_id, consumer_id, provider_id,
        booking_date, time_slot, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      this.tenantId,  // 자동으로 테넌트 ID 추가
      input.consumerId,
      input.providerId,
      input.bookingDate,
      input.timeSlot,
      input.status || 'confirmed',
      JSON.stringify(input.metadata || {})
    ).first<Booking>();

    return result!;
  }

  async cancel(id: number): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE bookings
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(id, this.tenantId).run();

    return result.meta.changes > 0;
  }
}
```

---

#### 3. Service Layer (도메인별 비즈니스 로직)
```typescript
// functions/services/domains/education/lesson.service.ts
import { BookingRepository } from '../../../repositories/booking.repository';
import { ScheduleRepository } from '../../../repositories/schedule.repository';
import { CreateBookingInput } from '../../../types/db.types';

export class LessonService {
  constructor(
    private bookingRepo: BookingRepository,
    private scheduleRepo: ScheduleRepository
  ) {}

  /**
   * 수업 예약 (교육 도메인 전용 로직)
   */
  async bookLesson(input: CreateBookingInput): Promise<any> {
    // 1. 일정 가능 여부 확인
    const schedule = await this.scheduleRepo.findByDateAndTime(
      input.providerId,
      input.bookingDate,
      input.timeSlot
    );

    if (!schedule || schedule.status !== 'available') {
      throw new Error('선택한 시간대는 예약할 수 없습니다.');
    }

    // 2. 중복 예약 확인
    const existingBooking = await this.bookingRepo.findByProviderDateSlot(
      input.providerId,
      input.bookingDate,
      input.timeSlot
    );

    if (existingBooking) {
      throw new Error('이미 예약된 시간입니다.');
    }

    // 3. 예약 생성
    const booking = await this.bookingRepo.create(input);

    // 4. 일정 상태 업데이트
    await this.scheduleRepo.updateStatus(schedule.id, 'booked');

    // 5. 알림 전송 (TODO: 알림 서비스)
    // await this.notificationService.sendBookingConfirmation(booking);

    return booking;
  }

  /**
   * 수업 취소 (환불 정책 적용)
   */
  async cancelLesson(bookingId: number, userId: number): Promise<any> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw new Error('예약을 찾을 수 없습니다.');
    }

    // 권한 확인 (본인만 취소 가능)
    if (booking.consumer_id !== userId && booking.provider_id !== userId) {
      throw new Error('취소 권한이 없습니다.');
    }

    // 취소 정책 검증 (예: 24시간 전까지만 취소 가능)
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.time_slot}`);
    const now = new Date();
    const hoursDiff = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      throw new Error('수업 24시간 전까지만 취소 가능합니다.');
    }

    // 예약 취소
    await this.bookingRepo.cancel(bookingId);

    // 일정 다시 available로 변경
    await this.scheduleRepo.updateStatusByDateSlot(
      booking.provider_id,
      booking.booking_date,
      booking.time_slot,
      'available'
    );

    return { success: true, message: '예약이 취소되었습니다.' };
  }
}
```

---

#### 4. API Controller (Pages Functions)
```typescript
// functions/api/v2/bookings.ts
import { BookingRepository } from '../../repositories/booking.repository';
import { ScheduleRepository } from '../../repositories/schedule.repository';
import { LessonService } from '../../services/domains/education/lesson.service';
import { withTenant } from '../../middleware/tenant.middleware';
import { withAuth } from '../../middleware/auth.middleware';

/**
 * POST /api/v2/bookings - 예약 생성
 */
export const onRequestPost: PagesFunction = async (context) => {
  // 미들웨어 실행
  await withTenant(context, async () => {});
  await withAuth(context, async () => {});

  const { tenantId } = context.tenant;
  const { userId } = context.auth;

  // Repository 초기화
  const bookingRepo = new BookingRepository(context.env.DB, tenantId);
  const scheduleRepo = new ScheduleRepository(context.env.DB, tenantId);

  // Service 초기화
  const lessonService = new LessonService(bookingRepo, scheduleRepo);

  try {
    const input = await context.request.json();

    // 입력 검증
    if (!input.providerId || !input.bookingDate || !input.timeSlot) {
      return new Response(JSON.stringify({
        success: false,
        error: '필수 항목을 모두 입력해주세요.'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 비즈니스 로직 실행
    const booking = await lessonService.bookLesson({
      consumerId: userId,
      providerId: input.providerId,
      bookingDate: input.bookingDate,
      timeSlot: input.timeSlot,
      metadata: input.metadata
    });

    return new Response(JSON.stringify({
      success: true,
      booking
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
};

/**
 * GET /api/v2/bookings?userId={userId} - 예약 목록 조회
 */
export const onRequestGet: PagesFunction = async (context) => {
  await withTenant(context, async () => {});
  await withAuth(context, async () => {});

  const { tenantId } = context.tenant;
  const { userId } = context.auth;

  const url = new URL(context.request.url);
  const queryUserId = parseInt(url.searchParams.get('userId') || String(userId));

  // 권한 확인 (본인 또는 관리자만 조회 가능)
  if (queryUserId !== userId && !context.auth.roles.includes('admin')) {
    return new Response(JSON.stringify({
      success: false,
      error: '권한이 없습니다.'
    }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const bookingRepo = new BookingRepository(context.env.DB, tenantId);

  try {
    const bookings = await bookingRepo.findByConsumer(queryUserId);

    return new Response(JSON.stringify({
      success: true,
      bookings
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
```

---

## 프론트엔드 아키텍처

### 디렉토리 구조

```
js/
├── config/
│   └── api.config.js            # API 기본 설정 (base URL, tenant 등)
│
├── services/
│   ├── api.client.js            # 공통 HTTP 클라이언트
│   ├── auth.service.js          # 인증 서비스
│   ├── booking.service.js       # 예약 서비스
│   └── domains/                 # 도메인별 서비스
│       ├── education.service.js
│       └── gaming.service.js
│
├── utils/
│   ├── tenant.utils.js          # 테넌트 감지 (subdomain 파싱)
│   ├── role.utils.js            # 역할 관리
│   └── validation.utils.js
│
└── components/
    ├── auth.js                  # 로그인/로그아웃
    ├── booking.js               # 예약 컴포넌트
    └── role-switcher.js         # 역할 전환 UI
```

---

### API Client (멀티테넌트 지원)

```javascript
// js/config/api.config.js
export const API_CONFIG = {
  baseUrl: '/api/v2',
  getTenant: () => {
    // 서브도메인에서 테넌트 감지
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];

    // 로컬 개발 환경에서는 localStorage에서 가져오기
    if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
      return localStorage.getItem('dev_tenant') || 'education';
    }

    return subdomain; // 예: "edu", "gaming", "cooking"
  }
};
```

```javascript
// js/services/api.client.js
import { API_CONFIG } from '../config/api.config.js';

class ApiClient {
  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.tenant = API_CONFIG.getTenant();
  }

  /**
   * 공통 fetch 래퍼 (자동으로 tenant 및 auth 헤더 추가)
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    // 기본 헤더
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant': this.tenant,
      ...options.headers
    };

    // 인증 토큰 추가
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

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

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
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

export const apiClient = new ApiClient();
```

---

### Booking Service 예시

```javascript
// js/services/booking.service.js
import { apiClient } from './api.client.js';

export const bookingService = {
  /**
   * 예약 생성
   */
  async createBooking(providerId, bookingDate, timeSlot, metadata = {}) {
    return await apiClient.post('/bookings', {
      providerId,
      bookingDate,
      timeSlot,
      metadata
    });
  },

  /**
   * 내 예약 목록 조회
   */
  async getMyBookings() {
    const user = JSON.parse(localStorage.getItem('vocalUser'));
    return await apiClient.get(`/bookings?userId=${user.id}`);
  },

  /**
   * 예약 취소
   */
  async cancelBooking(bookingId) {
    return await apiClient.delete(`/bookings/${bookingId}`);
  }
};
```

---

### Role Switcher (다중 역할 전환 UI)

```javascript
// js/components/role-switcher.js
import { apiClient } from '../services/api.client.js';

class RoleSwitcher {
  constructor() {
    this.currentRole = null;
    this.availableRoles = [];
  }

  /**
   * 사용자의 모든 역할 가져오기
   */
  async loadUserRoles() {
    const user = JSON.parse(localStorage.getItem('vocalUser'));
    const tenant = localStorage.getItem('dev_tenant') || 'education';

    const data = await apiClient.get(`/users/${user.id}/roles?tenant=${tenant}`);

    this.availableRoles = data.roles;
    this.currentRole = this.availableRoles[0]; // 기본값

    this.render();
  }

  /**
   * 역할 전환
   */
  switchRole(roleId) {
    this.currentRole = this.availableRoles.find(r => r.id === roleId);

    // 세션 스토리지에 저장
    sessionStorage.setItem('current_role', JSON.stringify(this.currentRole));

    // 페이지 리로드 또는 UI 업데이트
    window.location.reload();
  }

  /**
   * UI 렌더링
   */
  render() {
    const container = document.getElementById('role-switcher');
    if (!container) return;

    if (this.availableRoles.length <= 1) {
      container.style.display = 'none';
      return;
    }

    container.innerHTML = `
      <select id="role-select" class="px-3 py-2 border rounded">
        ${this.availableRoles.map(role => `
          <option value="${role.id}" ${role.id === this.currentRole.id ? 'selected' : ''}>
            ${role.display_name}
          </option>
        `).join('')}
      </select>
    `;

    document.getElementById('role-select').addEventListener('change', (e) => {
      this.switchRole(parseInt(e.target.value));
    });
  }
}

export const roleSwitcher = new RoleSwitcher();
```

---

## 도메인 플러그인 시스템

### 플러그인 인터페이스 (추상화)

```typescript
// functions/plugins/domain-plugin.interface.ts
export interface IDomainPlugin {
  /**
   * 플러그인 이름
   */
  readonly name: string;

  /**
   * 지원하는 테넌트
   */
  readonly tenantName: string;

  /**
   * 초기화
   */
  initialize(context: PluginContext): Promise<void>;

  /**
   * 예약 생성 (도메인별 커스터마이징)
   */
  createBooking(input: any): Promise<any>;

  /**
   * 예약 취소 (도메인별 정책)
   */
  cancelBooking(bookingId: number): Promise<any>;

  /**
   * 추가 API 엔드포인트 등록
   */
  registerRoutes?(): Record<string, Function>;
}

export interface PluginContext {
  db: D1Database;
  storage: R2Bucket;
  tenantId: number;
}
```

---

### Education Plugin 구현

```typescript
// functions/plugins/education.plugin.ts
import { IDomainPlugin, PluginContext } from './domain-plugin.interface';
import { LessonService } from '../services/domains/education/lesson.service';
import { BookingRepository } from '../repositories/booking.repository';
import { ScheduleRepository } from '../repositories/schedule.repository';

export class EducationPlugin implements IDomainPlugin {
  readonly name = 'education';
  readonly tenantName = 'education';

  private lessonService!: LessonService;

  async initialize(context: PluginContext): Promise<void> {
    const bookingRepo = new BookingRepository(context.db, context.tenantId);
    const scheduleRepo = new ScheduleRepository(context.db, context.tenantId);

    this.lessonService = new LessonService(bookingRepo, scheduleRepo);
  }

  async createBooking(input: any): Promise<any> {
    // 교육 도메인 전용 예약 로직
    return await this.lessonService.bookLesson(input);
  }

  async cancelBooking(bookingId: number): Promise<any> {
    // 교육 도메인 전용 취소 정책 (24시간 전)
    return await this.lessonService.cancelLesson(bookingId, input.userId);
  }

  /**
   * 교육 도메인 전용 API 엔드포인트
   */
  registerRoutes() {
    return {
      '/attendance': this.submitAttendance.bind(this),
      '/recordings': this.uploadRecording.bind(this)
    };
  }

  private async submitAttendance(input: any): Promise<any> {
    // 출석 제출 로직 (서명 업로드 등)
    // ...
  }

  private async uploadRecording(input: any): Promise<any> {
    // 녹음 파일 업로드 로직
    // ...
  }
}
```

---

### Gaming Plugin 구현

```typescript
// functions/plugins/gaming.plugin.ts
import { IDomainPlugin, PluginContext } from './domain-plugin.interface';
import { CoachingService } from '../services/domains/gaming/coaching.service';
import { BookingRepository } from '../repositories/booking.repository';
import { ScheduleRepository } from '../repositories/schedule.repository';

export class GamingPlugin implements IDomainPlugin {
  readonly name = 'gaming';
  readonly tenantName = 'gaming';

  private coachingService!: CoachingService;

  async initialize(context: PluginContext): Promise<void> {
    const bookingRepo = new BookingRepository(context.db, context.tenantId);
    const scheduleRepo = new ScheduleRepository(context.db, context.tenantId);

    this.coachingService = new CoachingService(bookingRepo, scheduleRepo);
  }

  async createBooking(input: any): Promise<any> {
    // 게임 코칭 전용 예약 로직
    return await this.coachingService.bookCoaching(input);
  }

  async cancelBooking(bookingId: number): Promise<any> {
    // 게임 코칭 전용 취소 정책 (2시간 전)
    return await this.coachingService.cancelCoaching(bookingId, input.userId);
  }

  /**
   * 게임 도메인 전용 API 엔드포인트
   */
  registerRoutes() {
    return {
      '/replay-upload': this.uploadReplay.bind(this),
      '/replay-analysis': this.analyzeReplay.bind(this)
    };
  }

  private async uploadReplay(input: any): Promise<any> {
    // 리플레이 파일 업로드 (R2)
    // ...
  }

  private async analyzeReplay(input: any): Promise<any> {
    // AI 기반 리플레이 분석 (Gemini API)
    // ...
  }
}
```

---

### Plugin Registry (플러그인 등록 및 로드)

```typescript
// functions/plugins/plugin.registry.ts
import { IDomainPlugin } from './domain-plugin.interface';
import { EducationPlugin } from './education.plugin';
import { GamingPlugin } from './gaming.plugin';
import { CookingPlugin } from './cooking.plugin';

class PluginRegistry {
  private plugins: Map<string, IDomainPlugin> = new Map();

  constructor() {
    // 플러그인 등록
    this.register(new EducationPlugin());
    this.register(new GamingPlugin());
    this.register(new CookingPlugin());
  }

  register(plugin: IDomainPlugin) {
    this.plugins.set(plugin.tenantName, plugin);
  }

  getPlugin(tenantName: string): IDomainPlugin | undefined {
    return this.plugins.get(tenantName);
  }

  getAllPlugins(): IDomainPlugin[] {
    return Array.from(this.plugins.values());
  }
}

export const pluginRegistry = new PluginRegistry();
```

---

## 마이그레이션 전략

### V1 → V2 데이터 마이그레이션

#### 1. 마이그레이션 스크립트

```sql
-- migration_v1_to_v2.sql

-- 1. 테넌트 생성 (기본값: education)
INSERT INTO tenants (domain_name, display_name, subdomain, settings)
VALUES ('education', '교육 플랫폼', 'edu', '{"features": ["ai_chatbot", "recordings"]}');

SET @tenant_id = last_insert_rowid();

-- 2. 역할 생성
INSERT INTO roles (tenant_id, name, display_name, permissions) VALUES
(@tenant_id, 'teacher', '강사', '{"can_create_schedule": true, "can_view_attendance": true}'),
(@tenant_id, 'student', '수강생', '{"can_book_lesson": true, "can_submit_attendance": true}');

-- 3. 기존 사용자 마이그레이션
-- V1 users 테이블에서 V2 users 테이블로 복사
INSERT INTO users_v2 (email, name, password_hash, phone, created_at)
SELECT
  COALESCE(email, name || '@temp.local') as email,  -- V1에 email이 없을 수 있음
  name,
  password_hash,
  phone,
  created_at
FROM users_v1;

-- 4. 사용자 역할 매핑
-- V1의 단일 role 컬럼 → V2의 user_roles 테이블
INSERT INTO user_roles (user_id, role_id, tenant_id)
SELECT
  u_v2.id as user_id,
  CASE u_v1.role
    WHEN 'teacher' THEN (SELECT id FROM roles WHERE tenant_id = @tenant_id AND name = 'teacher')
    WHEN 'student' THEN (SELECT id FROM roles WHERE tenant_id = @tenant_id AND name = 'student')
  END as role_id,
  @tenant_id as tenant_id
FROM users_v1 u_v1
JOIN users_v2 u_v2 ON u_v1.name = u_v2.name;

-- 5. 기존 일정 마이그레이션
INSERT INTO schedules_v2 (tenant_id, provider_id, specific_date, time_slot, status, created_at)
SELECT
  @tenant_id,
  s_v1.teacher_id,
  s_v1.specific_date,
  s_v1.time_slot,
  s_v1.status,
  s_v1.created_at
FROM schedules_v1 s_v1;

-- 6. 기존 예약 마이그레이션
INSERT INTO bookings_v2 (tenant_id, consumer_id, provider_id, booking_date, time_slot, status, created_at)
SELECT
  @tenant_id,
  b_v1.student_id,
  b_v1.teacher_id,
  b_v1.booking_date,
  b_v1.time_slot,
  b_v1.status,
  b_v1.created_at
FROM bookings_v1 b_v1;

-- 7. 기존 출석 마이그레이션
INSERT INTO attendances_v2 (tenant_id, booking_id, consumer_id, provider_id, attended_at, signature_url, notes, created_at)
SELECT
  @tenant_id,
  (SELECT id FROM bookings_v2 WHERE
    consumer_id = a_v1.student_id AND
    provider_id = a_v1.teacher_id AND
    booking_date = DATE(a_v1.attended_at) LIMIT 1),  -- booking_id 매핑
  a_v1.student_id,
  a_v1.teacher_id,
  a_v1.attended_at,
  a_v1.signature_url,
  a_v1.notes,
  a_v1.created_at
FROM attendances_v1 a_v1;

-- 8. 기존 프로필 마이그레이션 (teacher_profiles → profiles)
INSERT INTO profiles (tenant_id, user_id, role_id, bio, certification, hourly_rate, created_at)
SELECT
  @tenant_id,
  tp_v1.user_id,
  (SELECT id FROM roles WHERE tenant_id = @tenant_id AND name = 'teacher'),
  tp_v1.bio,
  tp_v1.certification,
  tp_v1.hourly_rate,
  tp_v1.created_at
FROM teacher_profiles_v1 tp_v1;
```

---

#### 2. 마이그레이션 실행 스크립트

```bash
#!/bin/bash
# migrate_v1_to_v2.sh

echo "Starting V1 → V2 migration..."

# 1. V2 스키마 생성
echo "Creating V2 schema..."
wrangler d1 execute vocal-class-db --file=./schema_v2.sql

# 2. 데이터 마이그레이션
echo "Migrating data..."
wrangler d1 execute vocal-class-db --file=./migration_v1_to_v2.sql

# 3. 데이터 검증
echo "Validating migration..."
wrangler d1 execute vocal-class-db --command "
  SELECT 'V1 users' as source, COUNT(*) as count FROM users_v1
  UNION ALL
  SELECT 'V2 users', COUNT(*) FROM users_v2
  UNION ALL
  SELECT 'V1 bookings', COUNT(*) FROM bookings_v1
  UNION ALL
  SELECT 'V2 bookings', COUNT(*) FROM bookings_v2;
"

echo "Migration complete!"
```

---

### 점진적 전환 전략

#### Phase 1: V1/V2 병렬 운영 (1주)
- V2 API 배포 (`/api/v2/*`)
- V1 API 유지 (`/api/v1/*` or `/api/*`)
- 신규 기능은 V2만 사용
- 기존 기능은 V1 사용

#### Phase 2: V1 → V2 마이그레이션 (2주)
- 데이터 마이그레이션 실행
- V1 API 호출을 V2로 점진적 전환
- 프론트엔드 업데이트 (API 클라이언트 변경)

#### Phase 3: V1 종료 (1주)
- V1 API 제거
- V1 테이블 삭제 (백업 후)
- 완전히 V2로 전환

---

## 확장 시나리오

### 시나리오 1: 새로운 도메인 추가 (숙박 예약)

#### 1. 테넌트 생성
```sql
INSERT INTO tenants (domain_name, display_name, subdomain, settings) VALUES
('accommodation', '숙박 예약', 'stay', '{"features": ["instant_booking", "reviews"], "theme": "blue"}');
```

#### 2. 역할 정의
```sql
INSERT INTO roles (tenant_id, name, display_name, permissions) VALUES
((SELECT id FROM tenants WHERE domain_name = 'accommodation'), 'host', '호스트', '{"can_manage_rooms": true}'),
((SELECT id FROM tenants WHERE domain_name = 'accommodation'), 'guest', '게스트', '{"can_book_room": true}');
```

#### 3. 플러그인 개발
```typescript
// functions/plugins/accommodation.plugin.ts
export class AccommodationPlugin implements IDomainPlugin {
  readonly name = 'accommodation';
  readonly tenantName = 'accommodation';

  async createBooking(input: any): Promise<any> {
    // 숙박 예약 로직 (체크인/체크아웃 날짜, 방 타입 등)
    // ...
  }

  registerRoutes() {
    return {
      '/rooms': this.getRooms.bind(this),
      '/check-availability': this.checkAvailability.bind(this)
    };
  }

  private async getRooms(): Promise<any> {
    // 방 목록 조회
  }

  private async checkAvailability(input: any): Promise<any> {
    // 예약 가능 여부 확인
  }
}
```

#### 4. 플러그인 등록
```typescript
// functions/plugins/plugin.registry.ts
import { AccommodationPlugin } from './accommodation.plugin';

class PluginRegistry {
  constructor() {
    this.register(new EducationPlugin());
    this.register(new GamingPlugin());
    this.register(new CookingPlugin());
    this.register(new AccommodationPlugin());  // ← 추가
  }
}
```

---

### 시나리오 2: 다중 역할 사용자

**예시**: Alice는 보컬 강사이면서 PT 수강생이고, 게임 코치이기도 함

```sql
-- Alice 사용자 생성
INSERT INTO users (email, name, password_hash) VALUES
('alice@example.com', 'Alice', '$hashed_password');

SET @alice_id = last_insert_rowid();

-- Alice의 역할들
INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES
(@alice_id, (SELECT id FROM roles WHERE tenant_id = 1 AND name = 'teacher'), 1),  -- 교육 강사
(@alice_id, (SELECT id FROM roles WHERE tenant_id = 1 AND name = 'student'), 1),  -- 교육 수강생
(@alice_id, (SELECT id FROM roles WHERE tenant_id = 2 AND name = 'coach'), 2);    -- 게임 코치

-- Alice의 프로필들
INSERT INTO profiles (tenant_id, user_id, role_id, bio, hourly_rate) VALUES
(1, @alice_id, (SELECT id FROM roles WHERE tenant_id = 1 AND name = 'teacher'), '10년 경력 보컬 트레이너', 50000),
(2, @alice_id, (SELECT id FROM roles WHERE tenant_id = 2 AND name = 'coach'), '다이아 티어 LOL 코치', 30000);
```

**프론트엔드에서 역할 전환**:
```javascript
// Alice가 로그인하면 역할 선택 UI 표시
const roles = await apiClient.get('/users/me/roles');

// roles = [
//   { tenant: 'education', role: 'teacher', displayName: '보컬 강사' },
//   { tenant: 'education', role: 'student', displayName: 'PT 수강생' },
//   { tenant: 'gaming', role: 'coach', displayName: 'LOL 코치' }
// ]

roleSwitcher.render(roles);
```

---

## 다음 단계

### Phase 0 완료 후 (V2 전환 시작)
1. **ARCHITECTURE_V2.md 최종 검토**
2. **schema_v2.sql 작성** (위 설계 기반)
3. **핵심 Repository 구현** (Tenant-aware)
4. **미들웨어 구현** (Tenant Context, RBAC)
5. **플러그인 시스템 구현**
6. **마이그레이션 스크립트 작성**
7. **프론트엔드 API 클라이언트 리팩토링**
8. **V1 → V2 데이터 마이그레이션 테스트**
9. **프로덕션 배포**

---

**작성일**: 2025-11-09
**버전**: 1.0
**상태**: 설계 완료 (Phase 0 이후 구현 예정)
