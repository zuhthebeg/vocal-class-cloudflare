-- Class.cocy.io - 취미의 기록
-- New schema for hobby journal app

-- Drop old tables
DROP TABLE IF EXISTS ai_chats;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS hobbies;
DROP TABLE IF EXISTS workout_logs;
DROP TABLE IF EXISTS workout_stats;
DROP TABLE IF EXISTS chat_sessions;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS teacher_profiles;
DROP TABLE IF EXISTS drawings;
DROP TABLE IF EXISTS recordings;
DROP TABLE IF EXISTS attendances;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

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
    category TEXT NOT NULL DEFAULT 'other',
    icon TEXT DEFAULT '🎯',
    color TEXT DEFAULT '#6366f1',
    sort_order INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 기록 (핵심 테이블)
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
);

CREATE INDEX idx_entries_user_date ON entries(user_id, entry_date DESC);
CREATE INDEX idx_entries_hobby ON entries(hobby_id, entry_date DESC);

-- 목표
CREATE TABLE goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    hobby_id INTEGER,
    title TEXT NOT NULL,
    target_count INTEGER DEFAULT 0,
    current_count INTEGER DEFAULT 0,
    period TEXT DEFAULT 'monthly',
    deadline TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE SET NULL
);

-- AI 대화
CREATE TABLE ai_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_chats_user ON ai_chats(user_id, created_at DESC);
