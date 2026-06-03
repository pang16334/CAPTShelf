-- name: GetUserByTelegramID :one
SELECT id, telegram_id, name, username, role, committee_id, created_at
FROM users
WHERE telegram_id = $1;

-- name: GetAllUsers :many
SELECT id, telegram_id, name, username, role, committee_id, created_at
FROM users
ORDER BY created_at DESC;

-- name: UpdateUserRole :one
UPDATE users
SET role = $2, committee_id = $3
WHERE id = $1
RETURNING *;