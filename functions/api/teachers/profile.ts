// functions/api/teachers/profile.ts - 강사 프로필 관리 API

interface Env {
    DB: D1Database;
    STORAGE: R2Bucket;
}

interface TeacherProfile {
    id: number;
    user_id: number;
    lesson_category_id: number | null;
    hourly_rate: number | null;
    bio: string | null;
    profile_image_url: string | null;
    certification: string | null;
    rating: number;
    review_count: number;
    created_at: string;
    updated_at: string;
}

// GET: 강사 프로필 조회
export async function onRequestGet(context: { request: Request; env: Env }) {
    try {
        const { DB } = context.env;
        const url = new URL(context.request.url);
        const userId = url.searchParams.get('userId');
        const categoryId = url.searchParams.get('categoryId');

        // 특정 강사 프로필 조회
        if (userId) {
            const profile = await DB.prepare(`
                SELECT
                    tp.*,
                    u.name as teacher_name,
                    u.email as teacher_email,
                    lc.name as category_name,
                    lc.icon as category_icon
                FROM teacher_profiles tp
                LEFT JOIN users u ON tp.user_id = u.id
                LEFT JOIN lesson_categories lc ON tp.lesson_category_id = lc.id
                WHERE tp.user_id = ?
            `).bind(userId).first();

            if (!profile) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Profile not found'
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({
                success: true,
                profile
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 카테고리별 강사 목록 조회 (평점순)
        if (categoryId) {
            const profiles = await DB.prepare(`
                SELECT
                    tp.*,
                    u.name as teacher_name,
                    u.email as teacher_email,
                    lc.name as category_name,
                    lc.icon as category_icon
                FROM teacher_profiles tp
                LEFT JOIN users u ON tp.user_id = u.id
                LEFT JOIN lesson_categories lc ON tp.lesson_category_id = lc.id
                WHERE tp.lesson_category_id = ?
                ORDER BY tp.rating DESC, tp.review_count DESC
            `).bind(categoryId).all();

            return new Response(JSON.stringify({
                success: true,
                profiles: profiles.results
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 전체 강사 목록 조회 (평점순)
        const profiles = await DB.prepare(`
            SELECT
                tp.*,
                u.name as teacher_name,
                u.email as teacher_email,
                lc.name as category_name,
                lc.icon as category_icon
            FROM teacher_profiles tp
            LEFT JOIN users u ON tp.user_id = u.id
            LEFT JOIN lesson_categories lc ON tp.lesson_category_id = lc.id
            ORDER BY tp.rating DESC, tp.review_count DESC
        `).all();

        return new Response(JSON.stringify({
            success: true,
            profiles: profiles.results
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching teacher profile:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch teacher profile'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// POST: 강사 프로필 생성
export async function onRequestPost(context: { request: Request; env: Env }) {
    try {
        const { DB } = context.env;
        const body = await context.request.json() as {
            userId: number;
            lessonCategoryId?: number;
            hourlyRate?: number;
            bio?: string;
            certification?: string;
        };

        const { userId, lessonCategoryId, hourlyRate, bio, certification } = body;

        if (!userId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'User ID is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 사용자가 강사인지 확인
        const user = await DB.prepare(
            'SELECT role FROM users WHERE id = ?'
        ).bind(userId).first() as { role: string } | null;

        if (!user || user.role !== 'teacher') {
            return new Response(JSON.stringify({
                success: false,
                error: 'User is not a teacher'
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 이미 프로필이 있는지 확인
        const existing = await DB.prepare(
            'SELECT id FROM teacher_profiles WHERE user_id = ?'
        ).bind(userId).first();

        if (existing) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Profile already exists'
            }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 프로필 생성
        const result = await DB.prepare(`
            INSERT INTO teacher_profiles (
                user_id,
                lesson_category_id,
                hourly_rate,
                bio,
                certification
            )
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            userId,
            lessonCategoryId || null,
            hourlyRate || null,
            bio || null,
            certification || null
        ).run();

        return new Response(JSON.stringify({
            success: true,
            profileId: result.meta.last_row_id
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error creating teacher profile:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create teacher profile'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// PATCH: 강사 프로필 업데이트
export async function onRequestPatch(context: { request: Request; env: Env }) {
    try {
        const { DB } = context.env;
        const url = new URL(context.request.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'User ID is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await context.request.json() as {
            lessonCategoryId?: number;
            hourlyRate?: number;
            bio?: string;
            profileImageUrl?: string;
            certification?: string;
        };

        const {
            lessonCategoryId,
            hourlyRate,
            bio,
            profileImageUrl,
            certification
        } = body;

        // 동적 쿼리 생성
        const updates: string[] = [];
        const values: any[] = [];

        if (lessonCategoryId !== undefined) {
            updates.push('lesson_category_id = ?');
            values.push(lessonCategoryId);
        }
        if (hourlyRate !== undefined) {
            updates.push('hourly_rate = ?');
            values.push(hourlyRate);
        }
        if (bio !== undefined) {
            updates.push('bio = ?');
            values.push(bio);
        }
        if (profileImageUrl !== undefined) {
            updates.push('profile_image_url = ?');
            values.push(profileImageUrl);
        }
        if (certification !== undefined) {
            updates.push('certification = ?');
            values.push(certification);
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
        values.push(userId);

        await DB.prepare(`
            UPDATE teacher_profiles
            SET ${updates.join(', ')}
            WHERE user_id = ?
        `).bind(...values).run();

        return new Response(JSON.stringify({
            success: true
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating teacher profile:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to update teacher profile'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// DELETE: 강사 프로필 삭제
export async function onRequestDelete(context: { request: Request; env: Env }) {
    try {
        const { DB } = context.env;
        const url = new URL(context.request.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'User ID is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await DB.prepare(
            'DELETE FROM teacher_profiles WHERE user_id = ?'
        ).bind(userId).run();

        return new Response(JSON.stringify({
            success: true
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error deleting teacher profile:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to delete teacher profile'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
