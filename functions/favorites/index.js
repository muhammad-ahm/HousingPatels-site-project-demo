// ===================================================
// GET  /favorites        → list the logged-in user's saved properties
// POST /favorites        → save a property { propertyId }
// ===================================================

import { getDb } from '../_lib/db.js';
import { getAuthUser, jsonResponse } from '../_lib/auth.js';
import { isTrustedOrigin } from '../_lib/csrf.js';

export async function onRequestGet({ request, env }) {
    const authUser = await getAuthUser(request, env);
    if (!authUser) return jsonResponse({ error: 'You must be logged in.' }, 401);

    try {
        const sql = getDb(env);
        const favorites = await sql`
            SELECT p.id, p.title, p.price, p.city, p.property_type, p.image_url, f.created_at AS saved_at
            FROM favorites f
            JOIN properties p ON p.id = f.property_id
            WHERE f.user_id = ${authUser.userId}
            ORDER BY f.created_at DESC
        `;
        return jsonResponse({ favorites });
    } catch (err) {
        console.error('Favorites list error:', err);
        return jsonResponse({ error: 'Could not load your favorites right now.' }, 500);
    }
}

export async function onRequestPost({ request, env }) {
    if (!isTrustedOrigin(request, env)) {
        return jsonResponse({ error: 'Request blocked for security reasons.' }, 403);
    }

    const authUser = await getAuthUser(request, env);
    if (!authUser) return jsonResponse({ error: 'You must be logged in to save properties.' }, 401);

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid request format.' }, 400);
    }

    const propertyId = parseInt(body.propertyId, 10);
    if (!propertyId) return jsonResponse({ error: 'A valid propertyId is required.' }, 400);

    try {
        const sql = getDb(env);

        const property = await sql`SELECT id FROM properties WHERE id = ${propertyId}`;
        if (!property[0]) return jsonResponse({ error: 'Property not found.' }, 404);

        await sql`
            INSERT INTO favorites (user_id, property_id)
            VALUES (${authUser.userId}, ${propertyId})
            ON CONFLICT (user_id, property_id) DO NOTHING
        `;
        return jsonResponse({ success: true }, 201);
    } catch (err) {
        console.error('Favorite add error:', err);
        return jsonResponse({ error: 'Could not save this property right now.' }, 500);
    }
}
