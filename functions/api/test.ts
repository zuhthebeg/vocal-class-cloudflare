// Simple test endpoint to verify D1 connection

interface Env {
  DB: D1Database;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { env } = context;

    console.log('Test endpoint called');

    // Test 1: Simple query
    const result = await env.DB.prepare('SELECT 1 as test').first();
    console.log('Simple query result:', result);

    // Test 2: Check tables
    const tables = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all();
    console.log('Tables:', tables);

    // Test 3: Check users table
    const users = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
    console.log('User count:', users);

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'D1 connection successful',
        simpleQuery: result,
        tables: tables.results,
        userCount: users,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Test endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';

    return new Response(
      JSON.stringify({
        ok: false,
        error: errorMessage,
        stack: errorStack,
        type: typeof error,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
