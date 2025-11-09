-- Seed data for lesson categories
-- 기본 수업 카테고리 추가

INSERT OR IGNORE INTO lesson_categories (name, icon, description) VALUES
('보컬', '🎤', '보컬 트레이닝 및 노래 레슨'),
('PT', '💪', '퍼스널 트레이닝 및 운동 지도'),
('드로잉', '🎨', '그림 및 드로잉 레슨'),
('피아노', '🎹', '피아노 레슨'),
('기타', '🎸', '기타 레슨'),
('요가', '🧘', '요가 및 스트레칭 레슨');

-- 각 카테고리별 기본 도구 설정

-- 보컬 카테고리 도구
INSERT OR IGNORE INTO lesson_tools (lesson_category_id, tool_type, is_enabled, display_order)
SELECT id, 'drawing', 1, 1 FROM lesson_categories WHERE name = '보컬'
UNION ALL
SELECT id, 'audio', 1, 2 FROM lesson_categories WHERE name = '보컬'
UNION ALL
SELECT id, 'video', 1, 3 FROM lesson_categories WHERE name = '보컬';

-- PT 카테고리 도구
INSERT OR IGNORE INTO lesson_tools (lesson_category_id, tool_type, is_enabled, display_order)
SELECT id, 'drawing', 1, 1 FROM lesson_categories WHERE name = 'PT'
UNION ALL
SELECT id, 'video', 1, 2 FROM lesson_categories WHERE name = 'PT';

-- 드로잉 카테고리 도구
INSERT OR IGNORE INTO lesson_tools (lesson_category_id, tool_type, is_enabled, display_order)
SELECT id, 'drawing', 1, 1 FROM lesson_categories WHERE name = '드로잉'
UNION ALL
SELECT id, 'video', 1, 2 FROM lesson_categories WHERE name = '드로잉';

-- 피아노 카테고리 도구
INSERT OR IGNORE INTO lesson_tools (lesson_category_id, tool_type, is_enabled, display_order)
SELECT id, 'audio', 1, 1 FROM lesson_categories WHERE name = '피아노'
UNION ALL
SELECT id, 'video', 1, 2 FROM lesson_categories WHERE name = '피아노';

-- 기타 카테고리 도구
INSERT OR IGNORE INTO lesson_tools (lesson_category_id, tool_type, is_enabled, display_order)
SELECT id, 'audio', 1, 1 FROM lesson_categories WHERE name = '기타'
UNION ALL
SELECT id, 'video', 1, 2 FROM lesson_categories WHERE name = '기타';

-- 요가 카테고리 도구
INSERT OR IGNORE INTO lesson_tools (lesson_category_id, tool_type, is_enabled, display_order)
SELECT id, 'video', 1, 1 FROM lesson_categories WHERE name = '요가'
UNION ALL
SELECT id, 'drawing', 1, 2 FROM lesson_categories WHERE name = '요가';
