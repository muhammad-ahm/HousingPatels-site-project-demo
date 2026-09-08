import { clearAuthCookie } from '../_lib/cookies.js';
import { isTrustedOrigin } from '../_lib/csrf.js';

export async function onRequestPost({ request, env }) {
    if (!isTrustedOrigin(request, env)) {
        return new Response(JSON.stringify({ error: 'Request blocked for security reasons.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': clearAuthCookie(),
        },
    });
}
