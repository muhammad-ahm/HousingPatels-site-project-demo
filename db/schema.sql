-- Housing Patel — Users table schema (PostgreSQL)
-- Run this once against your database before using the app.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(30) NOT NULL,
    dob DATE NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Speeds up login lookups by email (already implied by UNIQUE, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
