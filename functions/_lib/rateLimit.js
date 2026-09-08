// ===================================================
// Rate limiting — backed by Cloudflare KV
// Tracks failed login attempts per email, with a rolling lockout window.
// ===================================================

export const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 5 * 60; // 5 minutes

function rateLimitKey(identifier) {
    return `login_attempts:${identifier.toLowerCase()}`;
}

export async function getAttemptsRemaining(kv, identifier) {
    const raw = await kv.get(rateLimitKey(identifier));
    if (!raw) return MAX_ATTEMPTS;
    const count = parseInt(raw, 10) || 0;
    return Math.max(0, MAX_ATTEMPTS - count);
}

export async function recordFailedAttempt(kv, identifier) {
    const key = rateLimitKey(identifier);
    const raw = await kv.get(key);
    const count = raw ? (parseInt(raw, 10) || 0) : 0;
    await kv.put(key, String(count + 1), { expirationTtl: LOCKOUT_SECONDS });
}

export async function clearAttempts(kv, identifier) {
    await kv.delete(rateLimitKey(identifier));
}
