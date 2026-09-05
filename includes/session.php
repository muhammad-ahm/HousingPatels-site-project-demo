<?php
// Secure session bootstrap. Include this at the very top of any
// PHP file that needs to read or write session data — before any
// HTML output.

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,   // JS can't read the cookie — blocks XSS session theft
        'samesite' => 'Lax',  // blocks most CSRF vectors by default
        // 'secure' => true,   // uncomment once the site is served over HTTPS
    ]);
    session_start();
}

/** Store a one-time flash message shown on the next page load. */
function flash_set(string $key, string $message): void
{
    $_SESSION['_flash'][$key] = $message;
}

/** Read and clear a flash message. Returns null if none was set. */
function flash_get(string $key): ?string
{
    if (!empty($_SESSION['_flash'][$key])) {
        $message = $_SESSION['_flash'][$key];
        unset($_SESSION['_flash'][$key]);
        return $message;
    }
    return null;
}

function current_user_id(): ?int
{
    return $_SESSION['user_id'] ?? null;
}

function is_logged_in(): bool
{
    return current_user_id() !== null;
}

/** Redirect to the login page if there is no logged-in user. */
function require_login(): void
{
    if (!is_logged_in()) {
        flash_set('error', 'Please log in to continue.');
        header('Location: /login.php');
        exit;
    }
}
