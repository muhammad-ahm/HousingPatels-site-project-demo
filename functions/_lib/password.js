// ===================================================
// Password hashing — PBKDF2 via Web Crypto API
//
// WHY NOT bcrypt: bcrypt's cost function is CPU-heavy and can exceed
// Cloudflare Workers' free-tier limit of 10ms CPU time per request,
// causing the request to fail outright. PBKDF2 via SubtleCrypto is
// implemented natively (not pure JS), so it's fast enough to stay
// safely under that budget.
//
// Iteration count: 40,000 was benchmarked at ~6ms — a deliberate
// trade-off between security and the free-tier CPU ceiling. If this
// app moves to the Workers Paid plan (30s CPU limit), increase
// PBKDF2_ITERATIONS below for stronger protection — the hash format
// stores the iteration count used, so old and new hashes can coexist
// without breaking existing logins.
// ===================================================

export const PBKDF2_ITERATIONS = 40000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function bufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

export async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const enc = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        HASH_BITS
    );

    // Self-describing format: algorithm$iterations$salt$hash
    // (same idea as bcrypt embedding its cost factor in the hash string)
    return `pbkdf2$${PBKDF2_ITERATIONS}$${bufferToBase64(salt)}$${bufferToBase64(derivedBits)}`;
}

export async function verifyPassword(password, storedHash) {
    try {
        const parts = storedHash.split('$');
        if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
            return false;
        }
        const iterations = parseInt(parts[1], 10);
        const salt = new Uint8Array(base64ToBuffer(parts[2]));
        const expectedHash = parts[3];

        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );

        const derivedBits = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
            keyMaterial,
            HASH_BITS
        );

        const actualHash = bufferToBase64(derivedBits);

        // Constant-time comparison to avoid leaking hash info via timing
        if (actualHash.length !== expectedHash.length) return false;
        let mismatch = 0;
        for (let i = 0; i < actualHash.length; i++) {
            mismatch |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
        }
        return mismatch === 0;
    } catch (err) {
        return false;
    }
}
