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

    if (!data.sessionId || !data.studentName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 학생 조회 또는 생성
    let student = await env.DB.prepare(
      'SELECT id FROM users WHERE name = ? AND role = ?'
    )
      .bind(data.studentName, 'student')
      .first();

    if (!student) {
      const insertResult = await env.DB.prepare(
        'INSERT INTO users (name, role) VALUES (?, ?)'
      )
        .bind(data.studentName, 'student')
        .run();
      student = { id: insertResult.meta.last_row_id };
    }

    // 서명 이미지가 있으면 R2에 저장 (R2가 설정된 경우에만)
    let signatureUrl = null;
    if (data.signature && env.STORAGE) {
      try {
        const signatureKey = `signatures/${data.sessionId}_${student.id}_${Date.now()}.png`;

        // Base64를 ArrayBuffer로 변환
        const base64Data = data.signature.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        await env.STORAGE.put(signatureKey, buffer, {
          httpMetadata: { contentType: 'image/png' },
        });

        signatureUrl = signatureKey;
      } catch (error) {
        console.error('R2 upload error:', error);
        // R2 업로드 실패해도 출석 기록은 저장
      }
    } else if (data.signature && !env.STORAGE) {
      // R2가 없으면 base64 데이터를 그대로 저장 (임시 방편)
      console.warn('R2 not configured, storing base64 signature data');
      signatureUrl = data.signature;
    }

    // 출석 기록 저장
    const result = await env.DB.prepare(`
      INSERT INTO attendances (booking_id, student_id, session_id, signature_url)
      VALUES (?, ?, ?, ?)
    `)
      .bind(data.bookingId || null, student.id, data.sessionId, signatureUrl)
      .run();

    // bookingId가 있으면 예약 상태를 'completed'로 업데이트
    if (data.bookingId) {
      await env.DB.prepare(`
        UPDATE bookings SET status = 'completed' WHERE id = ?
      `)
        .bind(data.bookingId)
        .run();
    }

    return new Response(
      JSON.stringify({
        ok: true,
        attendanceId: result.meta.last_row_id,
        signatureUrl: signatureUrl,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Attendance error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
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
