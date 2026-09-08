// ===================================================
// Cookie helpers — Pages Functions work with the standard Web
// Request/Response API, so cookies need manual parsing/serializing.
// ===================================================

export function parseCookies(request) {
    const header = request.headers.get('Cookie') || '';
    const cookies = {};
    header.split(';').forEach((pair) => {
        const idx = pair.indexOf('=');
        if (idx === -1) return;
        const key = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (key) cookies[key] = decodeURIComponent(value);
    });
    return cookies;
}

export function serializeAuthCookie(token, maxAgeSeconds) {
    // HttpOnly: JS can't read it (XSS protection)
    // Secure: only sent over HTTPS (Cloudflare Pages is always HTTPS)
    // SameSite=Lax: sent on top-level navigation, blocks most CSRF vectors
    const parts = [
        `auth_token=${encodeURIComponent(token)}`,
        'Path=/',
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        `Max-Age=${maxAgeSeconds}`,
    ];
    return parts.join('; ');
}

export function clearAuthCookie() {
    return 'auth_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}
