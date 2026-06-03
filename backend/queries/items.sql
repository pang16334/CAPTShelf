-- name: GetAllItems :many
SELECT 
    i.id,
    i.name,
    i.category,
    i.variant,
    i.committee_id,
    i.total_quantity,
    i.description,
    i.created_at,
    i.updated_at,
    COALESCE(SUM(
        CASE
            WHEN br.status = 'active'
            THEN bri.quantity
            ELSE 0
        END
    ), 0)::int AS borrowed_quantity
FROM items i
LEFT JOIN borrow_request_items bri ON bri.item_id = i.id
LEFT JOIN borrow_requests br ON br.id = bri.borrow_request_id
GROUP BY i.id
ORDER BY i.name ASC;

-- name: GetItemsByCommittee :many
SELECT 
    i.id,
    i.name,
    i.category,
    i.variant,
    i.committee_id,
    i.total_quantity,
    i.description,
    i.created_at,
    i.updated_at,
    COALESCE(SUM(
        CASE
            WHEN br.status = 'active'
            THEN bri.quantity
            ELSE 0
        END
    ), 0)::int AS borrowed_quantity
FROM items i
LEFT JOIN borrow_request_items bri ON bri.item_id = i.id
LEFT JOIN borrow_requests br ON br.id = bri.borrow_request_id
WHERE i.committee_id = $1
GROUP BY i.id
ORDER BY i.name ASC;

-- name: GetItemByID :one
SELECT 
    i.id,
    i.name,
    i.category,
    i.variant,
    i.committee_id,
    i.total_quantity,
    i.description,
    i.created_at,
    i.updated_at,
    COALESCE(SUM(
        CASE
            WHEN br.status = 'active'
            THEN bri.quantity
            ELSE 0
        END
    ), 0)::int AS borrowed_quantity
FROM items i
LEFT JOIN borrow_request_items bri ON bri.item_id = i.id
LEFT JOIN borrow_requests br ON br.id = bri.borrow_request_id
WHERE i.id = $1
GROUP BY i.id;

-- name: CreateItem :one
INSERT INTO items (name, category, variant, committee_id, total_quantity, description)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpsertItem :one
INSERT INTO items (name, category, variant, committee_id, total_quantity, description)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (name, variant, committee_id) DO UPDATE
SET total_quantity = EXCLUDED.total_quantity,
    description = EXCLUDED.description,
    updated_at = NOW()
RETURNING *;

-- name: UpdateItem :one
UPDATE items
SET name = $2,
    category = $3,
    variant = $4,
    total_quantity = $5,
    description = $6,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteItem :exec
DELETE FROM items WHERE id = $1;