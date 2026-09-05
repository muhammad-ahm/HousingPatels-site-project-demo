# Housing Patel — Real Authentication Backend

This is a real, tested PHP + PostgreSQL authentication system: registration, login,
protected dashboard, and logout — with bcrypt password hashing, prepared statements
(SQL-injection safe), CSRF protection, secure session cookies, login rate limiting,
and a client-side JavaScript validation layer for real-time form feedback.

Tested end-to-end in a local environment: registration, duplicate-email rejection,
correct/incorrect login, 5-attempt rate limiting, CSRF rejection, and logout all verified working.

**Live demo:** https://housingpatels-site-project-demo.muhammad-ahmee-mh.workers.dev/
**Repo:** https://github.com/muhammad-ahm/HousingPatels-site-project-demo

## Requirements (on your hosting)
- PHP 8.1+ with the `pdo_pgsql` and `mbstring` extensions enabled
  (both are enabled by default on almost all standard PHP hosts — just confirm with your host if unsure)
- PostgreSQL 16 or 17 (the schema and queries use only standard, version-independent SQL —
  tested against PostgreSQL 16 locally; PostgreSQL 17 works identically since nothing here
  relies on version-specific features)

## Architecture: Split Hosting

This project uses three separate services, because Cloudflare Workers/Pages
**cannot execute PHP** (it only runs static files and JavaScript):

```
Cloudflare Pages  →  static frontend (index.html, styles.css)
        |
        v  (form submits / API calls)
Koyeb             →  PHP backend (register.php, login.php, dashboard.php, auth/*)
        |
        v
Neon              →  PostgreSQL database
```

## Setup Steps

### 1. Database — Neon
1. Create a free account at [neon.tech](https://neon.tech) and a new project.
2. Copy the connection details it gives you (host, port, database, user, password).
3. Run the schema once against it:
   ```
   psql "your-neon-connection-string" -f db/schema.sql
   ```

### 2. Backend — Koyeb (runs the PHP files via Docker)
1. Push this repo to GitHub (the `Dockerfile` is already included — Koyeb will detect
   and build it automatically, no extra config needed).
2. Create a free account at [koyeb.com](https://www.koyeb.com), create a new Service,
   and connect it to this GitHub repo.
3. In the service's environment variables, add your real Neon credentials:
   ```
   DB_HOST=your-neon-host
   DB_PORT=5432
   DB_NAME=your-neon-db-name
   DB_USER=your-neon-user
   DB_PASSWORD=your-neon-password
   ```
   (Same variable names as `.env.example` — no code changes needed either way.)
4. Deploy. Koyeb gives you a URL like `your-app.koyeb.app` — this is your backend's
   real address (e.g. `https://your-app.koyeb.app/auth/process-login.php`).

### 3. Frontend — Cloudflare Pages
1. Connect the same GitHub repo to Cloudflare Pages (as you already do).
2. Update the `action` attributes in `login.php`/`register.php` — since these are
   PHP-rendered pages, they're actually served **by Koyeb**, not Cloudflare. Only the
   static `index.html` should live on Cloudflare; it should link to your Koyeb URL
   for Login/Register instead of local `.php` files.

### 4. Enable HTTPS in production
Once both sides are live over HTTPS, open `includes/session.php` and uncomment:
```php
'secure' => true,
```
This stops the session cookie from ever being sent over plain HTTP.

### Local Docker testing (optional, before deploying)
If you have Docker installed on your own machine:
```
docker build -t housing-patel .
docker run -p 8080:80 --env-file .env housing-patel
```
Then visit `http://localhost:8080`.

## How It Works
- `register.php` / `auth/process-register.php` — signup form + handler. Validates input,
  checks for duplicate emails, hashes the password with bcrypt, creates the user, logs them in.
- `login.php` / `auth/process-login.php` — login form + handler. Verifies credentials,
  rate-limits repeated failures (5 attempts / 5-minute lockout), regenerates the session ID on success.
- `dashboard.php` — protected page. Redirects to `/login.php` if there's no active session.
- `auth/logout.php` — destroys the session completely and clears the cookie.
- `includes/` — shared building blocks: DB connection, session bootstrap, CSRF tokens, rate limiting.

## Security Notes
- Passwords are never stored or logged in plain text — only bcrypt hashes.
- All database queries use prepared statements (no SQL injection risk from user input).
- Login responses don't reveal whether an email exists in the system (timing-safe check).
- CSRF tokens are required on every state-changing form (register, login, logout).
- Session cookies are `HttpOnly` (JavaScript can't read them) and `SameSite=Lax`.

## What's Intentionally Out of Scope Here
- Password reset / "forgot password" flow (needs email sending — can be added same as the
  contact form's EmailJS pattern from the portfolio project, or a transactional email service).
- Email verification on signup.
- Admin panel / user management UI.

These are natural next additions once this is deployed — happy to build any of them next.
