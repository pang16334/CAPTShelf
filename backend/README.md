# CAPTShelf — Backend

Go REST API for CAPTShelf. Handles inventory, borrowing, auth, and file storage.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Go (chi) | HTTP router |
| pgx/v5 | PostgreSQL driver |
| sqlc | Type-safe SQL query generation |
| godotenv | Load `.env` file |
| Cloudflare R2 | Photo storage (S3-compatible) |

---

## Folder Structure

```
backend/
├── cmd/
│   └── api/
│       └── main.go              ← entry point, wires everything together
│
├── internal/
│   ├── borrowrequests/
│   │   └── handler.go           ← borrow + return + cancel endpoints
│   ├── committees/
│   │   └── handler.go           ← GET /committees
│   ├── database/
│   │   └── db.go                ← PostgreSQL connection pool
│   ├── db/                      ← sqlc generated code (DO NOT EDIT)
│   │   ├── db.go
│   │   ├── models.go
│   │   ├── items.sql.go
│   │   ├── borrow_requests.sql.go
│   │   ├── committees.sql.go
│   │   └── users.sql.go
│   ├── helpers/
│   │   └── null.go              ← pgtype conversion helpers (NullInt4, NullText, ParseDate)
│   ├── items/
│   │   └── handler.go           ← item CRUD + borrow history
│   ├── middleware/
│   │   └── auth.go              ← Telegram initData validation + user context
│   └── users/
│       └── handler.go           ← user management endpoints
│
├── migrations/                  ← SQL schema files (run in order)
│   ├── 001_create_committees.sql
│   ├── 002_create_users.sql
│   ├── 003_create_items.sql
│   ├── 004_create_borrow_requests.sql
│   ├── 005_create_borrow_request_items.sql
│   └── 006_add_items_unique_constraint.sql
│
├── queries/                     ← SQL query files for sqlc
│   ├── committees.sql
│   ├── users.sql
│   ├── items.sql
│   └── borrow_requests.sql
│
├── .env                         ← environment variables (never commit)
├── go.mod
├── go.sum
└── sqlc.yaml                    ← sqlc configuration
```

---

## Setup

### 1. Prerequisites
- Go 1.21+
- PostgreSQL running locally
- sqlc installed: `brew install sqlc`

### 2. Install dependencies
```bash
go mod download
```

### 3. Create database
```bash
psql -U your_username -d postgres -c "CREATE DATABASE captshelf;"
```

### 4. Run migrations
```bash
psql -U your_username -d captshelf -f migrations/001_create_committees.sql
psql -U your_username -d captshelf -f migrations/002_create_users.sql
psql -U your_username -d captshelf -f migrations/003_create_items.sql
psql -U your_username -d captshelf -f migrations/004_create_borrow_requests.sql
psql -U your_username -d captshelf -f migrations/005_create_borrow_request_items.sql
psql -U your_username -d captshelf -f migrations/006_add_items_unique_constraint.sql
```

### 5. Set up environment variables
```bash
cp .env.example .env
```

Fill in `.env`:
```env
DATABASE_URL=postgres://your_username:@localhost:5432/captshelf?sslmode=disable
BOT_TOKEN=your_telegram_bot_token
DEV_MODE=true
DEV_TELEGRAM_ID=12345
PORT=8080
```

### 6. Run the server
```bash
go run cmd/api/main.go
# API running on http://localhost:8080
```

---

## API Endpoints

### Public (auth required)
```
GET    /me                           current user profile
GET    /committees                   list all committees
GET    /items                        list all items
GET    /items/:id                    get item detail
GET    /items/:id/borrows            borrow history for item
GET    /borrow-requests              list all borrow requests
GET    /borrow-requests/:id          get borrow request detail
POST   /borrow-requests              create borrow request
POST   /borrow-requests/:id/return   return items
POST   /borrow-requests/:id/cancel   cancel borrow request
```

### Admin only (Committee Admin + Super Admin)
```
POST   /items                        create item
PUT    /items/:id                    update item
DELETE /items/:id                    delete item
POST   /admin/items/import           bulk import from Excel
GET    /admin/users                  list all users
PUT    /admin/users/:id/role         update user role + committee
```

---

## Auth

All endpoints require a valid `X-Telegram-Init-Data` header containing the Telegram Mini App `initData` string. The middleware validates the HMAC signature using your `BOT_TOKEN`.

**In dev mode** (`DEV_MODE=true`), auth validation is skipped and a fake super admin user is injected. Use this for browser testing.

```
Header: X-Telegram-Init-Data: <initData string from Telegram>
```

---

## Regenerating sqlc

If you modify any SQL files in `queries/`, regenerate the Go code:

```bash
sqlc generate
```

> Never manually edit files in `internal/db/` — they are auto-generated.

---

## Adding a New Endpoint

1. Add SQL query to the relevant file in `queries/`
2. Run `sqlc generate`
3. Add handler method in the relevant `internal/<package>/handler.go`
4. Register route in `cmd/api/main.go`

Example — adding `GET /items/:id/history`:
```go
// 1. queries/items.sql — add SQL query
-- name: GetItemHistory :many
SELECT ...

// 2. sqlc generate

// 3. internal/items/handler.go — add handler
func (h *Handler) GetHistory(w http.ResponseWriter, r *http.Request) { ... }

// 4. cmd/api/main.go — add route
r.Get("/items/{id}/history", itemHandler.GetHistory)
```

---

## User Roles

| Role | Value |
|---|---|
| Regular user | `user` |
| Committee admin | `committee_admin` |
| Super admin | `super_admin` |

Set your own account to super admin directly in the database (first time only):
```sql
UPDATE users SET role = 'super_admin' WHERE telegram_id = your_telegram_id;
```

After that, manage roles through the Admin panel in the app.