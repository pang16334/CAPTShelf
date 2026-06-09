import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getItems, getCommittees } from '../api'
import type { Item, Committee } from '../types'

export default function InventoryPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<'all' | 'committee'>('all')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCommittee, setSelectedCommittee] = useState('')
  const [quantities, setQuantities] = useState<Record<number, number>>({})

  // fetch all once, cached by React Query
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['items'],
    queryFn: getItems,
  })

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: getCommittees,
  })

  // unique categories derived from items
  const categories = useMemo(
    () => [...new Set(items.map((item: Item) => item.category))] as string[],
    [items]
  )

  // filter client-side — search + category + committee
  const filtered = useMemo(
    () => items.filter((item: Item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true
      const matchesCommittee = selectedCommittee ? item.committee_id === Number(selectedCommittee) : true
      return matchesSearch && matchesCategory && matchesCommittee
    }),
    [items, search, selectedCategory, selectedCommittee]
  )

  const getQty = (id: number) => quantities[id] ?? 1
  const available = (item: Item) => item.total_quantity - item.borrowed_quantity

  const updateQty = (id: number, delta: number, max: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.min(max, Math.max(1, (prev[id] ?? 1) + delta))
    }))
  }

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* header */}
      <header className="sticky top-0 bg-surface border-b border-outline-variant z-10 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">CAPTShelf</h1>
        <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">
          notifications
        </span>
      </header>

      <div className="p-6 space-y-4">
        {/* toggle */}
        <div className="flex p-1 bg-surface-container rounded-full">
          <button
            onClick={() => setView('all')}
            className={`flex-1 py-2 rounded-full font-semibold text-sm transition-all ${
              view === 'all'
                ? 'bg-white shadow text-primary'
                : 'text-on-surface-variant'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setView('committee')}
            className={`flex-1 py-2 rounded-full font-semibold text-sm transition-all ${
              view === 'committee'
                ? 'bg-white shadow text-primary'
                : 'text-on-surface-variant'
            }`}
          >
            By Committee
          </button>
        </div>

        {view === 'all' ? (
          <>
            {/* search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                search
              </span>
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-full text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
              />
            </div>

            {/* filters */}
            <div className="flex gap-3">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="flex-1 py-2 px-4 bg-surface-container-low border border-outline-variant rounded-full text-sm outline-none focus:border-primary"
              >
                <option value="">All Categories</option>
                {categories.map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={selectedCommittee}
                onChange={e => setSelectedCommittee(e.target.value)}
                className="flex-1 py-2 px-4 bg-surface-container-low border border-outline-variant rounded-full text-sm outline-none focus:border-primary"
              >
                <option value="">All Committees</option>
                {committees.map((c: Committee) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* items list */}
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <p className="text-center text-on-surface-variant py-8">
                  No items found
                </p>
              ) : (
                filtered.map((item: Item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-outline-variant rounded-xl p-4"
                  >
                    {/* tap to go to detail */}
                    <div
                      className="cursor-pointer"
                      onClick={() => navigate(`/items/${item.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-on-surface">
                            {item.name}
                            {item.variant?.string && (
                              <span className="text-on-surface-variant font-normal">
                                {' '}· {item.variant.string}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {item.category}
                            {' · '}
                            {committees.find((c: Committee) => c.id === item.committee_id)?.name}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          available(item) === 0
                            ? 'bg-error-container text-error'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {available(item)}/{item.total_quantity}
                        </span>
                      </div>
                    </div>

                    {/* quantity nudger + borrow button */}
                    {available(item) > 0 ? (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item.id, -1, available(item))}
                            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface font-bold"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-semibold text-sm">
                            {getQty(item.id)}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1, available(item))}
                            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface font-bold"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => navigate(
                            `/action/borrow?itemId=${item.id}&qty=${getQty(item.id)}&available=${available(item)}`
                          )}
                          className="bg-primary-container text-on-primary-container text-sm font-semibold px-4 py-2 rounded-full active:scale-95 transition-all"
                        >
                          + Borrow
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-error mt-2 font-semibold">
                        Out of stock
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* by committee view */
          <div className="grid grid-cols-2 gap-3">
            {committees.map((c: Committee) => (
              <div
                key={c.id}
                onClick={() => navigate(`/inventory/committees/${c.id}`)}
                className="bg-white border border-outline-variant rounded-xl p-4 cursor-pointer active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-primary text-3xl">
                  groups
                </span>
                <p className="font-semibold text-on-surface mt-2">{c.name}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {items.filter((i: Item) => i.committee_id === c.id).length} items
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}