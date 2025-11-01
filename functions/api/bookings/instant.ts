// functions/api/bookings/instant.ts
// 즉석 수업 출석을 위한 예약 생성 또는 조회

interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
}

interface InstantBookingRequest {
  studentId: number;
  teacherId: number;
  bookingDate: string; // YYYY-MM-DD
  timeSlot: string; // HH:MM-HH:MM
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    const data: InstantBookingRequest = await request.json();

    // 입력 검증
    if (!data.studentId || !data.teacherId || !data.bookingDate || !data.timeSlot) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: studentId, teacherId, bookingDate, timeSlot' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 기존 예약 확인 (같은 날짜, 시간, 강사, 학생)
    const existingBooking = await env.DB.prepare(`
      SELECT id, status
      FROM bookings
      WHERE student_id = ?
        AND teacher_id = ?
        AND booking_date = ?
        AND time_slot = ?
      ORDER BY created_at DESC
      LIMIT 1
    `)
      .bind(data.studentId, data.teacherId, data.bookingDate, data.timeSlot)
      .first<{ id: number; status: string }>();

    // 기존 예약이 있고 취소되지 않았다면 해당 예약 사용
    if (existingBooking && existingBooking.status !== 'cancelled') {
      console.log('Using existing booking:', existingBooking.id);
      return new Response(
        JSON.stringify({
          success: true,
          bookingId: existingBooking.id,
          isNew: false,
          message: 'Existing booking found'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 새 예약 생성 (즉석 출석이므로 바로 approved 상태)
    const result = await env.DB.prepare(`
      INSERT INTO bookings (
        student_id,
        teacher_id,
        booking_date,
        time_slot,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, 'approved', datetime('now'))
    `)
      .bind(data.studentId, data.teacherId, data.bookingDate, data.timeSlot)
      .run();

    if (!result.success) {
      throw new Error('Failed to create instant booking');
    }

    // 방금 생성된 예약 ID 가져오기
    const newBooking = await env.DB.prepare(`
      SELECT id
      FROM bookings
      WHERE student_id = ?
        AND teacher_id = ?
        AND booking_date = ?
        AND time_slot = ?
      ORDER BY created_at DESC
      LIMIT 1
    `)
      .bind(data.studentId, data.teacherId, data.bookingDate, data.timeSlot)
      .first<{ id: number }>();

    if (!newBooking) {
      throw new Error('Failed to retrieve created booking');
    }

    console.log('Created new instant booking:', newBooking.id);

    return new Response(
      JSON.stringify({
        success: true,
        bookingId: newBooking.id,
        isNew: true,
        message: 'Instant booking created successfully'
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Instant booking error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process instant booking',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
