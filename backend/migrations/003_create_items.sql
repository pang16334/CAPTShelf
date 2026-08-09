CREATE TABLE IF NOT EXISTS items (
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

-- unique constraint using COALESCE to handle NULL variants
CREATE UNIQUE INDEX IF NOT EXISTS items_name_variant_committee_unique 
ON items (name, COALESCE(variant, ''), committee_id);