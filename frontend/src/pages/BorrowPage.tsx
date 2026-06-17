import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getItems, getCommittees, createBorrowRequest } from '../api'
import type { Item, Committee } from '../types'
import { useCartStore } from '../store/cartStore'

export default function BorrowPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // ── Zustand cart store ──────────────────────────────────────────
  // cart      → array of { item, quantity }
  // lockedCommitteeId → locked once first item added, null when empty
  // addItem   → adds item, returns false if committee conflict
  // removeItem, updateQuantity, clearCart → self explanatory
  const {
    cart,
    committeeId: lockedCommitteeId,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCartStore()

  // ── Form state ──────────────────────────────────────────────────
  const [borrowerName, setBorrowerName] = useState('')
  const [selectedCommitteeId, setSelectedCommitteeId] = useState(
    lockedCommitteeId ? String(lockedCommitteeId) : ''
    // initialise from store if cart already has items
  )
  const [searchItem, setSearchItem] = useState('')
  const [expectedReturnAt, setExpectedReturnAt] = useState('')
  const [remarks, setRemarks] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  // ── Fetch data (from cache) ─────────────────────────────────────
  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: getItems,
  })

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: getCommittees,
  })

  // ── Derived values ──────────────────────────────────────────────
  // effectiveCommitteeId:
  //   if cart has items → use locked committee from store
  //   if cart is empty  → use what user selected in dropdown
  const effectiveCommitteeId = lockedCommitteeId
    ? String(lockedCommitteeId)
    : selectedCommitteeId

  // committeeIsLocked: true once cart has at least one item
  const committeeIsLocked = cart.length > 0

  // committeeItems: items belonging to the selected committee
  const committeeItems = useMemo(
    () => items.filter((i: Item) =>
      effectiveCommitteeId
        ? i.committee_id === Number(effectiveCommitteeId)
        : false
    ),
    [items, effectiveCommitteeId]
  )

  // searchResults: items matching search text, not in cart, not out of stock
  const searchResults = useMemo(
    () => committeeItems.filter((i: Item) =>
      i.name.toLowerCase().includes(searchItem.toLowerCase()) &&
      !cart.find(c => c.item.id === i.id) &&
      (i.total_quantity - i.borrowed_quantity) > 0
    ),
    [committeeItems, searchItem, cart]
  )

  // available: how many of an item can still be borrowed
  const available = (item: Item) => item.total_quantity - item.borrowed_quantity

  // ── Cart actions ────────────────────────────────────────────────
  // addToCart: adds item to Zustand store, clears search
  const addToCart = (item: Item) => {
    addItem(item, 1)
    setSearchItem('')
  }

  // removeFromCart: removes item from Zustand store
  const removeFromCart = (itemId: number) => {
    removeItem(itemId)
    // store automatically unlocks committeeId when cart becomes empty
  }

  // updateCartQty: updates quantity in Zustand store
  const updateCartQty = (itemId: number, delta: number) => {
    updateQuantity(itemId, delta)
  }

  // ── Photo handler ───────────────────────────────────────────────
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
      // URL.createObjectURL creates a temporary browser URL for preview
    }
  }

  // ── Submit mutation ─────────────────────────────────────────────
  // useMutation handles the POST request
  // onSuccess: clears cart, invalidates cache, navigates to history
  // onError: shows error message
  const mutation = useMutation({
    mutationFn: createBorrowRequest,
    onSuccess: () => {
      clearCart()  // clear global cart after successful submit
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['borrow-requests'] })
      navigate('/history')
    },
    onError: () => {
      setError('Failed to submit borrow request. Please try again.')
    },
  })

  // ── Form validation + submit ────────────────────────────────────
  const handleSubmit = () => {
    setError('')
    if (!borrowerName.trim()) return setError('Please enter borrower name')
    if (!effectiveCommitteeId) return setError('Please select a committee')
    if (cart.length === 0) return setError('Please add at least one item')
    if (!photoFile) return setError('Please upload a borrow photo')
    if (!expectedReturnAt) return setError('Please select expected return date')

    mutation.mutate({
      borrower_name: borrowerName,
      committee_id: Number(effectiveCommitteeId),
      borrow_photo_url: photoPreview ?? 'placeholder',
      return_photo_url: 'placeholder',  // R2 upload comes later
      expected_return_at: expectedReturnAt,
      remarks: remarks,
      items: cart.map(c => ({
        item_id: c.item.id,
        quantity: c.quantity,
      })),
    })
  }

  // ── JSX ─────────────────────────────────────────────────────────
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
        <h1 className="text-lg font-bold text-on-surface">Borrow Items</h1>
      </header>

      <div className="p-6 space-y-5 pb-32">

        {/* borrower name */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
            Borrower Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Yi Jie"
            value={borrowerName}
            onChange={e => setBorrowerName(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
          />
        </div>

        {/* committee select */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
              Committee *
            </label>
            {committeeIsLocked && (
              <span className="text-xs text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">lock</span>
                Locked
              </span>
            )}
          </div>
          <select
            value={effectiveCommitteeId}
            onChange={e => {
              setSelectedCommitteeId(e.target.value)
              clearCart()   // clear cart when committee manually changed
              setSearchItem('')
            }}
            disabled={committeeIsLocked}
            className={`w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-sm outline-none focus:border-primary ${
              committeeIsLocked ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <option value="">Select committee...</option>
            {committees.map((c: Committee) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* add items — only show once committee is selected */}
        {effectiveCommitteeId && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
              Add Items *
            </label>

            {/* search input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                search
              </span>
              <input
                type="text"
                placeholder="Search items to add..."
                value={searchItem}
                onChange={e => setSearchItem(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
              />
            </div>

            {/* search results dropdown */}
            {searchItem && searchResults.length > 0 && (
              <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                {searchResults.map((item: Item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="w-full px-4 py-3 text-left hover:bg-surface-container-low transition-colors border-b border-outline-variant last:border-0"
                  >
                    <p className="text-sm font-semibold text-on-surface">
                      {item.name}
                      {item.variant?.string && (
                        <span className="font-normal text-on-surface-variant">
                          {' '}· {item.variant.string}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Available: {available(item)}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {searchItem && searchResults.length === 0 && (
              <p className="text-sm text-on-surface-variant px-1">
                No available items found
              </p>
            )}
          </div>
        )}

        {/* cart — items user has selected */}
        {cart.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
              Selected Items
            </label>
            <div className="space-y-2">
              {cart.map(({ item, quantity }) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-white border border-outline-variant rounded-xl px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-on-surface">
                      {item.name}
                      {item.variant?.string && (
                        <span className="font-normal text-on-surface-variant">
                          {' '}· {item.variant.string}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Max: {available(item)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQty(item.id, -1)}
                      className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-bold text-sm"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateCartQty(item.id, 1)}
                      className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="material-symbols-outlined text-error text-xl"
                  >
                    close
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* photo upload */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
            Borrow Photo *
          </label>
          <label className="block cursor-pointer">
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="borrow proof"
                  className="w-full h-48 object-cover rounded-xl border border-outline-variant"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-xl">
                  <p className="text-white text-sm font-semibold">Tap to change</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-40 border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center gap-2 bg-surface-container-low hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant text-4xl">
                  add_a_photo
                </span>
                <p className="text-sm text-on-surface-variant">
                  Tap to upload photo
                </p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              className="hidden"
            />
          </label>
        </div>

        {/* expected return date */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
            Expected Return Date *
          </label>
          <input
            type="date"
            value={expectedReturnAt}
            onChange={e => setExpectedReturnAt(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
          />
        </div>

        {/* remarks */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
            Remarks (optional)
          </label>
          <textarea
            placeholder="Any additional notes..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-sm outline-none focus:border-primary resize-none"
          />
        </div>

        {/* error message */}
        {error && (
          <p className="text-sm text-error font-semibold bg-error-container px-4 py-3 rounded-xl">
            {error}
          </p>
        )}

        {/* submit button */}
        <button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="w-full py-4 bg-primary-container text-on-primary-container font-bold rounded-full text-base active:scale-95 transition-all disabled:opacity-50"
        >
          {mutation.isPending ? 'Submitting...' : 'Submit Borrow Request'}
        </button>

      </div>
    </div>
  )
}