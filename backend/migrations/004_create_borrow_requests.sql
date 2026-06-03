CREATE TABLE borrow_requests (
    id                   SERIAL PRIMARY KEY,
    borrower_name        TEXT NOT NULL,
    borrower_telegram_id BIGINT NOT NULL,
    committee_id         INT NOT NULL REFERENCES committees(id),
    borrow_photo_url     TEXT NOT NULL,
    return_photo_url     TEXT NOT NULL,
    expected_return_at   DATE NOT NULL,
    remarks              TEXT,
    status               TEXT NOT NULL DEFAULT 'active',
    borrowed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);