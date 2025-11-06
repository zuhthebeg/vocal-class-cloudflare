// functions/api/attendance.ts
// Pages Functions는 자동으로 /api/attendance 엔드포인트로 매핑됩니다

interface Env {
  DB: D1Database;
  STORAGE?: R2Bucket; // Optional: R2 bucket for storing signature images
}

interface AttendanceRequest {
  sessionId: string;
  studentName: string;
  bookingId?: number;
  signature?: string; // Base64 이미지
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const data: AttendanceRequest = await request.json();

    let studentId: number;
    let studentName = data.studentName;

    // If bookingId is provided, use it to get the definitive student_id
    if (data.bookingId) {
      const booking = await env.DB.prepare('SELECT student_id FROM bookings WHERE id = ?').bind(data.bookingId).first<{ student_id: number }>();
      if (!booking) {
        return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 });
      }
      studentId = booking.student_id;

      // We can also get the student's name for consistency, overriding the potentially incorrect one from the client
      const studentUser = await env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(studentId).first<{ name: string }>();
      if (studentUser) {
        studentName = studentUser.name;
      }

    } else if (data.studentName) {
      // If no bookingId, find or create student by name (for walk-ins)
      let student = await env.DB.prepare('SELECT id FROM users WHERE name = ? AND role = ?').bind(data.studentName, 'student').first<{ id: number }>();
      if (!student) {
        // 한국시간(KST = UTC+9) 기준으로 현재 날짜 및 한달 후 계산
        const now = new Date();
        const kstOffset = 9 * 60;
        const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);
        const startDate = kstNow.toISOString().split('T')[0];
        const oneMonthLater = new Date(kstNow);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        const endDate = oneMonthLater.toISOString().split('T')[0];

        const insertResult = await env.DB.prepare('INSERT INTO users (name, role, start_date, end_date) VALUES (?, ?, ?, ?)').bind(data.studentName, 'student', startDate, endDate).run();
        studentId = insertResult.meta.last_row_id;
      } else {
        studentId = student.id;
      }
    } else {
      return new Response(JSON.stringify({ error: 'studentName or bookingId is required' }), { status: 400 });
    }

    if (!data.sessionId) {
        return new Response(JSON.stringify({ error: 'Missing sessionId' }), { status: 400 });
    }

    // 서명 이미지가 있으면 R2에 저장 (R2가 설정된 경우에만)
    let signatureUrl = null;
    if (data.signature && env.STORAGE) {
      try {
        const signatureKey = `signatures/${data.sessionId}_${studentId}_${Date.now()}.png`;
        const base64Data = data.signature.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        await env.STORAGE.put(signatureKey, buffer, { httpMetadata: { contentType: 'image/png' } });
        signatureUrl = signatureKey;
      } catch (error) {
        console.error('R2 upload error:', error);
      }
    } else if (data.signature) {
      signatureUrl = data.signature; // Fallback to storing base64
    }

    // 한국시간(KST = UTC+9)으로 출석 시간 설정
    const now = new Date();
    const kstOffset = 9 * 60; // KST는 UTC+9
    const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);
    const attendedAt = kstNow.toISOString().replace('T', ' ').substring(0, 19); // 'YYYY-MM-DD HH:MM:SS' 형식

    // 출석 기록 저장
    const result = await env.DB.prepare(
      'INSERT INTO attendances (booking_id, student_id, session_id, signature_url, attended_at)'
      + ' VALUES (?, ?, ?, ?, ?)'
    ).bind(data.bookingId || null, studentId, data.sessionId, signatureUrl, attendedAt).run();

    // bookingId가 있으면 예약 상태를 'completed'로 업데이트
    if (data.bookingId) {
      await env.DB.prepare('UPDATE bookings SET status = \'completed\' WHERE id = ?').bind(data.bookingId).run();
    }

    return new Response(
      JSON.stringify({ ok: true, attendanceId: result.meta.last_row_id, signatureUrl: signatureUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Attendance error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

// GET 요청: 출석 목록 조회
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const studentId = url.searchParams.get('studentId');

    let query = `
      SELECT
        a.id,
        a.booking_id,
        a.student_id,
        a.session_id,
        a.signature_url,
        a.attended_at,
        u.name as student_name
      FROM attendances a
      JOIN users u ON a.student_id = u.id
    `;
    const params: any[] = [];

    if (sessionId) {
      query += ' WHERE a.session_id = ?';
      params.push(sessionId);
    } else if (studentId) {
      query += ' WHERE a.student_id = ?';
      params.push(studentId);
    }

    query += ' ORDER BY a.attended_at DESC LIMIT 100';

    const { results } = await env.DB.prepare(query).bind(...params).all();

    return new Response(JSON.stringify({ attendances: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get attendances error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// DELETE: 출석 기록 삭제 (Admin) 또는 전체 삭제
export async function onRequestDelete(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const attendanceId = url.searchParams.get('id');

    // ID가 있으면 해당 기록만 삭제
    if (attendanceId) {
      const result = await env.DB.prepare('DELETE FROM attendances WHERE id = ?').bind(attendanceId).run();
      if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'Attendance record not found' }), { status: 404 });
      }
      return new Response(JSON.stringify({ ok: true, message: `Attendance record ${attendanceId} deleted` }));
    }

    // ID가 없으면 전체 출석 기록 삭제
    await env.DB.prepare('DELETE FROM attendances').run();

    return new Response(JSON.stringify({ ok: true, message: 'All attendance records have been deleted.' }));

  } catch (error) {
    console.error('Attendance deletion error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
