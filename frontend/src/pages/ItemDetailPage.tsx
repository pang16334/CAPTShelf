import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { getItems, getCommittees, getItemBorrowHistory } from '../api'
import type { Item, Committee, ItemBorrowHistoryRow } from '../types'

export default function ItemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)

  // all from cache — no extra network requests
  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: getItems,
  })

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: getCommittees,
  })

  // accurate history for this specific item
  const { data: itemHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['item-borrows', id],
    queryFn: () => getItemBorrowHistory(Number(id)),
  })

  // find item from cache
  const item: Item | undefined = useMemo(
    () => items.find((i: Item) => i.id === Number(id)),
    [items, id]
  )

  const committee: Committee | undefined = useMemo(
    () => committees.find((c: Committee) => c.id === item?.committee_id),
    [committees, item]
  )

  const available = item ? item.total_quantity - item.borrowed_quantity : 0

  if (!item) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-on-surface-variant">Item not found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* header */}
      <header className="sticky top-0 bg-surface border-b border-outline-variant z-10 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="material-symbols-outlined text-on-surface-variant"
        >
          arrow_back
        </button>
        <h1 className="text-lg font-bold text-on-surface">{item.name}</h1>
      </header>

      <div className="p-6 space-y-6">
        {/* item info card */}
        <div className="bg-white border border-outline-variant rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-on-surface">
                {item.name}
                {item.variant?.string && (
                  <span className="text-on-surface-variant font-normal">
                    {' '}· {item.variant.string}
                  </span>
                )}
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                {item.category} · {committee?.name}
              </p>
              {item.description?.string && (
                <p className="text-sm text-on-surface mt-2">
                  {item.description.string}
                </p>
              )}
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${
              available === 0
                ? 'bg-error-container text-error'
                : 'bg-surface-container text-on-surface-variant'
            }`}>
              {available}/{item.total_quantity}
            </span>
          </div>

          {/* availability bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>Available</span>
              <span>{available} of {item.total_quantity}</span>
            </div>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-container rounded-full transition-all"
                style={{ width: `${(available / item.total_quantity) * 100}%` }}
              />
            </div>
          </div>

          {/* quantity nudger + borrow button */}
          {available > 0 ? (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center font-bold text-on-surface"
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(q => Math.min(available, q + 1))}
                  className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center font-bold text-on-surface"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => navigate(
                  `/action/borrow?itemId=${item.id}&qty=${quantity}&available=${available}`
                )}
                className="bg-primary-container text-on-primary-container font-semibold px-6 py-2.5 rounded-full active:scale-95 transition-all"
              >
                Borrow This Item
              </button>
            </div>
          ) : (
            <p className="text-sm text-error font-semibold">Out of stock</p>
          )}
        </div>

        {/* borrow history */}
        <div className="space-y-3">
          <h3 className="font-bold text-on-surface">Borrow History</h3>

          {historyLoading ? (
            <p className="text-sm text-on-surface-variant text-center py-6">
              Loading history...
            </p>
          ) : itemHistory.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-6">
              No borrow history yet
            </p>
          ) : (
            itemHistory.map((borrow: ItemBorrowHistoryRow) => (
              <div
                key={borrow.id}
                className="bg-white border border-outline-variant rounded-xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-on-surface text-sm">
                      {borrow.borrower_name}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {new Date(borrow.borrowed_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                      {' · '}qty: {borrow.quantity}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Return by: {new Date(borrow.expected_return_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    borrow.status === 'active'
                      ? 'bg-tertiary-container text-tertiary'
                      : borrow.status === 'returned'
                      ? 'bg-surface-container text-on-surface-variant'
                      : 'bg-error-container text-error'
                  }`}>
                    {borrow.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}