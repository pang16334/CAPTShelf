# CAPTShelf — Frontend

React + Vite + TypeScript frontend for CAPTShelf. Runs in browser for development and as a Telegram Mini App in production.


## Tech Stack

| Tool | Purpose |
|---|---|
| React + Vite | UI framework + build tool |
| TypeScript | Type safety |
| Tailwind CSS v3 | Styling |
| TanStack Query | Server state (fetching, caching) |
| Zustand | Client state (cart) |
| Axios | HTTP requests |
| React Router v6 | Page routing |

## Folder Structure

```
frontend/
├── public/
│   └── favicon.png              ← app icon
│
├── src/
│   ├── api/
│   │   └── index.ts             ← all API functions (axios calls to backend)
│   │
│   ├── components/
│   │   ├── Layout.tsx           ← tab bar + page wrapper (shared across all pages)
│   │   └── Toast.tsx            ← toast notification component
│   │
│   ├── pages/
│   │   ├── InventoryPage.tsx        ← all items + by committee toggle + filters
│   │   ├── CommitteeInventoryPage.tsx ← scoped item list for one committee
│   │   ├── ItemDetailPage.tsx       ← item info + availability + borrow history
│   │   ├── HistoryPage.tsx          ← recent activity + full borrow records
│   │   ├── ActionPage.tsx           ← borrow + return buttons + cart badge
│   │   ├── BorrowPage.tsx           ← borrow form (cart flow)
│   │   ├── ReturnPage.tsx           ← return flow
│   │   └── AdminPage.tsx            ← admin panel (role-gated)
│   │
│   ├── store/
│   │   └── cartStore.ts         ← Zustand cart store (global cart state)
│   │
│   ├── types.ts                 ← TypeScript interfaces for API responses
│   ├── App.tsx                  ← routing setup
│   ├── main.tsx                 ← entry point
│   └── index.css                ← Tailwind directives + global styles
│
├── index.html
├── tailwind.config.js           ← Honey & Ink colour tokens
├── vite.config.ts
└── package.json
```

## Setup

### 1. Prerequisites
- Node.js 18+
- Backend running on `http://localhost:8080`

### 2. Install dependencies
```bash
npm install
```

### 3. Run dev server
```bash
npm run dev
# App running on http://localhost:5173
```

### 4. Build for production
```bash
npm run build
```

## Key Concepts

### API Layer (`src/api/index.ts`)
All backend calls live here. Components never call axios directly.

```typescript
// ✅ correct — use the API function
import { getItems } from '../api'
const { data } = useQuery({ queryKey: ['items'], queryFn: getItems })

// ❌ wrong — don't call axios directly in components
axios.get('http://localhost:8080/items')
```

### Server State — TanStack Query
Data from the backend is managed by React Query. It handles caching, loading states, and refetching.

```typescript
// reading data
const { data: items = [], isLoading } = useQuery({
  queryKey: ['items'],   // cache key
  queryFn: getItems,     // function that fetches
})

// writing data
const mutation = useMutation({
  mutationFn: createBorrowRequest,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['items'] }) // refresh cache
    navigate('/history')
  }
})
mutation.mutate(formData)
```

### Client State — Zustand (Cart)
The cart persists across pages using Zustand. Components read from and write to the store.

```typescript
import { useCartStore } from '../store/cartStore'

const { cart, addItem, removeItem, clearCart } = useCartStore()

// add item to cart
addItem(item, quantity)  // returns false if committee conflict

// cart badge count
const count = cart.reduce((sum, c) => sum + c.quantity, 0)
```

### TypeScript Types (`src/types.ts`)
All API response shapes are typed. Always use these instead of `any`.

```typescript
import type { Item, Committee, BorrowRequest, User } from '../types'
```

### Design System
Colours are defined in `tailwind.config.js` as custom tokens. Use them as Tailwind classes:

```tsx
<div className="bg-primary-container text-on-primary-container rounded-full">
  Button
</div>
```

Key colour tokens:
```
bg-primary              dark honey (text, icons)
bg-primary-container    yellow (buttons, highlights)
bg-surface              creamy white (page background)
bg-surface-container    slightly darker (cards)
text-on-surface         dark brown (primary text)
text-on-surface-variant muted brown (secondary text)
bg-error-container      light red (error states)
text-error              red (error text)
```

## Adding a New Page

1. Create `src/pages/YourPage.tsx`
2. Add route in `src/App.tsx`
3. Add tab to `src/components/Layout.tsx` if it's a top-level tab

```tsx
// src/App.tsx
import YourPage from './pages/YourPage'

<Route path="your-path" element={<YourPage />} />
```

## Cart Flow

```
User taps + Borrow on inventory
        ↓
addItem() called on Zustand store
        ↓
toast shown: "Item added to cart"
user stays on current page
        ↓
User goes to Action tab
sees cart badge count
        ↓
taps Borrow Items
        ↓
BorrowPage reads cart from Zustand store
user fills in name + photo + date
        ↓
Submit → clearCart() + invalidate cache + navigate to history
```

**Committee locking:** once the first item is added to the cart, the committee is locked. Items from other committees cannot be added — a warning is shown instead.

## Telegram Integration (Production Only)

In production, the app runs as a Telegram Mini App. The frontend sends the Telegram `initData` with every request:

```typescript
// src/api/index.ts
client.interceptors.request.use((config) => {
  if (window.Telegram?.WebApp?.initData) {
    config.headers['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData
  }
  return config
})
```

For local development, `DEV_MODE=true` on the backend skips this check entirely.

## Environment

The frontend uses `http://localhost:8080` as the backend URL in development. To change this, update `src/api/index.ts`:

```typescript
const client = axios.create({
  baseURL: 'http://localhost:8080',  // change for production
})
```

For production, use an environment variable:
```typescript
baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
```

And set in `.env`:
```
VITE_API_URL=https://your-backend-url.com
```

## Common Patterns

### Page with data fetching
```tsx
export default function SomePage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: getItems,
  })

  if (isLoading) return <p className="text-on-surface-variant">Loading...</p>

  return (
    <div>
      {items.map(item => <div key={item.id}>{item.name}</div>)}
    </div>
  )
}
```

### Page header with back button
```tsx
<header className="sticky top-0 bg-surface border-b border-outline-variant z-10 px-6 py-4 flex items-center gap-3">
  <button onClick={() => navigate(-1)} className="material-symbols-outlined text-on-surface-variant">
    arrow_back
  </button>
  <h1 className="text-lg font-bold text-on-surface">Page Title</h1>
</header>
```

### Item availability badge
```tsx
<span className={`text-xs font-semibold px-2 py-1 rounded-full ${
  available === 0
    ? 'bg-error-container text-error'
    : 'bg-surface-container text-on-surface-variant'
}`}>
  {available}/{total}
</span>
```
