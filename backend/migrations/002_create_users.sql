CREATE TABLE users (
    id                SERIAL PRIMARY KEY,
    telegram_id       BIGINT UNIQUE NOT NULL,
    name              TEXT NOT NULL,
    username          TEXT,
    role              TEXT NOT NULL DEFAULT 'user',
    committee_id      INT REFERENCES committees(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);