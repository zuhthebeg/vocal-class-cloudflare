-- 데이터베이스 초기화 및 테스트 데이터

-- 기존 테이블 삭제 (개발 환경에서만!)
DROP TABLE IF EXISTS recordings;
DROP TABLE IF EXISTS example_videos;
DROP TABLE IF EXISTS attendances;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS users;

-- 사용자 테이블
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('teacher', 'student')),
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 스케줄 테이블
CREATE TABLE schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    specific_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    is_available BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    UNIQUE(teacher_id, specific_date, time_slot)
);

-- 예약 테이블 (업데이트된 status)
CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    booking_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- 출석 테이블
CREATE TABLE attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    signature_url TEXT,
    attended_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
);

-- 녹음 테이블
CREATE TABLE recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    booking_id INTEGER,
    title TEXT,
    file_url TEXT NOT NULL,
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- 예시 영상 테이블
CREATE TABLE example_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    youtube_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- 인덱스
CREATE INDEX idx_schedules_teacher ON schedules(teacher_id);
CREATE INDEX idx_schedules_date ON schedules(specific_date);
CREATE INDEX idx_schedules_teacher_date ON schedules(teacher_id, specific_date);
CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_bookings_teacher ON bookings(teacher_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_date_time ON bookings(booking_date, time_slot);
CREATE INDEX idx_attendances_session ON attendances(session_id);

-- 테스트 데이터 삽입
INSERT INTO users (id, name, role, email) VALUES
(1, '김강사', 'teacher', 'teacher@example.com'),
(2, '이학생', 'student', 'student1@example.com'),
(3, '박학생', 'student', 'student2@example.com');

-- 테스트 예약 데이터 (다양한 상태)
INSERT INTO bookings (student_id, teacher_id, booking_date, time_slot, status) VALUES
(2, 1, '2025-11-01', '14:00', 'pending'),
(2, 1, '2025-11-02', '15:00', 'approved'),
(3, 1, '2025-11-03', '16:00', 'pending'),
(3, 1, '2025-11-04', '10:00', 'rejected');

SELECT 'Database initialized successfully!' as message;
