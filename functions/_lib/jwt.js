// ===================================================
// Minimal JWT (HS256) — sign & verify using native Web Crypto
// No external dependency needed; HMAC-SHA256 via SubtleCrypto is
// fast and well within the Workers CPU budget.
// ===================================================

function base64UrlEncode(input) {
    let base64;
    if (typeof input === 'string') {
        base64 = btoa(unescape(encodeURIComponent(input)));
    } else {
        base64 = btoa(String.fromCharCode(...new Uint8Array(input)));
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input) {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return atob(base64);
}

async function getHmacKey(secret) {
    const enc = new TextEncoder();
    return crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

export async function signJwt(payload, secret, expiresInSeconds = 60 * 60 * 24 * 7) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const key = await getHmacKey(secret);
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dataToSign));
    const encodedSignature = base64UrlEncode(signature);

    return `${dataToSign}.${encodedSignature}`;
}

export async function verifyJwt(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [encodedHeader, encodedPayload, encodedSignature] = parts;
        const dataToVerify = `${encodedHeader}.${encodedPayload}`;

        const key = await getHmacKey(secret);
        const signatureBytes = Uint8Array.from(base64UrlDecode(encodedSignature), c => c.charCodeAt(0));

        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureBytes,
            new TextEncoder().encode(dataToVerify)
        );

        if (!isValid) return null;

        const payload = JSON.parse(base64UrlDecode(encodedPayload));

        // Check expiry
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return null;
        }

        return payload;
    } catch (err) {
        return null;
    }
}
