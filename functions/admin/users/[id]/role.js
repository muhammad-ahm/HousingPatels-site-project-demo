// ===================================================
// PUT /admin/users/:id/role  → change a user's role { role: 'user' | 'admin' }
// Admin-only. Lets an existing admin promote/demote other accounts.
// ===================================================

import { getDb } from '../../../_lib/db.js';
import { getAuthUserWithRole, jsonResponse } from '../../../_lib/auth.js';
import { isTrustedOrigin } from '../../../_lib/csrf.js';

const VALID_ROLES = ['user', 'admin'];

export async function onRequestPut({ request, params, env }) {
    if (!isTrustedOrigin(request, env)) {
        return jsonResponse({ error: 'Request blocked for security reasons.' }, 403);
    }

    const targetId = parseInt(params.id, 10);
    if (!targetId) return jsonResponse({ error: 'Invalid user id.' }, 400);

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid request format.' }, 400);
    }

    if (!VALID_ROLES.includes(body.role)) {
        return jsonResponse({ error: 'Invalid role value.' }, 400);
    }

    try {
        const sql = getDb(env);
        const authUser = await getAuthUserWithRole(request, env, sql);

        if (!authUser) return jsonResponse({ error: 'You must be logged in.' }, 401);
        if (authUser.role !== 'admin') return jsonResponse({ error: 'Admin access only.' }, 403);

        if (targetId === authUser.userId && body.role !== 'admin') {
            return jsonResponse({ error: "You can't remove your own admin access." }, 400);
        }

        await sql`UPDATE users SET role = ${body.role} WHERE id = ${targetId}`;
        return jsonResponse({ success: true });
    } catch (err) {
        console.error('Admin role update error:', err);
        return jsonResponse({ error: 'Could not update this user right now.' }, 500);
    }
}
