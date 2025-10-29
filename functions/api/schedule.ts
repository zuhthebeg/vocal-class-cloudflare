// functions/api/schedule.ts

interface Env {
  DB: D1Database;
}

interface ScheduleRequest {
  teacherId: number;
  date: string; // 'YYYY-MM-DD'
  timeSlots: string[]; // ['10:00', '10:30', ...]
}

// POST: 특정 날짜의 스케줄 저장/업데이트
export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const data: ScheduleRequest = await request.json();

    if (!data.teacherId || !data.date || !data.timeSlots) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 날짜 형식 검증 (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      return new Response(JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 해당 날짜에 이미 예약이 있는지 확인
    const existingBookings = await env.DB.prepare(`
      SELECT time_slot FROM bookings
      WHERE teacher_id = ? AND booking_date = ? AND status != 'cancelled'
    `)
      .bind(data.teacherId, data.date)
      .all();

    const bookedTimeSlots = new Set(existingBookings.results.map((b: any) => b.time_slot));

    // 예약된 시간이 포함되어 있으면 에러
    const conflictingSlots = data.timeSlots.filter(slot => bookedTimeSlots.has(slot));
    if (conflictingSlots.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Cannot modify schedule with existing bookings',
          conflictingSlots: conflictingSlots
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 해당 날짜의 기존 스케줄 삭제 (예약되지 않은 것만)
    await env.DB.prepare(`
      DELETE FROM schedules
      WHERE teacher_id = ? AND specific_date = ?
    `)
      .bind(data.teacherId, data.date)
      .run();

    // 새 스케줄 일괄 삽입
    if (data.timeSlots.length > 0) {
      const statements = data.timeSlots.map(timeSlot =>
        env.DB.prepare(`
          INSERT INTO schedules (teacher_id, specific_date, time_slot, is_available)
          VALUES (?, ?, ?, 1)
        `).bind(data.teacherId, data.date, timeSlot)
      );

      await env.DB.batch(statements);
    }

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

// GET: 스케줄 조회 (날짜 범위 또는 특정 날짜)
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const teacherId = url.searchParams.get('teacherId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const date = url.searchParams.get('date');

    if (!teacherId) {
      return new Response(JSON.stringify({ error: 'Teacher ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let query = `
      SELECT id, specific_date, time_slot, is_available
      FROM schedules
      WHERE teacher_id = ? AND is_available = 1
    `;
    const params: any[] = [teacherId];

    // 특정 날짜 조회
    if (date) {
      query += ' AND specific_date = ?';
      params.push(date);
    }
    // 날짜 범위 조회
    else if (startDate && endDate) {
      query += ' AND specific_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    // 미래 날짜만 조회 (기본)
    else {
      query += ' AND specific_date >= date("now")';
    }

    query += ' ORDER BY specific_date, time_slot';

    const { results } = await env.DB.prepare(query).bind(...params).all();

    // 날짜별로 그룹화
    const schedulesByDate: { [date: string]: string[] } = {};
    results.forEach((row: any) => {
      if (!schedulesByDate[row.specific_date]) {
        schedulesByDate[row.specific_date] = [];
      }
      schedulesByDate[row.specific_date].push(row.time_slot);
    });

    return new Response(
      JSON.stringify({
        schedules: results,
        schedulesByDate: schedulesByDate
      }),
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

// DELETE: 특정 날짜의 스케줄 삭제
export async function onRequestDelete(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const teacherId = url.searchParams.get('teacherId');
    const date = url.searchParams.get('date');
    const timeSlot = url.searchParams.get('timeSlot');

    if (!teacherId || !date) {
      return new Response(JSON.stringify({ error: 'Teacher ID and date required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 예약이 있는지 확인
    let checkQuery = `
      SELECT id FROM bookings
      WHERE teacher_id = ? AND booking_date = ? AND status != 'cancelled'
    `;
    const checkParams: any[] = [teacherId, date];

    if (timeSlot) {
      checkQuery += ' AND time_slot = ?';
      checkParams.push(timeSlot);
    }

    const existingBooking = await env.DB.prepare(checkQuery)
      .bind(...checkParams)
      .first();

    if (existingBooking) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete schedule with existing bookings' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 스케줄 삭제
    let deleteQuery = `
      DELETE FROM schedules
      WHERE teacher_id = ? AND specific_date = ?
    `;
    const deleteParams: any[] = [teacherId, date];

    if (timeSlot) {
      deleteQuery += ' AND time_slot = ?';
      deleteParams.push(timeSlot);
    }

    await env.DB.prepare(deleteQuery).bind(...deleteParams).run();

    return new Response(
      JSON.stringify({ ok: true, message: 'Schedule deleted successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Schedule delete error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
