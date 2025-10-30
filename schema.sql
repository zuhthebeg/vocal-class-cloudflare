-- D1 데이터베이스 스키마

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('teacher', 'student')),
    email TEXT,
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
    time_slot TEXT NOT NULL, -- 예약한 시간 'HH:MM'
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    UNIQUE(student_id, booking_date, time_slot, status) -- 동일 학생이 같은 시간에 중복 예약 방지 (취소된 것 제외)
);

-- 출석 테이블
CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(specific_date);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher_date ON schedules(teacher_id, specific_date);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON bookings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings(booking_date, time_slot);
CREATE INDEX IF NOT EXISTS idx_attendances_session ON attendances(session_id);
