// functions/api/bookings.ts

interface Env {
  DB: D1Database;
}

interface BookingRequest {
  studentId: number;
  teacherId: number;
  bookingDate: string; // 'YYYY-MM-DD'
  timeSlot?: string; // 'HH:MM' - set by teacher when approving
  suggestedTimeSlots?: string[]; // student's suggested available times
  status?: string; // Optional, defaults to 'pending'
}

// POST: 예약 요청 생성
export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const data: BookingRequest = await request.json();

    if (!data.studentId || !data.teacherId || !data.bookingDate) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Either timeSlot or suggestedTimeSlots must be provided
    if (!data.timeSlot && (!data.suggestedTimeSlots || data.suggestedTimeSlots.length === 0)) {
      return new Response(JSON.stringify({ error: 'Either timeSlot or suggestedTimeSlots required' }), {
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

    // 시간 형식 검증 (timeSlot이 제공된 경우에만)
    if (data.timeSlot && !/^\d{1,2}:\d{2}$/.test(data.timeSlot)) {
      return new Response(JSON.stringify({ error: 'Invalid time format. Use HH:MM' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 예약 요청 생성
    const status = data.status || 'pending';
    const suggestedTimeSlotsJson = data.suggestedTimeSlots ? JSON.stringify(data.suggestedTimeSlots) : null;

    const result = await env.DB.prepare(`
      INSERT INTO bookings (student_id, teacher_id, booking_date, time_slot, suggested_time_slots, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
      .bind(data.studentId, data.teacherId, data.bookingDate, data.timeSlot || null, suggestedTimeSlotsJson, status)
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
    const bookingId = url.searchParams.get('bookingId'); // For fetching a single booking

    let query = `
      SELECT
        b.id,
        b.booking_date,
        b.time_slot,
        b.suggested_time_slots,
        b.status,
        b.created_at,
        b.student_id,
        u_student.name as student_name,
        b.teacher_id,
        u_teacher.name as teacher_name
      FROM bookings b
      JOIN users u_student ON b.student_id = u_student.id
      JOIN users u_teacher ON b.teacher_id = u_teacher.id
    `;

    const params: any[] = [];

    if (bookingId) {
      query += ' WHERE b.id = ?';
      params.push(bookingId);
    } else {
      query += ' WHERE 1=1';
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
    }

    query += ' ORDER BY b.booking_date DESC, b.time_slot DESC LIMIT 200';

    // 단일 조회인 경우
    if (bookingId) {
        const booking: any = await env.DB.prepare(query).bind(...params).first();
        if (booking) {
            booking.suggested_time_slots = booking.suggested_time_slots ? JSON.parse(booking.suggested_time_slots) : null;
        }
        return new Response(JSON.stringify({ booking }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    // 목록 조회인 경우
    const { results } = await env.DB.prepare(query).bind(...params).all();

    // Parse JSON strings to arrays for suggested_time_slots
    const bookingsWithParsedTimes = results.map((booking: any) => ({
      ...booking,
      suggested_time_slots: booking.suggested_time_slots ? JSON.parse(booking.suggested_time_slots) : null
    }));

    return new Response(
      JSON.stringify({ bookings: bookingsWithParsedTimes }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Booking fetch error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
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

    // Query parameters: /api/bookings?id=123&action=approve&selectedTime=18:00
    const bookingId = url.searchParams.get('id');
    const action = url.searchParams.get('action');
    const selectedTime = url.searchParams.get('selectedTime');

    if (!bookingId || !action) {
      return new Response(JSON.stringify({ error: 'Missing id or action parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 예약이 존재하는지 확인
    const booking = await env.DB.prepare(`
      SELECT status, suggested_time_slots, time_slot FROM bookings WHERE id = ?
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

      // 승인 시 선택된 시간 필수
      if (!selectedTime) {
        return new Response(
          JSON.stringify({ error: 'selectedTime is required for approval' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // 선택된 시간이 제시된 시간 중 하나인지 확인
      const suggestedTimes = booking.suggested_time_slots ? JSON.parse(booking.suggested_time_slots as string) : [];
      if (suggestedTimes.length > 0 && !suggestedTimes.includes(selectedTime)) {
        return new Response(
          JSON.stringify({ error: 'Selected time must be one of the suggested times' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // 시간 형식 검증
      if (!/^\d{1,2}:\d{2}$/.test(selectedTime)) {
        return new Response(
          JSON.stringify({ error: 'Invalid time format. Use HH:MM' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // 승인 시 time_slot도 함께 업데이트
      await env.DB.prepare(`
        UPDATE bookings SET status = ?, time_slot = ? WHERE id = ?
      `)
        .bind(newStatus, selectedTime, bookingId)
        .run();

    } else if (action === 'reject') {
      newStatus = 'rejected';

      // 거절 시 time_slot 업데이트 없이 상태만 변경
      await env.DB.prepare(`
        UPDATE bookings SET status = ? WHERE id = ?
      `)
        .bind(newStatus, bookingId)
        .run();

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use approve or reject' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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

// DELETE: 예약 삭제 (Admin) 또는 전체 삭제
export async function onRequestDelete(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const bookingId = url.searchParams.get('id');

    // ID가 있으면 해당 예약만 삭제
    if (bookingId) {
      // First, delete related attendance records to avoid orphaned data
      await env.DB.prepare('DELETE FROM attendances WHERE booking_id = ?').bind(bookingId).run();
      // Now, delete the booking itself
      const result = await env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(bookingId).run();

      if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 });
      }
      return new Response(JSON.stringify({ ok: true, message: `Booking ${bookingId} deleted` }));
    }

    // ID가 없으면 전체 예약 삭제
    // Also delete all attendance records that might be linked.
    await env.DB.batch([
        env.DB.prepare('DELETE FROM attendances'),
        env.DB.prepare('DELETE FROM bookings')
    ]);

    return new Response(JSON.stringify({ ok: true, message: 'All bookings and attendance records have been deleted.' }));

  } catch (error) {
    console.error('Booking deletion error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
