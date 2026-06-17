import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getItems, getCommittees } from '../api'
import type { Item, Committee } from '../types'
import { useCartStore } from '../store/cartStore'
import Toast from '../components/Toast'


export default function CommitteeInventoryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const { addItem } = useCartStore()
  const [toast, setToast] = useState({ show: false, message: '' })

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: getItems,
  })

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: getCommittees,
  })

  const committee: Committee | undefined = committees.find(
    (c: Committee) => c.id === Number(id)
  )

  const committeeItems = useMemo(
    () => items.filter((i: Item) => i.committee_id === Number(id)),
    [items, id]
  )

  const getQty = (itemId: number) => quantities[itemId] ?? 1
  const available = (item: Item) => item.total_quantity - item.borrowed_quantity

  const updateQty = (itemId: number, delta: number, max: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.min(max, Math.max(1, (prev[itemId] ?? 1) + delta))
    }))
  }

  const handleAddToCart = (item: Item, qty: number) => {
    const success = addItem(item, qty)
    if (success) {
        setToast({ show: true, message: `${item.name} added to cart` })
    } else {
        setToast({ 
        show: true, 
        message: 'Cart locked to different committee. Submit first.'
        })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* header */}
      <header className="sticky top-0 bg-surface border-b border-outline-variant z-10 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/inventory?view=committee')}
          className="material-symbols-outlined text-on-surface-variant"
        >
          arrow_back
        </button>
        <div>
          <h1 className="text-lg font-bold text-on-surface">
            {committee?.name ?? 'Committee'}
          </h1>
          <p className="text-xs text-on-surface-variant">
            {committeeItems.length} items
          </p>
        </div>
      </header>

      <div className="p-6 space-y-3">
        {committeeItems.length === 0 ? (
          <p className="text-center text-on-surface-variant py-8">
            No items in this committee
          </p>
        ) : (
          committeeItems.map((item: Item) => (
            <div
              key={item.id}
              className="bg-white border border-outline-variant rounded-xl p-4"
            >
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
                    onClick={(e) => {
                        e.stopPropagation()
                        handleAddToCart(item, getQty(item.id))
                    }}
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
       <Toast
            message={toast.message}
            show={toast.show}
            onHide={() => setToast(t => ({ ...t, show: false }))}
        />
    </div>
  )
}