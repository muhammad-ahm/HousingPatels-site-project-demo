import { getDb } from '../_lib/db.js';
import { verifyPassword } from '../_lib/password.js';
import { signJwt } from '../_lib/jwt.js';
import { serializeAuthCookie } from '../_lib/cookies.js';
import { isTrustedOrigin } from '../_lib/csrf.js';
import { isValidEmail } from '../_lib/validate.js';
import { getAttemptsRemaining, recordFailedAttempt, clearAttempts } from '../_lib/rateLimit.js';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// A validly-formatted dummy hash, checked even when no user is found,
// so response timing doesn't reveal whether an email is registered.
const DUMMY_HASH = 'pbkdf2$40000$sbToXVLHcKWaiA9v4m79wA==$PSx18nO5ByQfqQlrMq16oUQwrdyZ0AsSdXqZfaiTZkU=';

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

    const { email, password } = body;

    if (!isValidEmail(email) || typeof password !== 'string' || password === '') {
        return jsonResponse({ error: 'Please enter a valid email and password.' }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const kv = env.RATE_LIMIT_KV;

    try {
        if (kv) {
            const remaining = await getAttemptsRemaining(kv, normalizedEmail);
            if (remaining <= 0) {
                return jsonResponse({ error: 'Too many failed attempts. Please wait a few minutes and try again.' }, 429);
            }
        }

        const sql = getDb(env);
        const rows = await sql`SELECT id, name, password_hash FROM users WHERE email = ${normalizedEmail}`;
        const user = rows[0];

        const hashToCheck = user ? user.password_hash : DUMMY_HASH;
        const passwordOk = await verifyPassword(password, hashToCheck);

        if (!user || !passwordOk) {
            if (kv) await recordFailedAttempt(kv, normalizedEmail);
            return jsonResponse({ error: 'Incorrect email or password.' }, 401);
        }

        if (kv) await clearAttempts(kv, normalizedEmail);

        const token = await signJwt({ userId: user.id, name: user.name }, env.JWT_SECRET, COOKIE_MAX_AGE);

        return jsonResponse(
            { success: true, name: user.name },
            200,
            { 'Set-Cookie': serializeAuthCookie(token, COOKIE_MAX_AGE) }
        );
    } catch (err) {
        // Never leak internal error details (DB host, driver internals, etc.)
        // to the client. Cloudflare's dashboard still shows the real error
        // in the Functions logs for debugging.
        console.error('Login error:', err);
        return jsonResponse({ error: 'Something went wrong. Please try again in a moment.' }, 500);
    }
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
    });
}
