// functions/api/workout-logs.ts
// PT 운동 일지 API with Gemini AI 파싱

interface Env {
  DB: D1Database;
  GEMINI_API_KEY?: string;
}

interface WorkoutLogRequest {
  studentId: number;
  logDate?: string;
  content: string;
}

interface Exercise {
  exercise_name: string;
  body_part: string | null;
  weight: number | null;
  reps: number | null;
  sets: number | null;
  duration: number | null;
  note: string | null;
}

// Gemini API로 운동 기록 파싱
async function parseWorkoutWithGemini(content: string, apiKey: string): Promise<Exercise[]> {
  const systemPrompt = `운동 기록을 JSON으로 파싱해줘. 반드시 다음 JSON 형식만 반환해:
{
  "exercises": [
    {
      "exercise_name": "운동명",
      "body_part": "하체|상체|코어|전신|유산소|기타",
      "weight": 숫자 또는 null,
      "reps": 숫자 또는 null,
      "sets": 숫자 또는 null,
      "duration": 분 단위 숫자 또는 null,
      "note": "주의사항/메모" 또는 null
    }
  ]
}

부위 분류 기준:
- 하체: 스쿼트, 레그프레스, 런지, 레그컬, 레그익스텐션, 카프레이즈, 힙쓰러스트
- 상체: 벤치프레스, 풀업, 로우, 숄더프레스, 팔굽혀펴기, 랫풀다운, 체스트프레스, 덤벨컬, 딥스
- 코어: 플랭크, 크런치, 레그레이즈, 데드버그, 사이드플랭크, 마운틴클라이머
- 전신: 데드리프트, 버피, 케틀벨스윙, 클린앤저크
- 유산소: 런닝머신, 사이클, 로잉, 점프로프, 걷기, 조깅, 수영, 스텝퍼
- 기타: 위 분류에 해당하지 않는 운동

주의사항이나 메모가 있으면 note에 포함해줘. JSON만 반환하고 다른 텍스트는 포함하지 마.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + '\n\n운동 기록:\n' + content }] }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return [];
    }

    const data = await response.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 추출 (마크다운 코드블록 처리)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());
    return parsed.exercises || [];
  } catch (error) {
    console.error('Gemini parsing error:', error);
    return [];
  }
}

// KST 시간 헬퍼
function getKSTNow(): { date: string; datetime: string } {
  const now = new Date();
  const kstOffset = 9 * 60;
  const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);
  return {
    date: kstNow.toISOString().split('T')[0],
    datetime: kstNow.toISOString().replace('T', ' ').substring(0, 19)
  };
}

// POST: 운동 일지 생성 + AI 파싱
export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const data: WorkoutLogRequest = await request.json();

    if (!data.studentId) {
      return new Response(JSON.stringify({ error: 'studentId is required' }), { status: 400 });
    }
    if (!data.content || data.content.trim() === '') {
      return new Response(JSON.stringify({ error: 'content is required' }), { status: 400 });
    }

    const student = await env.DB.prepare('SELECT id FROM users WHERE id = ? AND role = ?')
      .bind(data.studentId, 'student').first();
    if (!student) {
      return new Response(JSON.stringify({ error: 'Student not found' }), { status: 404 });
    }

    const kst = getKSTNow();
    const logDate = data.logDate || kst.date;

    // 1. workout_logs 저장
    const result = await env.DB.prepare(
      'INSERT INTO workout_logs (student_id, log_date, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(data.studentId, logDate, data.content.trim(), kst.datetime, kst.datetime).run();

    const logId = result.meta.last_row_id;
    let exercises: Exercise[] = [];

    // 2. Gemini로 파싱 후 workout_exercises 저장
    if (env.GEMINI_API_KEY) {
      exercises = await parseWorkoutWithGemini(data.content, env.GEMINI_API_KEY);

      if (exercises.length > 0) {
        const insertStmt = env.DB.prepare(
          'INSERT INTO workout_exercises (log_id, exercise_name, body_part, weight, reps, sets, duration, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        const batch = exercises.map(ex =>
          insertStmt.bind(
            logId,
            ex.exercise_name,
            ex.body_part,
            ex.weight,
            ex.reps,
            ex.sets,
            ex.duration,
            ex.note,
            kst.datetime
          )
        );

        await env.DB.batch(batch);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, logId, logDate, exercises }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Workout log creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

// GET: 운동 일지 조회 (exercises 포함)
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const studentId = url.searchParams.get('studentId');
    const teacherId = url.searchParams.get('teacherId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const logId = url.searchParams.get('id');

    // 단일 로그 조회 (exercises 포함)
    if (logId) {
      const log = await env.DB.prepare(`
        SELECT w.*, u.name as student_name
        FROM workout_logs w
        JOIN users u ON w.student_id = u.id
        WHERE w.id = ?
      `).bind(logId).first();

      if (!log) {
        return new Response(JSON.stringify({ error: 'Log not found' }), { status: 404 });
      }

      const { results: exercises } = await env.DB.prepare(
        'SELECT * FROM workout_exercises WHERE log_id = ? ORDER BY id'
      ).bind(logId).all();

      return new Response(JSON.stringify({ log: { ...log, exercises } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 목록 조회
    let query = `
      SELECT w.id, w.student_id, w.log_date, w.content, w.created_at, w.updated_at, u.name as student_name
      FROM workout_logs w
      JOIN users u ON w.student_id = u.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (studentId) {
      conditions.push('w.student_id = ?');
      params.push(studentId);
    } else if (teacherId) {
      conditions.push(`w.student_id IN (SELECT DISTINCT student_id FROM bookings WHERE teacher_id = ?)`);
      params.push(teacherId);
    }

    if (startDate) {
      conditions.push('w.log_date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('w.log_date <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY w.log_date DESC, w.created_at DESC LIMIT 100';

    const { results: logs } = await env.DB.prepare(query).bind(...params).all();

    // 각 로그에 exercises 추가
    const logsWithExercises = await Promise.all(
      (logs as any[]).map(async (log) => {
        const { results: exercises } = await env.DB.prepare(
          'SELECT * FROM workout_exercises WHERE log_id = ? ORDER BY id'
        ).bind(log.id).all();
        return { ...log, exercises };
      })
    );

    return new Response(JSON.stringify({ logs: logsWithExercises }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get workout logs error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

// PATCH: 운동 일지 수정 + 재파싱
export async function onRequestPatch(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const logId = url.searchParams.get('id');

    if (!logId) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
    }

    const data = await request.json() as { content?: string; logDate?: string };

    const existing = await env.DB.prepare('SELECT id, content FROM workout_logs WHERE id = ?')
      .bind(logId).first<{ id: number; content: string }>();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Workout log not found' }), { status: 404 });
    }

    const updates: string[] = [];
    const updateParams: any[] = [];
    let newContent = existing.content;

    if (data.content !== undefined) {
      updates.push('content = ?');
      updateParams.push(data.content.trim());
      newContent = data.content.trim();
    }
    if (data.logDate !== undefined) {
      updates.push('log_date = ?');
      updateParams.push(data.logDate);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400 });
    }

    const kst = getKSTNow();
    updates.push('updated_at = ?');
    updateParams.push(kst.datetime);
    updateParams.push(logId);

    await env.DB.prepare(
      `UPDATE workout_logs SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...updateParams).run();

    // content가 변경되면 exercises 재파싱
    let exercises: Exercise[] = [];
    if (data.content !== undefined && env.GEMINI_API_KEY) {
      // 기존 exercises 삭제
      await env.DB.prepare('DELETE FROM workout_exercises WHERE log_id = ?').bind(logId).run();

      // 재파싱
      exercises = await parseWorkoutWithGemini(newContent, env.GEMINI_API_KEY);

      if (exercises.length > 0) {
        const insertStmt = env.DB.prepare(
          'INSERT INTO workout_exercises (log_id, exercise_name, body_part, weight, reps, sets, duration, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        const batch = exercises.map(ex =>
          insertStmt.bind(
            logId,
            ex.exercise_name,
            ex.body_part,
            ex.weight,
            ex.reps,
            ex.sets,
            ex.duration,
            ex.note,
            kst.datetime
          )
        );

        await env.DB.batch(batch);
      }
    }

    return new Response(JSON.stringify({ ok: true, message: 'Workout log updated', exercises }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Update workout log error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

// DELETE: 운동 일지 삭제 (CASCADE로 exercises도 삭제)
export async function onRequestDelete(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const logId = url.searchParams.get('id');

    if (!logId) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
    }

    // exercises 먼저 삭제 (SQLite에서 CASCADE가 안 될 수 있음)
    await env.DB.prepare('DELETE FROM workout_exercises WHERE log_id = ?').bind(logId).run();

    const result = await env.DB.prepare('DELETE FROM workout_logs WHERE id = ?')
      .bind(logId).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ error: 'Workout log not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ ok: true, message: 'Workout log deleted' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Delete workout log error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
