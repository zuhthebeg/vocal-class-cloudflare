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
      const result = await env.DB.prepare(
        'INSERT INTO users (name, role) VALUES (?, ?)'
      )
        .bind(data.name, data.role)
        .run();

      user = {
        id: result.meta.last_row_id,
        name: data.name,
        role: data.role,
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

// GET: Get user by ID
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
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
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
