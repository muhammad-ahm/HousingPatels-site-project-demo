// ===================================================
// PUT /inquiries/:id  → update status { status: 'contacted' | 'closed' }
// Only the property's owner (the one who received the inquiry) can update it.
// ===================================================

import { getDb } from '../_lib/db.js';
import { getAuthUser, jsonResponse } from '../_lib/auth.js';
import { isTrustedOrigin } from '../_lib/csrf.js';

const VALID_STATUSES = ['pending', 'contacted', 'closed'];

export async function onRequestPut({ request, params, env }) {
    if (!isTrustedOrigin(request, env)) {
        return jsonResponse({ error: 'Request blocked for security reasons.' }, 403);
    }

    const authUser = await getAuthUser(request, env);
    if (!authUser) return jsonResponse({ error: 'You must be logged in.' }, 401);

    const id = parseInt(params.id, 10);
    if (!id) return jsonResponse({ error: 'Invalid inquiry id.' }, 400);

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid request format.' }, 400);
    }

    if (!VALID_STATUSES.includes(body.status)) {
        return jsonResponse({ error: 'Invalid status value.' }, 400);
    }

    try {
        const sql = getDb(env);

        const rows = await sql`
            SELECT i.id, p.owner_id
            FROM inquiries i
            JOIN properties p ON p.id = i.property_id
            WHERE i.id = ${id}
        `;
        if (!rows[0]) return jsonResponse({ error: 'Inquiry not found.' }, 404);
        if (rows[0].owner_id !== authUser.userId) {
            return jsonResponse({ error: 'You can only update inquiries for your own listings.' }, 403);
        }

        await sql`UPDATE inquiries SET status = ${body.status} WHERE id = ${id}`;
        return jsonResponse({ success: true });
    } catch (err) {
        console.error('Inquiry update error:', err);
        return jsonResponse({ error: 'Could not update this inquiry right now.' }, 500);
    }
}
