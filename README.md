# CAPTShelf 📦

> A Telegram Mini App for inventory and resource management within CAPT (College of Alice & Peter Tan), NUS.

CAPTShelf replaces manual spreadsheet tracking with a fast, transparent system for borrowing and returning shared items across CAPT committees.

**Target:** Borrowing a set of items takes under 15 seconds.

---

## Features

- 📋 Browse all inventory across committees
- 📦 Borrow items with photo evidence
- ✅ Return items with photo evidence
- 🛒 Cart-based borrowing — add multiple items before submitting
- 🕓 Full borrow history visible to everyone
- 🔐 Role-based access (User, Committee Admin, Super Admin)
- 📥 Bulk inventory import via Excel
- 📱 Works in Telegram and browser

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go (chi, pgx, sqlc) |
| Database | PostgreSQL |
| File Storage | Cloudflare R2 |
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS v3 + Honey & Ink design system |
| State | Zustand (cart) + TanStack Query (server data) |
| Auth | Telegram Mini App initData (HMAC validation) |

---

## Monorepo Structure

```
CAPTShelf/
├── backend/        Go REST API
├── frontend/       React + Vite frontend
├── .env            Environment variables (never commit this)
├── .gitignore
└── README.md
```

Each service has its own README with setup instructions:
- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

---

## Quick Start

### Prerequisites
- Go 1.21+
- Node.js 18+
- PostgreSQL running locally

### 1. Clone the repo
```bash
git clone https://github.com/pang16334/CAPTShelf.git
cd CAPTShelf
```

### 2. Set up environment variables
```bash
cp .env.example .env
# fill in your local PostgreSQL credentials
```

### 3. Start backend
```bash
cd backend
go mod download
go run cmd/api/main.go
# API running on http://localhost:8080
```

### 4. Start frontend
```bash
cd frontend
npm install
npm run dev
# App running on http://localhost:5173
```

Open `http://localhost:5173` — you'll see CAPTShelf running in browser mode.

> **DEV_MODE=true** is set by default — skips Telegram auth and injects a fake super admin so you can test everything in the browser without needing Telegram.

---

## Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL=postgres://User:@localhost:5432/captshelf?sslmode=disable
BOT_TOKEN=your_telegram_bot_token
DEV_MODE=true
DEV_TELEGRAM_ID=12345
PORT=8080
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `DEV_MODE` | Set `true` for browser testing, `false` for production |
| `DEV_TELEGRAM_ID` | Fake Telegram user ID used in dev mode |
| `PORT` | Backend port (default 8080) |

---

## Contributing

See [PROGRESS.md](./PROGRESS.md) for what's done and what needs help.

### Branch strategy
```
main    → stable, always working
dev     → active development (create PRs against this)
```

### Commit message format
```
feat:     new feature
fix:      bug fix
chore:    config, deps, tooling
refactor: code change, no behaviour change
docs:     documentation only
```

Examples:
```
feat: add return page with photo upload
fix: committee locking not resetting on cart clear
chore: update dependencies
```

### Before submitting a PR
- [ ] Backend compiles with `go build ./...`
- [ ] Frontend compiles with `npm run build`
- [ ] No TypeScript errors
- [ ] Tested in browser (DEV_MODE=true)

---

## Team

Built by Yi Jie ([@pang16334](https://github.com/pang16334)) for CAPT SAC Tech Committee · NUS AY25/26

---

## License

Internal use only — CAPT, NUS.
