-- D1 데이터베이스 스키마

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('teacher', 'student')),
    email TEXT,
    start_date DATE,
    payment_info TEXT,
    notes TEXT,
    end_date DATE,
    bank_account TEXT,
    payment_status TEXT CHECK(payment_status IN ('paid', 'unpaid')) DEFAULT 'unpaid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 스케줄 테이블 (강사의 가능 시간 - 날짜 기반)
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    specific_date DATE NOT NULL, -- 'YYYY-MM-DD' 형식 (예: '2025-10-29')
    time_slot TEXT NOT NULL, -- 'HH:MM' 형식 (예: '10:00')
    is_available BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    UNIQUE(teacher_id, specific_date, time_slot) -- 중복 방지
);

-- 예약 테이블
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    booking_date DATE NOT NULL, -- 예약한 날짜 'YYYY-MM-DD'
    time_slot TEXT, -- 강사가 최종 선택한 시간 'HH:MM' (승인 시 설정)
    suggested_time_slots TEXT, -- 학생이 제시한 가능 시간들 JSON: '["18:00","19:00","20:00"]'
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- 출석 테이블
CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER, -- Optional: can be null for walk-in attendance
    student_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    signature_url TEXT, -- R2 저장소 경로
    attended_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
);

-- 녹음 테이블
CREATE TABLE IF NOT EXISTS recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    booking_id INTEGER,
    title TEXT,
    file_url TEXT NOT NULL, -- R2 저장소 경로
    duration INTEGER, -- 초 단위
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- 예시 영상 테이블
CREATE TABLE IF NOT EXISTS example_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    youtube_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- 학생별 드로잉 저장 테이블
CREATE TABLE IF NOT EXISTS student_drawings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    drawing_data TEXT NOT NULL, -- JSON blob: {canvasData, cliparts, savedDrawings, exampleVideos}
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    UNIQUE(student_id) -- 학생당 하나의 드로잉 데이터만 유지
);

-- ========== Phase 1: 멀티 수업 지원 ==========

-- 수업 카테고리 테이블
CREATE TABLE IF NOT EXISTS lesson_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,  -- '보컬', 'PT', '드로잉', '피아노' 등
    icon TEXT,  -- 이모지 아이콘
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 강사 프로필 확장 컬럼들 (ALTER TABLE은 SQLite에서 제한적이므로 새 테이블로 확장)
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    lesson_category_id INTEGER,
    hourly_rate INTEGER,  -- 시간당 수업료 (원)
    bio TEXT,  -- 강사 소개
    profile_image_url TEXT,  -- R2 저장소 경로
    certification TEXT,  -- 자격증/경력 JSON
    rating REAL DEFAULT 5.0,  -- 평점 (1.0 ~ 5.0)
    review_count INTEGER DEFAULT 0,  -- 리뷰 개수
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (lesson_category_id) REFERENCES lesson_categories(id)
);

-- 수업별 도구 설정 테이블
CREATE TABLE IF NOT EXISTS lesson_tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_category_id INTEGER NOT NULL,
    tool_type TEXT NOT NULL,  -- 'drawing', 'video', 'audio', 'document'
    is_enabled BOOLEAN DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_category_id) REFERENCES lesson_categories(id),
    UNIQUE(lesson_category_id, tool_type)
);

-- 리뷰 테이블
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    UNIQUE(booking_id)  -- 예약당 하나의 리뷰만 가능
);

-- ========== Phase 0: AI 챗봇 MVP ==========

-- 챗봇 대화 세션 테이블
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,  -- 어떤 강사의 챗봇인지
    visitor_name TEXT,  -- 방문자 이름 (선택)
    visitor_email TEXT,  -- 방문자 이메일 (선택)
    session_key TEXT NOT NULL UNIQUE,  -- 세션 고유 키 (UUID)
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,  -- 세션 활성 상태
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- 챗봇 대화 로그 테이블
CREATE TABLE IF NOT EXISTS chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),  -- 메시지 발신자
    content TEXT NOT NULL,  -- 메시지 내용
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(specific_date);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher_date ON schedules(teacher_id, specific_date);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON bookings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings(booking_date, time_slot);
CREATE INDEX IF NOT EXISTS idx_attendances_session ON attendances(session_id);
CREATE INDEX IF NOT EXISTS idx_student_drawings_student ON student_drawings(student_id);

-- Phase 0 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_sessions_teacher ON chat_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_key ON chat_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_chat_logs_session ON chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_teacher ON chat_logs(teacher_id);

-- Phase 1 인덱스
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user ON teacher_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_category ON teacher_profiles(lesson_category_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_rating ON teacher_profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_tools_category ON lesson_tools(lesson_category_id);
CREATE INDEX IF NOT EXISTS idx_reviews_teacher ON reviews(teacher_id);
CREATE INDEX IF NOT EXISTS idx_reviews_student ON reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);

-- ========== PT 운동 일지 ==========

-- 운동 일지 테이블
CREATE TABLE IF NOT EXISTS workout_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    log_date DATE NOT NULL,
    content TEXT NOT NULL,  -- 자연어 운동 기록
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id)
);

-- 운동 일지 인덱스
CREATE INDEX IF NOT EXISTS idx_workout_logs_student ON workout_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_workout_logs_student_date ON workout_logs(student_id, log_date);

-- 운동 상세 기록 테이블 (AI 파싱 결과)
CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id INTEGER NOT NULL,
    exercise_name TEXT NOT NULL,
    body_part TEXT,
    weight REAL,
    reps INTEGER,
    sets INTEGER,
    duration INTEGER,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (log_id) REFERENCES workout_logs(id) ON DELETE CASCADE
);

-- 운동 상세 인덱스
CREATE INDEX IF NOT EXISTS idx_workout_exercises_log ON workout_exercises(log_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_name ON workout_exercises(exercise_name);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_bodypart ON workout_exercises(body_part);
