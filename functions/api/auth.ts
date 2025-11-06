// functions/api/auth.ts

interface Env {
  DB: D1Database;
}

interface LoginRequest {
  name: string;
  role: 'teacher' | 'student';
}

// POST: Login/Register user
export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const data: LoginRequest = await request.json();

    if (!data.name || !data.role) {
      return new Response(JSON.stringify({ error: 'Missing name or role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!['teacher', 'student'].includes(data.role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user exists
    let user = await env.DB.prepare(
      'SELECT id, name, role FROM users WHERE name = ? AND role = ?'
    )
      .bind(data.name, data.role)
      .first();

    // If not, create new user
    if (!user) {
      // 한국시간(KST = UTC+9) 기준으로 현재 날짜 및 한달 후 계산
      const now = new Date();
      const kstOffset = 9 * 60; // KST는 UTC+9
      const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);

      const startDate = kstNow.toISOString().split('T')[0]; // YYYY-MM-DD

      // 한달 후 계산
      const oneMonthLater = new Date(kstNow);
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
      const endDate = oneMonthLater.toISOString().split('T')[0];

      const result = await env.DB.prepare(
        'INSERT INTO users (name, role, start_date, end_date) VALUES (?, ?, ?, ?)'
      )
        .bind(data.name, data.role, startDate, endDate)
        .run();

      user = {
        id: result.meta.last_row_id,
        name: data.name,
        role: data.role,
        start_date: startDate,
        end_date: endDate,
      };
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// GET: Get user by ID or get all users by role
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');
    const role = url.searchParams.get('role');
    const teacherId = url.searchParams.get('teacherId'); // 특정 선생님에게 예약 요청한 학생만 필터링

    // Get all users by role
    if (role) {
      if (!['teacher', 'student'].includes(role)) {
        return new Response(JSON.stringify({ error: 'Invalid role' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      let query = `SELECT u.id, u.name, u.role, u.email, u.start_date, u.end_date, u.payment_info, u.bank_account, u.payment_status, u.notes, (SELECT COUNT(*) FROM attendances WHERE student_id = u.id AND signature_url IS NOT NULL) as attendance_count FROM users u WHERE u.role = ?`;
      const bindings: any[] = [role];

      // 선생님 ID가 제공된 경우, 해당 선생님에게 예약 요청한 학생만 필터링
      if (teacherId && role === 'student') {
        query = `SELECT DISTINCT u.id, u.name, u.role, u.email, u.start_date, u.end_date, u.payment_info, u.bank_account, u.payment_status, u.notes, (SELECT COUNT(*) FROM attendances WHERE student_id = u.id AND signature_url IS NOT NULL) as attendance_count FROM users u INNER JOIN bookings b ON u.id = b.student_id WHERE u.role = ? AND b.teacher_id = ?`;
        bindings.push(teacherId);
      }

      query += ' ORDER BY u.name';

      const { results } = await env.DB.prepare(query).bind(...bindings).all();

      return new Response(
        JSON.stringify({ users: results }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user by ID
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID or role required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await env.DB.prepare(
      'SELECT id, name, role FROM users WHERE id = ?'
    )
      .bind(userId)
      .first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ user }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Get user error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// DELETE: Delete a user by ID or all users by role
export async function onRequestDelete(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');
    const role = url.searchParams.get('role');

    if (!userId && !role) {
      return new Response(JSON.stringify({ error: 'User ID or role required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete a single user by ID
    if (userId) {
      const result = await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
      if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
      }
      return new Response(JSON.stringify({ ok: true, message: `User ${userId} deleted` }));
    }

    // Delete all users by role
    if (role) {
      if (!['teacher', 'student'].includes(role)) {
        return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400 });
      }

      // D1 does not support joins in DELETE statements or complex cascading deletes.
      // We need to fetch IDs first, then delete related data.
      const { results: usersToDelete } = await env.DB.prepare('SELECT id FROM users WHERE role = ?').bind(role).all();
      
      if (usersToDelete.length === 0) {
        return new Response(JSON.stringify({ ok: true, message: `No ${role}s to delete.` }));
      }

      const userIds = usersToDelete.map(u => u.id);
      const placeholders = userIds.map(() => '?').join(','); // for IN clause

      const batch = [];

      if (role === 'teacher') {
        // Delete schedules and bookings associated with these teachers
        batch.push(env.DB.prepare(`DELETE FROM schedules WHERE teacher_id IN (${placeholders})`).bind(...userIds));
        batch.push(env.DB.prepare(`DELETE FROM bookings WHERE teacher_id IN (${placeholders})`).bind(...userIds));
      } else if (role === 'student') {
        // Delete attendance and bookings associated with these students
        batch.push(env.DB.prepare(`DELETE FROM attendances WHERE student_id IN (${placeholders})`).bind(...userIds));
        batch.push(env.DB.prepare(`DELETE FROM bookings WHERE student_id IN (${placeholders})`).bind(...userIds));
      }

      // Finally, delete the users themselves
      batch.push(env.DB.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).bind(...userIds));

      await env.DB.batch(batch);

      return new Response(JSON.stringify({ ok: true, message: `All ${role}s and their related data have been deleted.` }));
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });

  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

// PATCH: Update user details
export async function onRequestPatch(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), { status: 400 });
    }

    const updates: { [key: string]: any } = await request.json();
    const allowedFields = ['name', 'email', 'start_date', 'end_date', 'payment_info', 'bank_account', 'payment_status', 'notes'];
    
    const setClauses = [];
    const bindings = [];

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            setClauses.push(`${field} = ?`);
            bindings.push(updates[field]);
        }
    }

    if (setClauses.length === 0) {
        return new Response(JSON.stringify({ error: 'No update fields provided' }), { status: 400 });
    }

    bindings.push(userId);

    const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;
    
    const result = await env.DB.prepare(query).bind(...bindings).run();

    if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'User not found or data is unchanged' }), { status: 404 });
    }

    return new Response(JSON.stringify({ ok: true, message: 'User updated successfully' }));

  } catch (error) {
    console.error('Update user error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
