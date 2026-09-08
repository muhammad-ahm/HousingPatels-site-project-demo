// ===================================================
// POST /reviews  → add a review { propertyId, rating, comment }
// One review per user per property (enforced by the DB's UNIQUE constraint).
// ===================================================

import { getDb } from '../_lib/db.js';
import { getAuthUser, jsonResponse } from '../_lib/auth.js';
import { isTrustedOrigin } from '../_lib/csrf.js';

export async function onRequestPost({ request, env }) {
    if (!isTrustedOrigin(request, env)) {
        return jsonResponse({ error: 'Request blocked for security reasons.' }, 403);
    }

    const authUser = await getAuthUser(request, env);
    if (!authUser) return jsonResponse({ error: 'You must be logged in to leave a review.' }, 401);

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid request format.' }, 400);
    }

    const propertyId = parseInt(body.propertyId, 10);
    const rating = parseInt(body.rating, 10);
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1000) : null;

    if (!propertyId) return jsonResponse({ error: 'A valid propertyId is required.' }, 400);
    if (!rating || rating < 1 || rating > 5) return jsonResponse({ error: 'Rating must be between 1 and 5.' }, 400);

    try {
        const sql = getDb(env);

        const property = await sql`SELECT id FROM properties WHERE id = ${propertyId}`;
        if (!property[0]) return jsonResponse({ error: 'Property not found.' }, 404);

        await sql`
            INSERT INTO reviews (user_id, property_id, rating, comment)
            VALUES (${authUser.userId}, ${propertyId}, ${rating}, ${comment})
            ON CONFLICT (user_id, property_id)
            DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = CURRENT_TIMESTAMP
        `;

        return jsonResponse({ success: true }, 201);
    } catch (err) {
        console.error('Review submit error:', err);
        return jsonResponse({ error: 'Could not submit your review right now.' }, 500);
    }
}
