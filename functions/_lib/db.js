// ===================================================
// Database — Neon via the official serverless HTTP driver
// This works natively in Cloudflare Workers/Pages Functions because
// it talks to Neon over HTTP (fetch), not a raw TCP/Postgres socket —
// which the Workers runtime doesn't support directly.
// ===================================================

import { neon } from '@neondatabase/serverless';

export function getDb(env) {
    if (!env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set.');
    }
    return neon(env.DATABASE_URL);
}
