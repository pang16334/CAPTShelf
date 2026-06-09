import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import InventoryPage from './pages/InventoryPage'
import HistoryPage from './pages/HistoryPage'
import ActionPage from './pages/ActionPage'
import AdminPage from './pages/AdminPage'
import ItemDetailPage from './pages/ItemDetailPage'
import BorrowPage from './pages/BorrowPage'
import ReturnPage from './pages/ReturnPage'
import Layout from './components/Layout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // data stays fresh for 5 minutes
      gcTime: 1000 * 60 * 10,    // cache kept for 10 minutes
      retry: 1,                   // retry once on failure
    }
  }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/inventory" replace />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="items/:id" element={<ItemDetailPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="action" element={<ActionPage />} />
            <Route path="action/borrow" element={<BorrowPage />} />
            <Route path="action/return" element={<ReturnPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}