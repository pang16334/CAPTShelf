import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'

export default function ActionPage() {
  const navigate = useNavigate()
  const { cart } = useCartStore()
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 bg-surface border-b border-outline-variant z-10 px-6 py-4">
        <h1 className="text-xl font-bold text-primary">Action</h1>
      </header>

      <div className="p-6 space-y-4">
        <button
          onClick={() => navigate('/action/borrow')}
          className="w-full py-6 bg-primary-container text-on-primary-container rounded-2xl font-bold text-lg flex flex-col items-center gap-2 active:scale-95 transition-all relative"
        >
          <span className="material-symbols-outlined text-4xl">inventory_2</span>
          Borrow Items
          {cartCount > 0 && (
            <span className="absolute top-3 right-3 bg-error text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate('/action/return')}
          className="w-full py-6 bg-surface-container text-on-surface rounded-2xl font-bold text-lg flex flex-col items-center gap-2 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-4xl">assignment_return</span>
          Return Items
        </button>
      </div>
    </div>
  )
}