<?php
require_once __DIR__ . '/includes/session.php';
require_once __DIR__ . '/includes/csrf.php';

if (is_logged_in()) {
    header('Location: /dashboard.php');
    exit;
}

$error = flash_get('error');
$old = $_SESSION['_old_input'] ?? [];
unset($_SESSION['_old_input']);
$safe = fn($key) => htmlspecialchars($old[$key] ?? '', ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Housing Patel | Register</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        .page {
            background-image: url('./img/ian-keefe-OgcJIKRnRC8-unsplash.jpg');
            background-size: cover;
            background-repeat: no-repeat;
            background-position: center;
            width: 100%;
            height: auto;
        }
        .web{
            display: flex;
            flex-direction: column;
        }
        .form-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            width: 30rem;
            height: auto;
            margin: 4rem auto;
            padding: 2rem;
            color: rgba(7, 54, 60, 1);
            background-color: rgba(237, 237, 237, 0.733);
            border-radius: 20px;
            box-shadow: 0 4px 8px rgba(7, 54, 60, 0.4);
        }
        .form-error {
            width: 100%;
            max-width: 20rem;
            background: #fdecea;
            color: #611a15;
            border: 1px solid #f5c6cb;
            padding: 0.65rem 1rem;
            border-radius: 10px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            text-align: center;
        }
        @media (min-width: 355px) and (max-width: 575px){
            .form-container {
                width: 75%;
                height: auto;
                margin: 3rem auto;
                padding: 1.9rem;
            }
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
                <h2>Registration Form</h2>
                <?php if ($error): ?>
                    <div class="form-error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
                <?php endif; ?>
                <form action="/auth/process-register.php" method="POST" novalidate>
                    <?= csrf_field() ?>

                    <label for="name">Name</label>
                    <input type="text" id="name" name="name" placeholder="i.e. Mr. Mahmood" value="<?= $safe('name') ?>" required>

                    <label for="gender">Gender</label>
                    <select id="gender" name="gender" required>
                        <option value="" disabled <?= empty($old['gender']) ? 'selected' : '' ?>>Select...</option>
                        <option value="male" <?= ($old['gender'] ?? '') === 'male' ? 'selected' : '' ?>>Male</option>
                        <option value="female" <?= ($old['gender'] ?? '') === 'female' ? 'selected' : '' ?>>Female</option>
                        <option value="other" <?= ($old['gender'] ?? '') === 'other' ? 'selected' : '' ?>>Other</option>
                        <option value="Prefer not to Say" <?= ($old['gender'] ?? '') === 'Prefer not to Say' ? 'selected' : '' ?>>Prefer not to Say</option>
                    </select>

                    <label for="dob">Date of Birth</label>
                    <input type="date" id="dob" name="dob" value="<?= $safe('dob') ?>" required>

                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" placeholder="you@example.com" value="<?= $safe('email') ?>" required>

                    <label for="phone">Phone Number</label>
                    <input type="tel" id="phone" name="phone" placeholder="03XX-XXXXXXX" value="<?= $safe('phone') ?>" required>

                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="At least 8 characters" minlength="8" required>

                    <label for="password_confirm">Confirm Password</label>
                    <input type="password" id="password_confirm" name="password_confirm" placeholder="Re-enter your password" minlength="8" required>

                    <br>
                    <button type="submit">Submit</button>
                    <br>
                    <a href="./login.php" style="display: flex; justify-content: right;"> Already have account!</a>
                </form>
            </div>
        </div>
    </div>
    <script src="validation.js"></script>
</body>
</html>
