// ===================================================
// GET  /properties            → list + search/filter (public, no login needed)
// POST /properties            → create a new listing (requires login)
// ===================================================

import { getDb } from '../_lib/db.js';
import { getAuthUser, jsonResponse } from '../_lib/auth.js';
import { isTrustedOrigin } from '../_lib/csrf.js';
import { isNonEmptyString } from '../_lib/validate.js';

const VALID_TYPES = ['house', 'apartment', 'plot', 'commercial'];
const VALID_SORTS = { newest: 'created_at DESC', price_low: 'price ASC', price_high: 'price DESC' };

export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const city = url.searchParams.get('city');
        const type = url.searchParams.get('type');
        const minPrice = url.searchParams.get('minPrice');
        const maxPrice = url.searchParams.get('maxPrice');
        const bedrooms = url.searchParams.get('bedrooms');
        const sortKey = VALID_SORTS[url.searchParams.get('sort')] ? url.searchParams.get('sort') : 'newest';
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
        const pageSize = 12;
        const offset = (page - 1) * pageSize;

        const sql = getDb(env);

        // Built with numbered placeholders ($1, $2, ...) via sql.query(),
        // NOT by composing sql`` tagged fragments — the Neon serverless
        // driver treats every `${...}` inside a tagged template as a bind
        // *value*, not a nested SQL fragment, so fragment composition
        // (which works in some other SQL template libraries) silently
        // produces wrong queries here. Every value below is still fully
        // parameterized — only the fixed column/operator text (never user
        // input) is conditionally included, so this stays injection-safe.
        const whereParts = ["status = 'available'"];
        const params = [];

        if (city) {
            params.push('%' + city + '%');
            whereParts.push(`city ILIKE $${params.length}`);
        }
        if (type && VALID_TYPES.includes(type)) {
            params.push(type);
            whereParts.push(`property_type = $${params.length}`);
        }
        if (minPrice && !isNaN(minPrice)) {
            params.push(Number(minPrice));
            whereParts.push(`price >= $${params.length}`);
        }
        if (maxPrice && !isNaN(maxPrice)) {
            params.push(Number(maxPrice));
            whereParts.push(`price <= $${params.length}`);
        }
        if (bedrooms && !isNaN(bedrooms)) {
            params.push(Number(bedrooms));
            whereParts.push(`bedrooms >= $${params.length}`);
        }

        const whereSql = whereParts.join(' AND ');
        const orderBySql = VALID_SORTS[sortKey];

        const listParams = [...params, pageSize, offset];
        const properties = await sql.query(
            `SELECT id, title, price, city, address, property_type, bedrooms, bathrooms, area_sqft, image_url, created_at
             FROM properties
             WHERE ${whereSql}
             ORDER BY ${orderBySql}
             LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
            listParams
        );

        const countRows = await sql.query(`SELECT COUNT(*)::int AS total FROM properties WHERE ${whereSql}`, params);
        const total = countRows[0]?.total || 0;

        return jsonResponse({
            properties,
            pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        });
    } catch (err) {
        console.error('Property list error:', err);
        return jsonResponse({ error: 'Could not load properties right now.' }, 500);
    }
}

export async function onRequestPost({ request, env }) {
    if (!isTrustedOrigin(request, env)) {
        return jsonResponse({ error: 'Request blocked for security reasons.' }, 403);
    }

    const authUser = await getAuthUser(request, env);
    if (!authUser) {
        return jsonResponse({ error: 'You must be logged in to list a property.' }, 401);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid request format.' }, 400);
    }

    const { title, description, price, city, address, propertyType, bedrooms, bathrooms, areaSqft, imageUrl } = body;

    if (!isNonEmptyString(title, 200)) return jsonResponse({ error: 'Please enter a title.' }, 400);
    if (!isNonEmptyString(city, 100)) return jsonResponse({ error: 'Please enter a city.' }, 400);
    if (typeof price !== 'number' || price <= 0) return jsonResponse({ error: 'Please enter a valid price.' }, 400);
    const type = VALID_TYPES.includes(propertyType) ? propertyType : 'house';

    try {
        const sql = getDb(env);
        const rows = await sql`
            INSERT INTO properties (owner_id, title, description, price, city, address, property_type, bedrooms, bathrooms, area_sqft, image_url)
            VALUES (${authUser.userId}, ${title.trim()}, ${description || null}, ${price}, ${city.trim()}, ${address || null}, ${type}, ${bedrooms || null}, ${bathrooms || null}, ${areaSqft || null}, ${imageUrl || null})
            RETURNING id
        `;
        return jsonResponse({ success: true, id: rows[0].id }, 201);
    } catch (err) {
        console.error('Property create error:', err);
        return jsonResponse({ error: 'Could not create the listing right now.' }, 500);
    }
}
