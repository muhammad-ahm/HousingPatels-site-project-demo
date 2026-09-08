// ===================================================
// GET    /properties/:id   → single property + its reviews (public)
// PUT    /properties/:id   → update (owner or admin only)
// DELETE /properties/:id   → delete (owner or admin only)
// ===================================================

import { getDb } from '../_lib/db.js';
import { getAuthUserWithRole, jsonResponse } from '../_lib/auth.js';
import { isTrustedOrigin } from '../_lib/csrf.js';

export async function onRequestGet({ params, env }) {
    const id = parseInt(params.id, 10);
    if (!id) return jsonResponse({ error: 'Invalid property id.' }, 400);

    try {
        const sql = getDb(env);

        const properties = await sql`SELECT * FROM properties WHERE id = ${id}`;
        const property = properties[0];
        if (!property) return jsonResponse({ error: 'Property not found.' }, 404);

        const reviews = await sql`
            SELECT r.id, r.rating, r.comment, r.created_at, u.name AS reviewer_name
            FROM reviews r
            JOIN users u ON u.id = r.user_id
            WHERE r.property_id = ${id}
            ORDER BY r.created_at DESC
        `;

        const avgRow = await sql`SELECT AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*)::int AS review_count FROM reviews WHERE property_id = ${id}`;

        return jsonResponse({
            property,
            reviews,
            averageRating: avgRow[0]?.avg_rating ? Number(avgRow[0].avg_rating) : null,
            reviewCount: avgRow[0]?.review_count || 0,
        });
    } catch (err) {
        console.error('Property detail error:', err);
        return jsonResponse({ error: 'Could not load this property right now.' }, 500);
    }
}

export async function onRequestPut({ request, params, env }) {
    if (!isTrustedOrigin(request, env)) {
        return jsonResponse({ error: 'Request blocked for security reasons.' }, 403);
    }

    const id = parseInt(params.id, 10);
    if (!id) return jsonResponse({ error: 'Invalid property id.' }, 400);

    try {
        const sql = getDb(env);
        const authUser = await getAuthUserWithRole(request, env, sql);
        if (!authUser) return jsonResponse({ error: 'You must be logged in.' }, 401);

        const existing = await sql`SELECT owner_id FROM properties WHERE id = ${id}`;
        if (!existing[0]) return jsonResponse({ error: 'Property not found.' }, 404);
        if (existing[0].owner_id !== authUser.userId && authUser.role !== 'admin') {
            return jsonResponse({ error: 'You can only edit your own listings.' }, 403);
        }

        const body = await request.json();
        const { title, description, price, city, address, bedrooms, bathrooms, areaSqft, imageUrl, status } = body;

        await sql`
            UPDATE properties SET
                title = COALESCE(${title}, title),
                description = COALESCE(${description}, description),
                price = COALESCE(${price}, price),
                city = COALESCE(${city}, city),
                address = COALESCE(${address}, address),
                bedrooms = COALESCE(${bedrooms}, bedrooms),
                bathrooms = COALESCE(${bathrooms}, bathrooms),
                area_sqft = COALESCE(${areaSqft}, area_sqft),
                image_url = COALESCE(${imageUrl}, image_url),
                status = COALESCE(${status}, status)
            WHERE id = ${id}
        `;

        return jsonResponse({ success: true });
    } catch (err) {
        console.error('Property update error:', err);
        return jsonResponse({ error: 'Could not update this property right now.' }, 500);
    }
}

export async function onRequestDelete({ request, params, env }) {
    if (!isTrustedOrigin(request, env)) {
        return jsonResponse({ error: 'Request blocked for security reasons.' }, 403);
    }

    const id = parseInt(params.id, 10);
    if (!id) return jsonResponse({ error: 'Invalid property id.' }, 400);

    try {
        const sql = getDb(env);
        const authUser = await getAuthUserWithRole(request, env, sql);
        if (!authUser) return jsonResponse({ error: 'You must be logged in.' }, 401);

        const existing = await sql`SELECT owner_id FROM properties WHERE id = ${id}`;
        if (!existing[0]) return jsonResponse({ error: 'Property not found.' }, 404);
        if (existing[0].owner_id !== authUser.userId && authUser.role !== 'admin') {
            return jsonResponse({ error: 'You can only delete your own listings.' }, 403);
        }

        await sql`DELETE FROM properties WHERE id = ${id}`;
        return jsonResponse({ success: true });
    } catch (err) {
        console.error('Property delete error:', err);
        return jsonResponse({ error: 'Could not delete this property right now.' }, 500);
    }
}
