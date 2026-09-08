import { parseCookies } from '../_lib/cookies.js';
import { verifyJwt } from '../_lib/jwt.js';
import { getDb } from '../_lib/db.js';

export async function onRequestGet({ request, env }) {
    const cookies = parseCookies(request);
    const token = cookies['auth_token'];

    if (!token) {
        return jsonResponse({ authenticated: false }, 401);
    }

    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (!payload) {
        return jsonResponse({ authenticated: false }, 401);
    }

    // Role isn't stored in the JWT itself (it could change after the token
    // was issued — e.g. an admin promotion — so we look it up fresh here
    // rather than trusting a possibly-stale claim baked into the token).
    let role = 'user';
    try {
        const sql = getDb(env);
        const rows = await sql`SELECT role FROM users WHERE id = ${payload.userId}`;
        if (rows[0]) role = rows[0].role;
    } catch (err) {
        console.error('me.js role lookup error:', err);
        // Fall through with the default 'user' role rather than failing
        // the whole request — this endpoint is used on every page load
        // to confirm login state, so it should stay resilient.
    }

    return jsonResponse({ authenticated: true, name: payload.name, userId: payload.userId, role }, 200);
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
