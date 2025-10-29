// functions/api/bookings.ts

interface Env {
  DB: D1Database;
}

interface BookingRequest {
  studentId: number;
  teacherId: number;
  bookingDate: string; // 'YYYY-MM-DD'
  timeSlot: string; // 'HH:MM'
}

// POST: 예약 생성
export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const data: BookingRequest = await request.json();

    if (!data.studentId || !data.teacherId || !data.bookingDate || !data.timeSlot) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 날짜 형식 검증
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.bookingDate)) {
      return new Response(JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 시간 형식 검증
    if (!/^\d{1,2}:\d{2}$/.test(data.timeSlot)) {
      return new Response(JSON.stringify({ error: 'Invalid time format. Use HH:MM' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 스케줄이 존재하는지 확인
    const schedule = await env.DB.prepare(`
      SELECT id FROM schedules
      WHERE teacher_id = ? AND specific_date = ? AND time_slot = ? AND is_available = 1
    `)
      .bind(data.teacherId, data.bookingDate, data.timeSlot)
      .first();

    if (!schedule) {
      return new Response(
        JSON.stringify({ error: 'Schedule not available for this time slot' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 중복 예약 확인 (같은 날짜/시간에 다른 학생의 예약이 있는지)
    const existingBooking = await env.DB.prepare(`
      SELECT id FROM bookings
      WHERE teacher_id = ? AND booking_date = ? AND time_slot = ? AND status != 'cancelled'
    `)
      .bind(data.teacherId, data.bookingDate, data.timeSlot)
      .first();

    if (existingBooking) {
      return new Response(
        JSON.stringify({ error: 'Time slot already booked' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 같은 학생이 이미 예약했는지 확인
    const studentBooking = await env.DB.prepare(`
      SELECT id FROM bookings
      WHERE student_id = ? AND booking_date = ? AND time_slot = ? AND status != 'cancelled'
    `)
      .bind(data.studentId, data.bookingDate, data.timeSlot)
      .first();

    if (studentBooking) {
      return new Response(
        JSON.stringify({ error: 'You have already booked this time slot' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 예약 생성
    const result = await env.DB.prepare(`
      INSERT INTO bookings (student_id, teacher_id, booking_date, time_slot, status)
      VALUES (?, ?, ?, ?, 'confirmed')
    `)
      .bind(data.studentId, data.teacherId, data.bookingDate, data.timeSlot)
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
    const bookingDate = url.searchParams.get('bookingDate');

    let query = `
      SELECT
        b.id,
        b.booking_date,
        b.time_slot,
        b.status,
        b.created_at,
        u_student.name as student_name,
        u_teacher.name as teacher_name
      FROM bookings b
      JOIN users u_student ON b.student_id = u_student.id
      JOIN users u_teacher ON b.teacher_id = u_teacher.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // 학생별 조회
    if (studentId) {
      query += ' AND b.student_id = ?';
      params.push(studentId);
    }

    // 강사별 조회
    if (teacherId) {
      query += ' AND b.teacher_id = ?';
      params.push(teacherId);
    }

    // 특정 날짜 조회
    if (bookingDate) {
      query += ' AND b.booking_date = ?';
      params.push(bookingDate);
    }

    query += ' ORDER BY b.booking_date DESC, b.time_slot DESC LIMIT 200';

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

    // 예약이 존재하는지 확인
    const booking = await env.DB.prepare(`
      SELECT status FROM bookings WHERE id = ?
    `)
      .bind(bookingId)
      .first();

    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (booking.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Booking is already cancelled' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 예약 취소 (상태 업데이트)
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
