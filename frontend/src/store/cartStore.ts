import { create } from 'zustand'
import type { Item } from '../types'

export interface CartItem {
  item: Item
  quantity: number
}

interface CartStore {
  cart: CartItem[]
  committeeId: number | null  // locked once first item added

  addItem: (item: Item, quantity: number) => boolean  // returns false if committee conflict
  removeItem: (itemId: number) => void
  updateQuantity: (itemId: number, delta: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartStore>((set, get) => ({
  cart: [],
  committeeId: null,

  addItem: (item, quantity) => {
    const { cart, committeeId } = get()

    // committee conflict check
    if (committeeId !== null && item.committee_id !== committeeId) {
      return false  // conflict, caller handles the warning
    }

    // check if item already in cart
    const existing = cart.find(c => c.item.id === item.id)
    if (existing) {
      set({
        cart: cart.map(c =>
          c.item.id === item.id
            ? { ...c, quantity: c.quantity + quantity }
            : c
        )
      })
    } else {
      set({
        cart: [...cart, { item, quantity }],
        committeeId: committeeId ?? item.committee_id,  // lock on first item
      })
    }
    return true  // success
  },

  removeItem: (itemId) => {
    const { cart } = get()
    const updated = cart.filter(c => c.item.id !== itemId)
    set({
      cart: updated,
      committeeId: updated.length === 0 ? null : get().committeeId,  // unlock if empty
    })
  },

  updateQuantity: (itemId, delta) => {
    set(state => ({
      cart: state.cart.map(c => {
        if (c.item.id !== itemId) return c
        const available = c.item.total_quantity - c.item.borrowed_quantity
        return {
          ...c,
          quantity: Math.min(available, Math.max(1, c.quantity + delta))
        }
      })
    }))
  },

  clearCart: () => set({ cart: [], committeeId: null }),
}))