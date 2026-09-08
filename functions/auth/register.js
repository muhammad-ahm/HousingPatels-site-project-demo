import { getDb } from '../_lib/db.js';
import { hashPassword } from '../_lib/password.js';
import { signJwt } from '../_lib/jwt.js';
import { serializeAuthCookie } from '../_lib/cookies.js';
import { isTrustedOrigin } from '../_lib/csrf.js';
import { isValidEmail, isValidPassword, isNonEmptyString, isValidPhone, isValidDate } from '../_lib/validate.js';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function onRequestPost({ request, env }) {
    if (!isTrustedOrigin(request, env)) {
        return jsonResponse({ error: 'Request blocked for security reasons.' }, 403);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid request format.' }, 400);
    }

    const { name, gender, dob, email, phone, password } = body;

    if (!isNonEmptyString(name, 100)) return jsonResponse({ error: 'Please enter your name.' }, 400);
    if (!isNonEmptyString(gender, 30)) return jsonResponse({ error: 'Please select a gender.' }, 400);
    if (!isValidDate(dob)) return jsonResponse({ error: 'Please enter a valid date of birth.' }, 400);
    if (!isValidEmail(email)) return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
    if (!isValidPhone(phone)) return jsonResponse({ error: 'Please enter a valid phone number.' }, 400);
    if (!isValidPassword(password)) return jsonResponse({ error: 'Password must be at least 8 characters.' }, 400);

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const sql = getDb(env);

        const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
        if (existing.length > 0) {
            return jsonResponse({ error: 'An account with this email already exists. Try logging in instead.' }, 409);
        }

        const passwordHash = await hashPassword(password);

        const rows = await sql`
            INSERT INTO users (name, gender, dob, email, phone, password_hash)
            VALUES (${name.trim()}, ${gender}, ${dob}, ${normalizedEmail}, ${phone.trim()}, ${passwordHash})
            RETURNING id, name
        `;
        const newUser = rows[0];

        const token = await signJwt({ userId: newUser.id, name: newUser.name }, env.JWT_SECRET, COOKIE_MAX_AGE);

        return jsonResponse(
            { success: true, name: newUser.name },
            200,
            { 'Set-Cookie': serializeAuthCookie(token, COOKIE_MAX_AGE) }
        );
    } catch (err) {
        // Handles the rare race condition where two requests both pass the
        // duplicate-email check above before either one inserts — Postgres's
        // UNIQUE constraint on email is the real guarantee, this just turns
        // that into the same friendly message instead of a raw 500 error.
        if (err && err.code === '23505') {
            return jsonResponse({ error: 'An account with this email already exists. Try logging in instead.' }, 409);
        }
        // Never leak internal error details (DB host, driver internals, etc.)
        // to the client. Cloudflare's dashboard still shows the real error
        // in the Functions logs for debugging.
        console.error('Registration error:', err);
        return jsonResponse({ error: 'Something went wrong. Please try again in a moment.' }, 500);
    }
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
    });
}
