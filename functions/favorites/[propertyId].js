// ===================================================
// DELETE /favorites/:propertyId  → un-save a property
// ===================================================

import { getDb } from '../_lib/db.js';
import { getAuthUser, jsonResponse } from '../_lib/auth.js';
import { isTrustedOrigin } from '../_lib/csrf.js';

export async function onRequestDelete({ request, params, env }) {
    if (!isTrustedOrigin(request, env)) {
        return jsonResponse({ error: 'Request blocked for security reasons.' }, 403);
    }

    const authUser = await getAuthUser(request, env);
    if (!authUser) return jsonResponse({ error: 'You must be logged in.' }, 401);

    const propertyId = parseInt(params.propertyId, 10);
    if (!propertyId) return jsonResponse({ error: 'Invalid property id.' }, 400);

    try {
        const sql = getDb(env);
        await sql`DELETE FROM favorites WHERE user_id = ${authUser.userId} AND property_id = ${propertyId}`;
        return jsonResponse({ success: true });
    } catch (err) {
        console.error('Favorite remove error:', err);
        return jsonResponse({ error: 'Could not remove this favorite right now.' }, 500);
    }
}
