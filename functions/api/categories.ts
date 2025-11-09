// functions/api/categories.ts - 수업 카테고리 관리 API

interface Env {
    DB: D1Database;
}

interface Category {
    id: number;
    name: string;
    icon: string;
    description: string;
    created_at: string;
}

// GET: 전체 카테고리 목록 조회
export async function onRequestGet(context: { env: Env }) {
    try {
        const { DB } = context.env;

        const result = await DB.prepare(`
            SELECT id, name, icon, description, created_at
            FROM lesson_categories
            ORDER BY name
        `).all();

        return new Response(JSON.stringify({
            success: true,
            categories: result.results
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch categories'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// POST: 새 카테고리 추가 (관리자 전용)
export async function onRequestPost(context: { request: Request; env: Env }) {
    try {
        const { DB } = context.env;
        const body = await context.request.json() as {
            name: string;
            icon?: string;
            description?: string;
        };

        const { name, icon, description } = body;

        if (!name) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Category name is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 중복 체크
        const existing = await DB.prepare(
            'SELECT id FROM lesson_categories WHERE name = ?'
        ).bind(name).first();

        if (existing) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Category already exists'
            }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 카테고리 추가
        const result = await DB.prepare(`
            INSERT INTO lesson_categories (name, icon, description)
            VALUES (?, ?, ?)
        `).bind(name, icon || '', description || '').run();

        return new Response(JSON.stringify({
            success: true,
            categoryId: result.meta.last_row_id
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error creating category:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create category'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// PATCH: 카테고리 업데이트 (관리자 전용)
export async function onRequestPatch(context: { request: Request; env: Env }) {
    try {
        const { DB } = context.env;
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Category ID is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await context.request.json() as {
            name?: string;
            icon?: string;
            description?: string;
        };

        const { name, icon, description } = body;

        // 동적 쿼리 생성
        const updates: string[] = [];
        const values: any[] = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (icon !== undefined) {
            updates.push('icon = ?');
            values.push(icon);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
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

        values.push(id);

        await DB.prepare(`
            UPDATE lesson_categories
            SET ${updates.join(', ')}
            WHERE id = ?
        `).bind(...values).run();

        return new Response(JSON.stringify({
            success: true
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating category:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to update category'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// DELETE: 카테고리 삭제 (관리자 전용)
export async function onRequestDelete(context: { request: Request; env: Env }) {
    try {
        const { DB } = context.env;
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Category ID is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 연관된 강사 프로필이 있는지 확인
        const hasProfiles = await DB.prepare(
            'SELECT COUNT(*) as count FROM teacher_profiles WHERE lesson_category_id = ?'
        ).bind(id).first() as { count: number } | null;

        if (hasProfiles && hasProfiles.count > 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Cannot delete category with existing teacher profiles'
            }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 카테고리 삭제 (lesson_tools는 외래키로 자동 삭제됨)
        await DB.prepare(
            'DELETE FROM lesson_categories WHERE id = ?'
        ).bind(id).run();

        return new Response(JSON.stringify({
            success: true
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to delete category'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
