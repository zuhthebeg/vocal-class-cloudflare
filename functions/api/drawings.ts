// functions/api/drawings.ts - Student drawings API
// GET /api/drawings?studentId=1 - Get student's drawing data
// POST /api/drawings - Save/update student's drawing data

interface Env {
    DB: D1Database;
}

interface DrawingData {
    canvasData?: string;
    cliparts?: any[];
    savedDrawings?: any[];
    exampleVideos?: any[];
}

interface DrawingRequestBody {
    studentId: number;
    drawingData: DrawingData;
}

// GET: Retrieve student's drawing data
export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const url = new URL(context.request.url);
        const studentId = url.searchParams.get('studentId');

        if (!studentId) {
            return new Response(JSON.stringify({
                error: 'studentId parameter is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const db = context.env.DB;

        // Get drawing data for student
        const result = await db.prepare(`
            SELECT drawing_data, updated_at
            FROM student_drawings
            WHERE student_id = ?
        `).bind(parseInt(studentId)).first();

        if (!result) {
            // No saved drawing data - return empty state
            return new Response(JSON.stringify({
                drawingData: null,
                message: 'No saved drawing data found'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            drawingData: JSON.parse(result.drawing_data as string),
            updatedAt: result.updated_at
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('GET /api/drawings error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to retrieve drawing data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

// POST: Save/update student's drawing data
export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const body = await context.request.json() as DrawingRequestBody;

        if (!body.studentId || !body.drawingData) {
            return new Response(JSON.stringify({
                error: 'studentId and drawingData are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const db = context.env.DB;
        const drawingDataJson = JSON.stringify(body.drawingData);

        // Use INSERT OR REPLACE to handle both create and update
        await db.prepare(`
            INSERT INTO student_drawings (student_id, drawing_data, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(student_id)
            DO UPDATE SET
                drawing_data = excluded.drawing_data,
                updated_at = CURRENT_TIMESTAMP
        `).bind(body.studentId, drawingDataJson).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Drawing data saved successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('POST /api/drawings error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to save drawing data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
