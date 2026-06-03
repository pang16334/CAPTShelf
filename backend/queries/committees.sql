-- name: GetAllCommittees :many
SELECT id, name, created_at
FROM committees
ORDER BY name ASC;

-- name: GetCommitteeByID :one
SELECT id, name, created_at
FROM committees
WHERE id = $1;