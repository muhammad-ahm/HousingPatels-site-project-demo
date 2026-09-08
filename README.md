# Housing Patel — Full-Stack on Cloudflare + Neon

A real, tested authentication system: registration, login, protected dashboard,
and logout — running entirely on **Cloudflare Pages** (static frontend +
JavaScript backend via Pages Functions) with **Neon** (PostgreSQL) as the
database. No separate backend host needed.

Tested locally end-to-end with `wrangler pages dev`: static file serving,
CSRF (Origin-header) protection, password hashing, JWT sign/verify (valid,
tampered, and expired tokens), cookie handling, and clean error responses
all verified working. The only thing not testable in this sandbox is a live
Neon connection — see "What Wasn't Tested" below.

## Architecture

```
Cloudflare Pages
    ├── Static files: index.html, login.html, register.html, dashboard.html, styles.css
    └── Pages Functions (JavaScript): /functions/auth/*.js  ← this is your backend
                ↓ (via Neon's HTTP-based serverless driver)
Neon (PostgreSQL)
```

Everything lives in **one repo, one deploy** — no Render/Railway/Koyeb needed,
since Cloudflare Pages Functions run JavaScript natively (unlike PHP, which
Cloudflare's Workers runtime cannot execute).

## How Auth Works Here (No PHP Sessions)

Cloudflare Workers/Pages Functions are stateless — there's no server-side
`$_SESSION` to rely on. Instead:

- **Login/Register** issue a signed **JWT** (JSON Web Token) stored in an
  `HttpOnly`, `Secure`, `SameSite=Lax` cookie. The browser sends it
  automatically on every request; JavaScript can never read it directly.
- **`/auth/me`** verifies that cookie's signature and expiry to check who's
  logged in — this is what `dashboard.html` calls on load to decide whether
  to show the page or redirect to login.
- **Passwords** are hashed with PBKDF2 (100% native Web Crypto API, no
  external library) — deliberately chosen over bcrypt because bcrypt's cost
  function can exceed the Workers free-tier's 10ms-per-request CPU budget.
- **Rate limiting** (5 failed login attempts → 5-minute lockout) is backed by
  Cloudflare KV, a free key-value store.
- **CSRF protection** checks the request's `Origin` header — since this is a
  same-origin JSON API (not classic form POSTs), this is the standard,
  sufficient approach; a malicious site can't forge that header from JS.

## Setup Steps

### 1. Database — Neon
1. Create a free account at [neon.tech](https://neon.tech), create a new project.
2. Copy the **connection string** it gives you (looks like
   `postgresql://user:password@host/dbname?sslmode=require`).
3. Run the schema once, either via Neon's built-in **SQL Editor** (paste the
   contents of `schema.sql` and run it — no local tools needed), or via `psql`:
   ```
   psql "your-neon-connection-string" -f schema.sql
   ```

### 2. Cloudflare Pages — deploy the site
1. Push this repo to GitHub.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages →
   Connect to Git**, and select this repo.
3. Build settings: leave the build command **empty** and the output directory
   as `/` (this is a static site with Functions, no build step needed).
4. Deploy. You'll get a URL like `housing-patel.pages.dev`.

### 3. Environment Variables (in the Cloudflare dashboard)
Go to your Pages project → **Settings → Environment variables**, and add:
```
DATABASE_URL = <your Neon connection string>
JWT_SECRET   = <any long random string — generate with: openssl rand -base64 32>
```
Add these under **both** "Production" and "Preview" environments.

### 4. KV Namespace (for login rate-limiting)
1. In the Cloudflare dashboard: **Workers & Pages → KV → Create namespace**,
   name it anything (e.g. `housing-patel-ratelimit`).
2. Go back to your Pages project → **Settings → Functions → KV namespace
   bindings → Add binding**:
   - Variable name: `RATE_LIMIT_KV` (must match this exactly)
   - KV namespace: the one you just created
3. Redeploy (Settings changes require a new deployment to take effect —
   trigger one from the Deployments tab, or just push any small change).

### Local development (optional)
```
npm install
cp .dev.vars.example .dev.vars   # then fill in your real Neon URL + a JWT secret
npm run dev
```
Visit `http://localhost:8788`. Wrangler emulates the KV namespace locally
automatically — no real Cloudflare KV needed for local testing.

## What Wasn't Tested
This sandbox can run `wrangler pages dev` (which emulates the whole Workers
runtime locally, including KV), but it cannot reach the public internet to
connect to a real Neon database. Everything **except the actual database
read/write** has been directly tested and confirmed working:

| Piece | Tested? |
|---|---|
| Static file serving, routing | ✅ Yes |
| CSRF (Origin header) protection | ✅ Yes |
| Password hashing (PBKDF2) — hash, verify, timing | ✅ Yes |
| JWT — sign, verify, tamper detection, expiry | ✅ Yes |
| Cookie set/clear on login/logout | ✅ Yes |
| Clean error responses (no leaked stack traces) | ✅ Yes |
| Actual SQL against a real Neon database | ⚠️ Not testable here — please verify once deployed |

The SQL query patterns follow Neon's official documented usage exactly, so
this is low-risk — but test registration + login for real once it's live,
and let me know if anything doesn't behave as expected.

## What's Intentionally Out of Scope
- Password reset / "forgot password" (needs email sending — can reuse the
  EmailJS pattern from the portfolio project, or a transactional email API).
- Email verification on signup.
- Admin panel / user management UI.
