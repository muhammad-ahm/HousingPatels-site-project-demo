// ===================================================
// GET /admin/overview  → all users + all properties (admin role only)
// ===================================================

import { getDb } from '../_lib/db.js';
import { getAuthUserWithRole, jsonResponse } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
    try {
        const sql = getDb(env);
        const authUser = await getAuthUserWithRole(request, env, sql);

        if (!authUser) return jsonResponse({ error: 'You must be logged in.' }, 401);
        if (authUser.role !== 'admin') return jsonResponse({ error: 'Admin access only.' }, 403);

        const users = await sql`SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC`;
        const properties = await sql`
            SELECT p.id, p.title, p.price, p.city, p.status, p.created_at, u.name AS owner_name
            FROM properties p
            JOIN users u ON u.id = p.owner_id
            ORDER BY p.created_at DESC
        `;

        return jsonResponse({ users, properties });
    } catch (err) {
        console.error('Admin overview error:', err);
        return jsonResponse({ error: 'Could not load admin data right now.' }, 500);
    }
}
