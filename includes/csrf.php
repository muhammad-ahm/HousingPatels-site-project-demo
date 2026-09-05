<?php
// Requires session.php to already be included (session must be active).

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_field(): string
{
    $token = htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8');
    return '<input type="hidden" name="csrf_token" value="' . $token . '">';
}

function csrf_verify(?string $submittedToken): bool
{
    return !empty($_SESSION['csrf_token'])
        && !empty($submittedToken)
        && hash_equals($_SESSION['csrf_token'], $submittedToken);
}
