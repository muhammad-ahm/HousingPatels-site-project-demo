// ===================================================
// POST /inquiries        → contact/book a visit for a property { propertyId, message }
// GET  /inquiries        → list inquiries the logged-in user needs to see:
//                          - inquiries they SENT (as a buyer)
//                          - inquiries they RECEIVED (as a property owner)
// ===================================================

import { getDb } from '../_lib/db.js';
import { getAuthUser, jsonResponse } from '../_lib/auth.js';
import { isTrustedOrigin } from '../_lib/csrf.js';
import { isNonEmptyString } from '../_lib/validate.js';

export async function onRequestGet({ request, env }) {
    const authUser = await getAuthUser(request, env);
    if (!authUser) return jsonResponse({ error: 'You must be logged in.' }, 401);

    try {
        const sql = getDb(env);

        const sent = await sql`
            SELECT i.id, i.message, i.status, i.created_at, p.id AS property_id, p.title AS property_title
            FROM inquiries i
            JOIN properties p ON p.id = i.property_id
            WHERE i.user_id = ${authUser.userId}
            ORDER BY i.created_at DESC
        `;

        const received = await sql`
            SELECT i.id, i.message, i.status, i.created_at, p.id AS property_id, p.title AS property_title,
                   u.name AS from_name, u.email AS from_email
            FROM inquiries i
            JOIN properties p ON p.id = i.property_id
            JOIN users u ON u.id = i.user_id
            WHERE p.owner_id = ${authUser.userId}
            ORDER BY i.created_at DESC
        `;

        return jsonResponse({ sent, received });
    } catch (err) {
        console.error('Inquiries list error:', err);
        return jsonResponse({ error: 'Could not load inquiries right now.' }, 500);
    }
}

export async function onRequestPost({ request, env }) {
    if (!isTrustedOrigin(request, env)) {
        return jsonResponse({ error: 'Request blocked for security reasons.' }, 403);
    }

    const authUser = await getAuthUser(request, env);
    if (!authUser) return jsonResponse({ error: 'You must be logged in to send an inquiry.' }, 401);

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid request format.' }, 400);
    }

    const propertyId = parseInt(body.propertyId, 10);
    const message = body.message;

    if (!propertyId) return jsonResponse({ error: 'A valid propertyId is required.' }, 400);
    if (!isNonEmptyString(message, 1000)) return jsonResponse({ error: 'Please write a message.' }, 400);

    try {
        const sql = getDb(env);

        const property = await sql`SELECT id, owner_id FROM properties WHERE id = ${propertyId}`;
        if (!property[0]) return jsonResponse({ error: 'Property not found.' }, 404);
        if (property[0].owner_id === authUser.userId) {
            return jsonResponse({ error: "You can't send an inquiry about your own listing." }, 400);
        }

        const rows = await sql`
            INSERT INTO inquiries (user_id, property_id, message)
            VALUES (${authUser.userId}, ${propertyId}, ${message.trim()})
            RETURNING id
        `;

        return jsonResponse({ success: true, id: rows[0].id }, 201);
    } catch (err) {
        console.error('Inquiry submit error:', err);
        return jsonResponse({ error: 'Could not send your inquiry right now.' }, 500);
    }
}
