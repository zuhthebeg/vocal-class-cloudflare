// functions/api/schedule.ts

interface Env {
  DB: D1Database;
}

interface ScheduleRequest {
  teacherId: number;
  schedules: Array<{
    dayOfWeek: string;
    timeSlot: string;
    isAvailable: boolean;
  }>;
}

// POST: 스케줄 저장/업데이트
export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const data: ScheduleRequest = await request.json();

    if (!data.teacherId || !data.schedules) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 기존 스케줄 삭제
    await env.DB.prepare('DELETE FROM schedules WHERE teacher_id = ?')
      .bind(data.teacherId)
      .run();

    // 새 스케줄 일괄 삽입
    const statements = data.schedules.map(schedule => 
      env.DB.prepare(`
        INSERT INTO schedules (teacher_id, day_of_week, time_slot, is_available)
        VALUES (?, ?, ?, ?)
      `).bind(
        data.teacherId,
        schedule.dayOfWeek,
        schedule.timeSlot,
        schedule.isAvailable ? 1 : 0
      )
    );

    await env.DB.batch(statements);

    return new Response(
      JSON.stringify({ ok: true, message: 'Schedule saved successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Schedule save error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// GET: 스케줄 조회
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const teacherId = url.searchParams.get('teacherId');

    if (!teacherId) {
      return new Response(JSON.stringify({ error: 'Teacher ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { results } = await env.DB.prepare(`
      SELECT id, day_of_week, time_slot, is_available
      FROM schedules
      WHERE teacher_id = ? AND is_available = 1
      ORDER BY 
        CASE day_of_week
          WHEN 'monday' THEN 1
          WHEN 'tuesday' THEN 2
          WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4
          WHEN 'friday' THEN 5
          WHEN 'saturday' THEN 6
          WHEN 'sunday' THEN 7
        END,
        time_slot
    `)
      .bind(teacherId)
      .all();

    return new Response(
      JSON.stringify({ schedules: results }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Schedule fetch error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
