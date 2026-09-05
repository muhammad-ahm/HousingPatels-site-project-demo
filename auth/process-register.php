<?php
require_once __DIR__ . '/../includes/session.php';
require_once __DIR__ . '/../includes/csrf.php';
require_once __DIR__ . '/../includes/db.php';

function fail(string $message, array $oldInput = []): void
{
    flash_set('error', $message);
    $_SESSION['_old_input'] = $oldInput;
    header('Location: /register.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /register.php');
    exit;
}

if (!csrf_verify($_POST['csrf_token'] ?? null)) {
    fail('Your session expired. Please try again.');
}

$name = trim($_POST['name'] ?? '');
$gender = trim($_POST['gender'] ?? '');
$dob = trim($_POST['dob'] ?? '');
$email = trim($_POST['email'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$password = $_POST['password'] ?? '';
$passwordConfirm = $_POST['password_confirm'] ?? '';

$oldInput = [
    'name' => $name,
    'gender' => $gender,
    'dob' => $dob,
    'email' => $email,
    'phone' => $phone,
];

$allowedGenders = ['male', 'female', 'other', 'Prefer not to Say'];

if ($name === '' || mb_strlen($name) > 100) {
    fail('Please enter a valid name.', $oldInput);
}
if (!in_array($gender, $allowedGenders, true)) {
    fail('Please select a gender.', $oldInput);
}
$dobDate = DateTime::createFromFormat('Y-m-d', $dob);
if (!$dobDate) {
    fail('Please enter a valid date of birth.', $oldInput);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('Please enter a valid email address.', $oldInput);
}
if ($phone === '' || mb_strlen($phone) > 20) {
    fail('Please enter a valid phone number.', $oldInput);
}
if (mb_strlen($password) < 8) {
    fail('Password must be at least 8 characters long.', $oldInput);
}
if ($password !== $passwordConfirm) {
    fail('Passwords do not match.', $oldInput);
}

$pdo = get_db();

// Check for an existing account with this email.
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email');
$stmt->execute(['email' => $email]);
if ($stmt->fetch()) {
    fail('An account with this email already exists. Try logging in instead.', $oldInput);
}

$passwordHash = password_hash($password, PASSWORD_BCRYPT);

$insert = $pdo->prepare(
    'INSERT INTO users (name, gender, dob, email, phone, password_hash)
     VALUES (:name, :gender, :dob, :email, :phone, :password_hash)
     RETURNING id'
);
$insert->execute([
    'name' => $name,
    'gender' => $gender,
    'dob' => $dob,
    'email' => $email,
    'phone' => $phone,
    'password_hash' => $passwordHash,
]);
$newUserId = $insert->fetchColumn();

// Log the new user in immediately.
session_regenerate_id(true);
$_SESSION['user_id'] = (int) $newUserId;
$_SESSION['user_name'] = $name;

header('Location: /dashboard.php');
exit;
