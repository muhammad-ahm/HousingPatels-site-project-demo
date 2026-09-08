// ===================================================
// Shared auth helper — used by every protected endpoint
// (favorites, reviews, inquiries, admin, property creation)
// so the JWT-checking logic lives in exactly one place.
// ===================================================

import { parseCookies } from './cookies.js';
import { verifyJwt } from './jwt.js';

/**
 * Returns the authenticated user's { userId, name } from the request's
 * JWT cookie, or null if there's no valid session.
 */
export async function getAuthUser(request, env) {
    const cookies = parseCookies(request);
    const token = cookies['auth_token'];
    if (!token) return null;

    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (!payload) return null;

    return { userId: payload.userId, name: payload.name };
}

/**
 * Looks up the full user row (including role) from the database.
 * Needed for admin checks, since the JWT payload itself doesn't carry
 * the role (roles can change after a token was issued, so we check
 * the database directly rather than trusting a possibly-stale token).
 */
export async function getAuthUserWithRole(request, env, sql) {
    const authUser = await getAuthUser(request, env);
    if (!authUser) return null;

    const rows = await sql`SELECT id, name, role FROM users WHERE id = ${authUser.userId}`;
    const user = rows[0];
    if (!user) return null;

    return { userId: user.id, name: user.name, role: user.role };
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
    });
}
