<?php
require_once __DIR__ . '/includes/session.php';
require_login();

$userName = htmlspecialchars($_SESSION['user_name'] ?? 'there', ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Housing Patel | Dashboard</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        .dashboard-page {
            min-height: 32.4rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 2rem;
        }
        .dashboard-page h2 {
            font-size: 2rem;
            margin-bottom: 0.75rem;
        }
        .dashboard-page p {
            font-size: 1.1rem;
            margin-bottom: 1.5rem;
        }
        .logout-form button {
            padding: 10px 24px;
            background-color: rgba(7, 54, 60, 1);
            color: white;
            border: none;
            cursor: pointer;
            font-size: 16px;
            border-radius: 20px;
        }
        .logout-form button:hover {
            background-color: rgba(4, 157, 177, 1);
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

        <div class="dashboard-page">
            <h2>Welcome back, <?= $userName ?> 👋</h2>
            <p>You're logged in. This is a protected page — only visible when a real, authenticated session exists.</p>
            <form class="logout-form" action="/auth/logout.php" method="POST">
                <?php require_once __DIR__ . '/includes/csrf.php'; ?>
                <?= csrf_field() ?>
                <button type="submit">Log Out</button>
            </form>
        </div>
    </div>
</body>
</html>
