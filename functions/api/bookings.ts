// functions/api/bookings.ts

interface Env {
  DB: D1Database;
}

interface BookingRequest {
  studentId: number;
  teacherId: number;
  scheduleId: number;
  bookingDate: string; // YYYY-MM-DD 형식
}

// POST: 예약 생성
export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const data: BookingRequest = await request.json();

    if (!data.studentId || !data.teacherId || !data.scheduleId || !data.bookingDate) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 중복 예약 확인
    const existing = await env.DB.prepare(`
      SELECT id FROM bookings
      WHERE schedule_id = ? AND booking_date = ? AND status != 'cancelled'
    `)
      .bind(data.scheduleId, data.bookingDate)
      .first();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Time slot already booked' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 예약 생성
    const result = await env.DB.prepare(`
      INSERT INTO bookings (student_id, teacher_id, schedule_id, booking_date, status)
      VALUES (?, ?, ?, ?, 'confirmed')
    `)
      .bind(data.studentId, data.teacherId, data.scheduleId, data.bookingDate)
      .run();

    return new Response(
      JSON.stringify({
        ok: true,
        bookingId: result.meta.last_row_id,
        message: 'Booking created successfully',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Booking creation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// GET: 예약 목록 조회
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const studentId = url.searchParams.get('studentId');
    const teacherId = url.searchParams.get('teacherId');

    let query = `
      SELECT 
        b.id,
        b.booking_date,
        b.status,
        b.created_at,
        s.day_of_week,
        s.time_slot,
        u_student.name as student_name,
        u_teacher.name as teacher_name
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.id
      JOIN users u_student ON b.student_id = u_student.id
      JOIN users u_teacher ON b.teacher_id = u_teacher.id
    `;

    const params: any[] = [];

    if (studentId) {
      query += ' WHERE b.student_id = ?';
      params.push(studentId);
    } else if (teacherId) {
      query += ' WHERE b.teacher_id = ?';
      params.push(teacherId);
    }

    query += ' ORDER BY b.booking_date DESC, s.time_slot DESC LIMIT 100';

    const { results } = await env.DB.prepare(query).bind(...params).all();

    return new Response(
      JSON.stringify({ bookings: results }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Booking fetch error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// DELETE: 예약 취소
export async function onRequestDelete(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const bookingId = url.searchParams.get('id');

    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Booking ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.DB.prepare(`
      UPDATE bookings SET status = 'cancelled' WHERE id = ?
    `)
      .bind(bookingId)
      .run();

    return new Response(
      JSON.stringify({ ok: true, message: 'Booking cancelled' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Booking cancellation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
