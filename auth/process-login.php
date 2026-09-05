<?php
require_once __DIR__ . '/../includes/session.php';
require_once __DIR__ . '/../includes/csrf.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/rate_limit.php';

function fail(string $message, string $email = ''): void
{
    flash_set('error', $message);
    $_SESSION['_old_email'] = $email;
    header('Location: /login.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /login.php');
    exit;
}

if (!csrf_verify($_POST['csrf_token'] ?? null)) {
    fail('Your session expired. Please try again.');
}

$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';

if (login_attempts_remaining() <= 0) {
    fail('Too many failed attempts. Please wait a few minutes and try again.', $email);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    register_failed_login_attempt();
    fail('Please enter a valid email and password.', $email);
}

$pdo = get_db();
$stmt = $pdo->prepare('SELECT id, name, password_hash FROM users WHERE email = :email');
$stmt->execute(['email' => $email]);
$user = $stmt->fetch();

// Always run password_verify even on a missing user (against a dummy hash)
// so that response timing doesn't reveal whether the email exists.
$dummyHash = '$2y$10$6JCcQktvZmBdZX05YVReie/FAltJMQLllMXT9fAKdhyNRUbKM929S';
$hashToCheck = $user['password_hash'] ?? $dummyHash;
$passwordOk = password_verify($password, $hashToCheck);

if (!$user || !$passwordOk) {
    register_failed_login_attempt();
    fail('Incorrect email or password.', $email);
}

clear_login_attempts();
session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['user_name'] = $user['name'];

header('Location: /dashboard.php');
exit;
