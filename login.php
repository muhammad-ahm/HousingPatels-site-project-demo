<?php
require_once __DIR__ . '/includes/session.php';
require_once __DIR__ . '/includes/csrf.php';

if (is_logged_in()) {
    header('Location: /dashboard.php');
    exit;
}

$error = flash_get('error');
$success = flash_get('success');
$oldEmail = htmlspecialchars($_SESSION['_old_email'] ?? '', ENT_QUOTES, 'UTF-8');
unset($_SESSION['_old_email']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Housing Patel | Login</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        h2 {
            font-size: 2rem;
        }
        .page {
            background-image: url('./img/ian-keefe-OgcJIKRnRC8-unsplash.jpg');
            background-size: cover;
            background-repeat: no-repeat;
            background-position: center;
            width: 100%;
            height: 37.05rem;
        }
        .web{
            display: flex;
            flex-direction: column;
        }
        .form-message {
            width: 100%;
            max-width: 20rem;
            padding: 0.65rem 1rem;
            border-radius: 10px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            text-align: center;
        }
        .form-error {
            background: #fdecea;
            color: #611a15;
            border: 1px solid #f5c6cb;
        }
        .form-success {
            background: #e9f7ef;
            color: #14532d;
            border: 1px solid #b7ebc6;
        }
    </style>
    <link rel="icon" href="./img/frame.png" type="image/x-icon">
</head>
<body>
    <div class="web">
        <header>
            <a href="./index.html">
                <h1>Housing Patel</h1>
            </a>
        </header>

        <div class="page">
            <div class="form-container">
                <h2>Login Form</h2>
                <?php if ($error): ?>
                    <div class="form-message form-error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
                <?php endif; ?>
                <?php if ($success): ?>
                    <div class="form-message form-success"><?= htmlspecialchars($success, ENT_QUOTES, 'UTF-8') ?></div>
                <?php endif; ?>
                <form action="/auth/process-login.php" method="POST" novalidate>
                    <?= csrf_field() ?>

                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" placeholder="you@example.com" value="<?= $oldEmail ?>" required>

                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="Your password" required>
                    <br>
                    <button type="submit">Login</button>
                    <br>
                    <a href="./register.php" style="display: flex; justify-content: right;"> Registration </a>
                </form>
            </div>
        </div>
    </div>
    <script src="validation.js"></script>
</body>
</html>
