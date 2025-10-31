// functions/api/bookings.ts

interface Env {
  DB: D1Database;
}

interface BookingRequest {
  studentId: number;
  teacherId: number;
  bookingDate: string; // 'YYYY-MM-DD'
  timeSlot: string; // 'HH:MM'
  status?: string; // Optional, defaults to 'pending'
}

// POST: 예약 요청 생성
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

    // 같은 학생이 같은 시간에 이미 예약 요청했는지 확인 (pending or approved)
    const studentBooking = await env.DB.prepare(`
      SELECT id FROM bookings
      WHERE student_id = ? AND booking_date = ? AND time_slot = ?
      AND status IN ('pending', 'approved')
    `)
      .bind(data.studentId, data.bookingDate, data.timeSlot)
      .first();

    if (studentBooking) {
      return new Response(
        JSON.stringify({ error: 'You have already requested this time slot' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 예약 요청 생성 (기본 상태: pending)
    const status = data.status || 'pending';
    const result = await env.DB.prepare(`
      INSERT INTO bookings (student_id, teacher_id, booking_date, time_slot, status)
      VALUES (?, ?, ?, ?, ?)
    `)
      .bind(data.studentId, data.teacherId, data.bookingDate, data.timeSlot, status)
      .run();

    return new Response(
      JSON.stringify({
        ok: true,
        bookingId: result.meta.last_row_id,
        message: 'Booking request created successfully',
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

// PATCH: 예약 상태 업데이트 (승인/거절)
export async function onRequestPatch(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);

    // Query parameters: /api/bookings?id=123&action=approve
    const bookingId = url.searchParams.get('id');
    const action = url.searchParams.get('action');

    if (!bookingId || !action) {
      return new Response(JSON.stringify({ error: 'Missing id or action parameter' }), {
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

    // 이미 처리된 예약인지 확인
    if (booking.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Booking is already ${booking.status}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 상태 업데이트
    let newStatus: string;
    if (action === 'approve') {
      newStatus = 'approved';
    } else if (action === 'reject') {
      newStatus = 'rejected';
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use /approve or /reject' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    await env.DB.prepare(`
      UPDATE bookings SET status = ? WHERE id = ?
    `)
      .bind(newStatus, bookingId)
      .run();

    return new Response(
      JSON.stringify({ ok: true, message: `Booking ${newStatus}`, status: newStatus }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Booking update error:', error);
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
