<?php
// Simple in-session rate limiter to slow down brute-force login attempts.
// This is a lightweight, dependency-free safeguard — for a high-traffic
// production system you'd eventually move this to Redis or similar,
// keyed by IP rather than session, but this is a solid baseline.

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 300; // 5 minutes

function login_attempts_remaining(): int
{
    $data = $_SESSION['_login_throttle'] ?? null;
    if (!$data) {
        return MAX_LOGIN_ATTEMPTS;
    }
    if (time() - $data['first_attempt'] > LOCKOUT_SECONDS) {
        // Window expired, reset.
        unset($_SESSION['_login_throttle']);
        return MAX_LOGIN_ATTEMPTS;
    }
    return max(0, MAX_LOGIN_ATTEMPTS - $data['count']);
}

function register_failed_login_attempt(): void
{
    $data = $_SESSION['_login_throttle'] ?? null;
    if (!$data || time() - $data['first_attempt'] > LOCKOUT_SECONDS) {
        $_SESSION['_login_throttle'] = ['first_attempt' => time(), 'count' => 1];
        return;
    }
    $data['count']++;
    $_SESSION['_login_throttle'] = $data;
}

function clear_login_attempts(): void
{
    unset($_SESSION['_login_throttle']);
}
