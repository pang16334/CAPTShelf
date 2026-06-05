import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/inventory', label: 'Inventory', icon: 'inventory_2' },
  { path: '/history', label: 'History', icon: 'history' },
  { path: '/action', label: 'Action', icon: 'add_circle' },
  { path: '/admin', label: 'Admin', icon: 'settings' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-xl mx-auto">
      {/* page content */}
      <main className="flex-1 pb-24 overflow-y-auto">
        <Outlet />
      </main>

      {/* bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant z-50">
        <div className="max-w-xl mx-auto flex items-center justify-around px-2 py-2">
          {tabs.map(tab => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive(tab.path)
                  ? 'text-primary'
                  : 'text-on-surface-variant'
              }`}
            >
              {/* icon with filled state when active */}
              <span
                className="material-symbols-outlined text-2xl"
                style={{
                  fontVariationSettings: isActive(tab.path)
                    ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                    : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                }}
              >
                {tab.icon}
              </span>
              <span className="text-xs font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}