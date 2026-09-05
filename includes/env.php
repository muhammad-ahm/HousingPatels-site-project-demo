<?php
// Minimal .env loader — no Composer dependency needed.
// On real hosting (Render, Railway, etc.) you'll usually set these
// values directly in the platform's dashboard instead of a .env file,
// in which case this loader simply does nothing and getenv() picks up
// the real environment variables the host already injected.

function load_env(string $path): void
{
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        // Strip surrounding quotes if present
        $value = trim($value, "\"'");

        if ($key !== '' && getenv($key) === false) {
            putenv("$key=$value");
        }
    }
}

load_env(__DIR__ . '/../.env');
