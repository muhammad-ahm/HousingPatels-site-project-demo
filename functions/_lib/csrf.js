// ===================================================
// CSRF protection for a same-origin JSON API.
//
// Since the frontend and backend now live on the same Cloudflare
// Pages domain and talk via fetch() (not classic form POSTs), we don't
// need server-stored CSRF tokens. Verifying the Origin header is the
// standard, recommended approach here: a malicious site making a
// cross-origin fetch() to our API either gets blocked by CORS,
// or — if somehow it isn't — this Origin check catches it, because
// browsers cannot forge the Origin header from JavaScript.
// ===================================================

export function isTrustedOrigin(request, env) {
    const origin = request.headers.get('Origin');
    if (!origin) {
        // Same-origin navigations/form posts sometimes omit Origin;
        // fall back to checking Referer in that case.
        const referer = request.headers.get('Referer');
        if (!referer) return false;
        try {
            const refererUrl = new URL(referer);
            return refererUrl.origin === new URL(request.url).origin;
        } catch {
            return false;
        }
    }
    try {
        return new URL(origin).origin === new URL(request.url).origin;
    } catch {
        return false;
    }
}
