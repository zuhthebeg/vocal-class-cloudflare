// functions/api/workout-logs.ts
// PT 운동 일지 API

interface Env {
  DB: D1Database;
}

interface WorkoutLogRequest {
  studentId: number;
  logDate?: string;  // YYYY-MM-DD, 없으면 오늘 날짜
  content: string;   // 자연어 운동 기록
}

// POST: 운동 일지 생성
export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const data: WorkoutLogRequest = await request.json();

    // 필수 필드 검증
    if (!data.studentId) {
      return new Response(JSON.stringify({ error: 'studentId is required' }), { status: 400 });
    }
    if (!data.content || data.content.trim() === '') {
      return new Response(JSON.stringify({ error: 'content is required' }), { status: 400 });
    }

    // 학생 존재 확인
    const student = await env.DB.prepare('SELECT id FROM users WHERE id = ? AND role = ?')
      .bind(data.studentId, 'student').first();
    if (!student) {
      return new Response(JSON.stringify({ error: 'Student not found' }), { status: 404 });
    }

    // 날짜 처리: 없으면 오늘 (KST 기준)
    let logDate = data.logDate;
    if (!logDate) {
      const now = new Date();
      const kstOffset = 9 * 60;
      const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);
      logDate = kstNow.toISOString().split('T')[0];
    }

    // KST 기준 현재 시간
    const now = new Date();
    const kstOffset = 9 * 60;
    const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);
    const createdAt = kstNow.toISOString().replace('T', ' ').substring(0, 19);

    // 운동 일지 저장
    const result = await env.DB.prepare(
      'INSERT INTO workout_logs (student_id, log_date, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(data.studentId, logDate, data.content.trim(), createdAt, createdAt).run();

    return new Response(
      JSON.stringify({ ok: true, logId: result.meta.last_row_id, logDate }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Workout log creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

// GET: 운동 일지 조회
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const studentId = url.searchParams.get('studentId');
    const teacherId = url.searchParams.get('teacherId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let query = `
      SELECT
        w.id,
        w.student_id,
        w.log_date,
        w.content,
        w.created_at,
        w.updated_at,
        u.name as student_name
      FROM workout_logs w
      JOIN users u ON w.student_id = u.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (studentId) {
      // 학생 본인 기록 조회
      conditions.push('w.student_id = ?');
      params.push(studentId);
    } else if (teacherId) {
      // 강사가 담당 학생들의 기록 조회 (bookings 기반)
      conditions.push(`w.student_id IN (
        SELECT DISTINCT student_id FROM bookings WHERE teacher_id = ?
      )`);
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

    const { results } = await env.DB.prepare(query).bind(...params).all();

    return new Response(JSON.stringify({ logs: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get workout logs error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

// PATCH: 운동 일지 수정
export async function onRequestPatch(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const logId = url.searchParams.get('id');

    if (!logId) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
    }

    const data = await request.json() as { content?: string; logDate?: string };

    // 기존 기록 확인
    const existing = await env.DB.prepare('SELECT id FROM workout_logs WHERE id = ?')
      .bind(logId).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Workout log not found' }), { status: 404 });
    }

    // 업데이트할 필드 구성
    const updates: string[] = [];
    const updateParams: any[] = [];

    if (data.content !== undefined) {
      updates.push('content = ?');
      updateParams.push(data.content.trim());
    }
    if (data.logDate !== undefined) {
      updates.push('log_date = ?');
      updateParams.push(data.logDate);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400 });
    }

    // KST 기준 업데이트 시간
    const now = new Date();
    const kstOffset = 9 * 60;
    const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);
    const updatedAt = kstNow.toISOString().replace('T', ' ').substring(0, 19);
    updates.push('updated_at = ?');
    updateParams.push(updatedAt);

    updateParams.push(logId);

    await env.DB.prepare(
      `UPDATE workout_logs SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...updateParams).run();

    return new Response(JSON.stringify({ ok: true, message: 'Workout log updated' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Update workout log error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

// DELETE: 운동 일지 삭제
export async function onRequestDelete(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const logId = url.searchParams.get('id');

    if (!logId) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
    }

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
