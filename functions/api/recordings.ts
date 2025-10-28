// functions/api/recordings.ts

interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
}

// POST: 녹음 파일 업로드
export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const formData = await request.formData();
    
    const userId = formData.get('userId') as string;
    const title = formData.get('title') as string;
    const audioFile = formData.get('audio') as File;
    const bookingId = formData.get('bookingId') as string | null;

    if (!userId || !audioFile) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // R2에 파일 저장
    const fileKey = `recordings/${userId}/${Date.now()}_${audioFile.name}`;
    const arrayBuffer = await audioFile.arrayBuffer();
    
    await env.STORAGE.put(fileKey, arrayBuffer, {
      httpMetadata: {
        contentType: audioFile.type || 'audio/webm',
      },
    });

    // 데이터베이스에 메타데이터 저장
    const result = await env.DB.prepare(`
      INSERT INTO recordings (user_id, booking_id, title, file_url)
      VALUES (?, ?, ?, ?)
    `)
      .bind(
        userId,
        bookingId || null,
        title || 'Untitled Recording',
        fileKey
      )
      .run();

    return new Response(
      JSON.stringify({
        ok: true,
        recordingId: result.meta.last_row_id,
        fileUrl: fileKey,
        message: 'Recording uploaded successfully',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Recording upload error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// GET: 녹음 목록 조회
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const recordingId = url.searchParams.get('id');

    // 특정 녹음 파일 다운로드
    if (recordingId) {
      const recording = await env.DB.prepare(
        'SELECT file_url FROM recordings WHERE id = ?'
      )
        .bind(recordingId)
        .first<{ file_url: string }>();

      if (!recording) {
        return new Response('Recording not found', { status: 404 });
      }

      const object = await env.STORAGE.get(recording.file_url);
      
      if (!object) {
        return new Response('File not found in storage', { status: 404 });
      }

      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'audio/webm',
          'Content-Disposition': `attachment; filename="${recording.file_url.split('/').pop()}"`,
        },
      });
    }

    // 녹음 목록 조회
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { results } = await env.DB.prepare(`
      SELECT id, title, file_url, duration, created_at
      FROM recordings
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `)
      .bind(userId)
      .all();

    return new Response(
      JSON.stringify({ recordings: results }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Recording fetch error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// DELETE: 녹음 삭제
export async function onRequestDelete(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const recordingId = url.searchParams.get('id');

    if (!recordingId) {
      return new Response(JSON.stringify({ error: 'Recording ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 파일 경로 조회
    const recording = await env.DB.prepare(
      'SELECT file_url FROM recordings WHERE id = ?'
    )
      .bind(recordingId)
      .first<{ file_url: string }>();

    if (recording) {
      // R2에서 파일 삭제
      await env.STORAGE.delete(recording.file_url);
    }

    // 데이터베이스에서 레코드 삭제
    await env.DB.prepare('DELETE FROM recordings WHERE id = ?')
      .bind(recordingId)
      .run();

    return new Response(
      JSON.stringify({ ok: true, message: 'Recording deleted' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Recording deletion error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
