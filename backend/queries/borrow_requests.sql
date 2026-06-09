-- name: CreateBorrowRequest :one
INSERT INTO borrow_requests (
    borrower_name,
    borrower_telegram_id,
    committee_id,
    borrow_photo_url,
    expected_return_at,
    remarks
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetAllBorrowRequests :many
SELECT
    br.id,
    br.borrower_name,
    br.borrower_telegram_id,
    br.committee_id,
    br.borrow_photo_url,
    br.return_photo_url,
    br.expected_return_at,
    br.remarks,
    br.status,
    br.borrowed_at
FROM borrow_requests br
ORDER BY br.borrowed_at DESC;

-- name: GetBorrowRequestsByCommittee :many
SELECT
    br.id,
    br.borrower_name,
    br.borrower_telegram_id,
    br.committee_id,
    br.borrow_photo_url,
    br.return_photo_url,
    br.expected_return_at,
    br.remarks,
    br.status,
    br.borrowed_at
FROM borrow_requests br
WHERE br.committee_id = $1
ORDER BY br.borrowed_at DESC;

-- name: GetBorrowRequestByID :one
SELECT
    br.id,
    br.borrower_name,
    br.borrower_telegram_id,
    br.committee_id,
    br.borrow_photo_url,
    br.return_photo_url,
    br.expected_return_at,
    br.remarks,
    br.status,
    br.borrowed_at
FROM borrow_requests br
WHERE br.id = $1;

-- name: GetBorrowRequestsByTelegramID :many
SELECT
    br.id,
    br.borrower_name,
    br.borrower_telegram_id,
    br.committee_id,
    br.borrow_photo_url,
    br.return_photo_url,
    br.expected_return_at,
    br.remarks,
    br.status,
    br.borrowed_at
FROM borrow_requests br
WHERE br.borrower_telegram_id = $1
ORDER BY br.borrowed_at DESC;

-- name: ReturnBorrowRequest :one
UPDATE borrow_requests
SET status = 'returned',
    return_photo_url = $2
WHERE id = $1
RETURNING *;

-- name: CancelBorrowRequest :one
UPDATE borrow_requests
SET status = 'cancelled'
WHERE id = $1
RETURNING *;

-- name: CreateBorrowRequestItem :one
INSERT INTO borrow_request_items (borrow_request_id, item_id, quantity)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetBorrowRequestItems :many
SELECT
    bri.id,
    bri.borrow_request_id,
    bri.item_id,
    bri.quantity,
    bri.returned_quantity
FROM borrow_request_items bri
WHERE bri.borrow_request_id = $1;

-- name: GetRecentActivity :many
SELECT
    br.id,
    br.borrower_name,
    br.committee_id,
    br.status,
    br.borrowed_at
FROM borrow_requests br
ORDER BY br.borrowed_at DESC
LIMIT $1;