import { useEffect } from 'react'

interface ToastProps {
  message: string
  show: boolean
  onHide: () => void
}

export default function Toast({ message, show, onHide }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onHide, 2000)  // auto hide after 2 seconds
      return () => clearTimeout(timer)
    }
  }, [show, onHide])

  if (!show) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-on-surface text-surface px-5 py-3 rounded-full text-sm font-semibold shadow-lg whitespace-nowrap flex items-center gap-2">
        <span className="material-symbols-outlined text-base">check_circle</span>
        {message}
      </div>
    </div>
  )
}