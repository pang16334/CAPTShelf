CREATE TABLE items (
    id             SERIAL PRIMARY KEY,
    name           TEXT NOT NULL,
    category       TEXT NOT NULL,
    variant        TEXT,
    committee_id   INT NOT NULL REFERENCES committees(id),
    total_quantity INT NOT NULL DEFAULT 0,
    description    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);