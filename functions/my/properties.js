// ===================================================
// GET /my/properties  → the logged-in user's own listings
// (unlike the public /properties list, this includes sold/rented ones too,
// since the owner still needs to see and manage them)
// ===================================================

import { getDb } from '../_lib/db.js';
import { getAuthUser, jsonResponse } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
    const authUser = await getAuthUser(request, env);
    if (!authUser) return jsonResponse({ error: 'You must be logged in.' }, 401);

    try {
        const sql = getDb(env);
        const properties = await sql`
            SELECT id, title, price, city, property_type, status, image_url, created_at
            FROM properties
            WHERE owner_id = ${authUser.userId}
            ORDER BY created_at DESC
        `;
        return jsonResponse({ properties });
    } catch (err) {
        console.error('My properties error:', err);
        return jsonResponse({ error: 'Could not load your listings right now.' }, 500);
    }
}
