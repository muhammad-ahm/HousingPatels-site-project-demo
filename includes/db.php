<?php
require_once __DIR__ . '/env.php';

/**
 * Returns a shared PDO connection to PostgreSQL.
 * Credentials come from environment variables — never hardcode
 * real credentials in this file.
 */
function get_db(): PDO
{
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $host = getenv('DB_HOST') ?: 'localhost';
    $port = getenv('DB_PORT') ?: '5432';
    $dbname = getenv('DB_NAME') ?: 'houseplace_db';
    $user = getenv('DB_USER') ?: 'houseplace_user';
    $password = getenv('DB_PASSWORD') ?: '';

    try {
        $pdo = new PDO(
            "pgsql:host=$host;port=$port;dbname=$dbname",
            $user,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } catch (PDOException $e) {
        // Never leak raw DB error details to the browser in production.
        error_log('Database connection failed: ' . $e->getMessage());
        http_response_code(500);
        die('Something went wrong connecting to the database. Please try again shortly.');
    }

    return $pdo;
}
