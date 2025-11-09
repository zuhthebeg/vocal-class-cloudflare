// functions/api/reviews.ts - 리뷰 시스템 API

interface Env {
    DB: D1Database;
}

interface Review {
    id: number;
    booking_id: number;
    student_id: number;
    teacher_id: number;
    rating: number;
    comment: string | null;
    created_at: string;
    updated_at: string;
}

// GET: 리뷰 조회
export async function onRequestGet(context: { request: Request; env: Env }) {
    try {
        const { DB } = context.env;
        const url = new URL(context.request.url);
        const teacherId = url.searchParams.get('teacherId');
        const studentId = url.searchParams.get('studentId');
        const bookingId = url.searchParams.get('bookingId');

        // 특정 예약의 리뷰 조회
        if (bookingId) {
            const review = await DB.prepare(`
                SELECT
                    r.*,
                    u_student.name as student_name,
                    u_teacher.name as teacher_name
                FROM reviews r
                LEFT JOIN users u_student ON r.student_id = u_student.id
                LEFT JOIN users u_teacher ON r.teacher_id = u_teacher.id
                WHERE r.booking_id = ?
            `).bind(bookingId).first();

            return new Response(JSON.stringify({
                success: true,
                review
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 특정 강사의 리뷰 목록 조회
        if (teacherId) {
            const reviews = await DB.prepare(`
                SELECT
                    r.*,
                    u_student.name as student_name,
                    u_teacher.name as teacher_name
                FROM reviews r
                LEFT JOIN users u_student ON r.student_id = u_student.id
                LEFT JOIN users u_teacher ON r.teacher_id = u_teacher.id
                WHERE r.teacher_id = ?
                ORDER BY r.created_at DESC
            `).bind(teacherId).all();

            // 평균 평점 계산
            const avgRating = await DB.prepare(`
                SELECT AVG(rating) as avg_rating, COUNT(*) as count
                FROM reviews
                WHERE teacher_id = ?
            `).bind(teacherId).first() as { avg_rating: number; count: number } | null;

            return new Response(JSON.stringify({
                success: true,
                reviews: reviews.results,
                avgRating: avgRating?.avg_rating || 0,
                reviewCount: avgRating?.count || 0
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 특정 학생이 작성한 리뷰 목록 조회
        if (studentId) {
            const reviews = await DB.prepare(`
                SELECT
                    r.*,
                    u_student.name as student_name,
                    u_teacher.name as teacher_name
                FROM reviews r
                LEFT JOIN users u_student ON r.student_id = u_student.id
                LEFT JOIN users u_teacher ON r.teacher_id = u_teacher.id
                WHERE r.student_id = ?
                ORDER BY r.created_at DESC
            `).bind(studentId).all();

            return new Response(JSON.stringify({
                success: true,
                reviews: reviews.results
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: false,
            error: 'teacherId, studentId, or bookingId is required'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch reviews'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// POST: 리뷰 작성
export async function onRequestPost(context: { request: Request; env: Env }) {
    try {
        const { DB } = context.env;
        const body = await context.request.json() as {
            bookingId: number;
            studentId: number;
            teacherId: number;
            rating: number;
            comment?: string;
        };

        const { bookingId, studentId, teacherId, rating, comment } = body;

        // 필수 필드 검증
        if (!bookingId || !studentId || !teacherId || !rating) {
            return new Response(JSON.stringify({
                success: false,
                error: 'bookingId, studentId, teacherId, and rating are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 평점 범위 검증
        if (rating < 1 || rating > 5) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Rating must be between 1 and 5'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 예약 존재 확인
        const booking = await DB.prepare(
            'SELECT id, status FROM bookings WHERE id = ?'
        ).bind(bookingId).first() as { id: number; status: string } | null;

        if (!booking) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Booking not found'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 이미 리뷰가 있는지 확인
        const existingReview = await DB.prepare(
            'SELECT id FROM reviews WHERE booking_id = ?'
        ).bind(bookingId).first();

        if (existingReview) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Review already exists for this booking'
            }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 리뷰 생성
        const result = await DB.prepare(`
            INSERT INTO reviews (booking_id, student_id, teacher_id, rating, comment)
            VALUES (?, ?, ?, ?, ?)
        `).bind(bookingId, studentId, teacherId, rating, comment || null).run();

        // 강사 프로필 평점 업데이트
        await updateTeacherRating(DB, teacherId);

        return new Response(JSON.stringify({
            success: true,
            reviewId: result.meta.last_row_id
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error creating review:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create review'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// PATCH: 리뷰 수정
export async function onRequestPatch(context: { request: Request; env: Env }) {
    try {
        const { DB } = context.env;
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Review ID is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await context.request.json() as {
            rating?: number;
            comment?: string;
        };

        const { rating, comment } = body;

        // 평점 범위 검증
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Rating must be between 1 and 5'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 리뷰 존재 확인 및 teacherId 가져오기
        const review = await DB.prepare(
            'SELECT teacher_id FROM reviews WHERE id = ?'
        ).bind(id).first() as { teacher_id: number } | null;

        if (!review) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Review not found'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 동적 쿼리 생성
        const updates: string[] = [];
        const values: any[] = [];

        if (rating !== undefined) {
            updates.push('rating = ?');
            values.push(rating);
        }
        if (comment !== undefined) {
            updates.push('comment = ?');
            values.push(comment);
        }

        if (updates.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No fields to update'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        await DB.prepare(`
            UPDATE reviews
            SET ${updates.join(', ')}
            WHERE id = ?
        `).bind(...values).run();

        // 평점이 변경된 경우 강사 프로필 평점 업데이트
        if (rating !== undefined) {
            await updateTeacherRating(DB, review.teacher_id);
        }

        return new Response(JSON.stringify({
            success: true
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating review:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to update review'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// DELETE: 리뷰 삭제
export async function onRequestDelete(context: { request: Request; env: Env }) {
    try {
        const { DB } = context.env;
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Review ID is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 리뷰 존재 확인 및 teacherId 가져오기
        const review = await DB.prepare(
            'SELECT teacher_id FROM reviews WHERE id = ?'
        ).bind(id).first() as { teacher_id: number } | null;

        if (!review) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Review not found'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();

        // 강사 프로필 평점 업데이트
        await updateTeacherRating(DB, review.teacher_id);

        return new Response(JSON.stringify({
            success: true
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error deleting review:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to delete review'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Helper: 강사 평점 업데이트
async function updateTeacherRating(DB: D1Database, teacherId: number) {
    const stats = await DB.prepare(`
        SELECT AVG(rating) as avg_rating, COUNT(*) as count
        FROM reviews
        WHERE teacher_id = ?
    `).bind(teacherId).first() as { avg_rating: number; count: number } | null;

    if (stats) {
        await DB.prepare(`
            UPDATE teacher_profiles
            SET rating = ?, review_count = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `).bind(
            stats.avg_rating || 5.0,
            stats.count,
            teacherId
        ).run();
    }
}
