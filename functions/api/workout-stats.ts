// functions/api/workout-stats.ts
// PT 운동 일지 통계 API

interface Env {
  DB: D1Database;
}

// GET: 운동 통계 조회
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const studentId = url.searchParams.get('studentId');
    const period = url.searchParams.get('period') || 'month'; // week, month, all

    if (!studentId) {
      return new Response(JSON.stringify({ error: 'studentId is required' }), { status: 400 });
    }

    // 날짜 범위 계산
    const now = new Date();
    const kstOffset = 9 * 60;
    const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);
    const today = kstNow.toISOString().split('T')[0];

    let startDate: string;
    if (period === 'week') {
      const weekAgo = new Date(kstNow);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
    } else if (period === 'month') {
      const monthAgo = new Date(kstNow);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
    } else {
      startDate = '2000-01-01'; // all
    }

    // 1. 기본 요약 통계
    const summaryResult = await env.DB.prepare(`
      SELECT
        COUNT(DISTINCT w.id) as total_workouts,
        COUNT(e.id) as total_exercises
      FROM workout_logs w
      LEFT JOIN workout_exercises e ON w.id = e.log_id
      WHERE w.student_id = ? AND w.log_date >= ?
    `).bind(studentId, startDate).first<{ total_workouts: number; total_exercises: number }>();

    // 2. 연속 운동 일수 계산 (streak)
    const { results: recentDates } = await env.DB.prepare(`
      SELECT DISTINCT log_date
      FROM workout_logs
      WHERE student_id = ?
      ORDER BY log_date DESC
      LIMIT 60
    `).bind(studentId).all();

    let streak = 0;
    if (recentDates && recentDates.length > 0) {
      const dates = (recentDates as any[]).map(d => d.log_date);
      const todayDate = new Date(today);

      // 오늘 또는 어제부터 시작
      let checkDate = todayDate;
      const yesterdayDate = new Date(todayDate);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split('T')[0];

      if (!dates.includes(today) && !dates.includes(yesterday)) {
        streak = 0;
      } else {
        if (!dates.includes(today) && dates.includes(yesterday)) {
          checkDate = yesterdayDate;
        }

        for (let i = 0; i < 60; i++) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (dates.includes(dateStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    // 3. 부위별 통계
    const { results: bodyPartResults } = await env.DB.prepare(`
      SELECT
        e.body_part,
        COUNT(*) as count
      FROM workout_exercises e
      JOIN workout_logs w ON e.log_id = w.id
      WHERE w.student_id = ? AND w.log_date >= ? AND e.body_part IS NOT NULL
      GROUP BY e.body_part
      ORDER BY count DESC
    `).bind(studentId, startDate).all();

    const totalBodyPartCount = (bodyPartResults as any[]).reduce((sum, r) => sum + r.count, 0);
    const bodyPartStats = (bodyPartResults as any[]).map(r => ({
      bodyPart: r.body_part,
      count: r.count,
      percentage: totalBodyPartCount > 0 ? Math.round((r.count / totalBodyPartCount) * 100) : 0
    }));

    const mostFrequentBodyPart = bodyPartStats.length > 0 ? bodyPartStats[0].bodyPart : null;

    // 4. 운동별 진행 추이 (상위 5개 운동)
    const { results: topExercises } = await env.DB.prepare(`
      SELECT exercise_name, COUNT(*) as cnt
      FROM workout_exercises e
      JOIN workout_logs w ON e.log_id = w.id
      WHERE w.student_id = ? AND w.log_date >= ?
      GROUP BY exercise_name
      ORDER BY cnt DESC
      LIMIT 5
    `).bind(studentId, startDate).all();

    const progressData: Record<string, any[]> = {};

    for (const ex of (topExercises as any[])) {
      const { results: progress } = await env.DB.prepare(`
        SELECT
          w.log_date as date,
          e.weight,
          e.reps,
          e.sets
        FROM workout_exercises e
        JOIN workout_logs w ON e.log_id = w.id
        WHERE w.student_id = ? AND e.exercise_name = ? AND w.log_date >= ?
        ORDER BY w.log_date ASC
      `).bind(studentId, ex.exercise_name, startDate).all();

      progressData[ex.exercise_name] = progress as any[];
    }

    // 5. 주간/월간 데이터
    const { results: weeklyResults } = await env.DB.prepare(`
      SELECT
        strftime('%Y-W%W', w.log_date) as week,
        COUNT(DISTINCT w.id) as workout_count,
        COUNT(e.id) as exercise_count
      FROM workout_logs w
      LEFT JOIN workout_exercises e ON w.id = e.log_id
      WHERE w.student_id = ? AND w.log_date >= ?
      GROUP BY week
      ORDER BY week DESC
      LIMIT 12
    `).bind(studentId, startDate).all();

    const weeklyData = (weeklyResults as any[]).map(r => ({
      week: r.week,
      workoutCount: r.workout_count,
      exercises: r.exercise_count
    }));

    return new Response(JSON.stringify({
      summary: {
        totalWorkouts: summaryResult?.total_workouts || 0,
        totalExercises: summaryResult?.total_exercises || 0,
        mostFrequentBodyPart,
        streak
      },
      bodyPartStats,
      progressData,
      weeklyData,
      period,
      dateRange: { startDate, endDate: today }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get workout stats error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
