import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCommittees, getBorrowRequestsWithItems } from '../api'
import type { BorrowRequestWithItems, Committee } from '../types'

export default function HistoryPage() {
  const [selectedCommittee, setSelectedCommittee] = useState('')

  const { data: borrows = [], isLoading } = useQuery({
    queryKey: ['borrow-requests-with-items'],
    queryFn: getBorrowRequestsWithItems,
  })

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: getCommittees,
  })

  // recent activity — last 5
  const recentActivity = useMemo(
    () => [...(borrows ?? [])]
      .sort((a, b) => new Date(b.borrowed_at).getTime() - new Date(a.borrowed_at).getTime())
      .slice(0, 5),
    [borrows]
  )

  // all records filtered by committee
  const filtered = useMemo(
    () => (borrows ?? []).filter((b: BorrowRequestWithItems) =>
      selectedCommittee ? b.committee_id === Number(selectedCommittee) : true
    ),
    [borrows, selectedCommittee]
  )

  const getCommitteeName = (id: number) =>
    committees.find((c: Committee) => c.id === id)?.name ?? 'Unknown'

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const statusStyle = (status: string) => {
    switch (status) {
      case 'active': return 'bg-tertiary-container text-tertiary'
      case 'returned': return 'bg-surface-container text-on-surface-variant'
      case 'cancelled': return 'bg-error-container text-error'
      default: return 'bg-surface-container text-on-surface-variant'
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'inventory_2'
      case 'returned': return 'assignment_return'
      case 'cancelled': return 'cancel'
      default: return 'inventory_2'
    }
  }

  const renderItems = (items: BorrowRequestWithItems['items']) => {
    if (!items || items.length === 0) return null
    return items.map((item, i) => (
      <span key={i}>
        {item.item_name}
        {item.variant ? ` (${item.variant})` : ''}
        {' '}x{item.quantity}
        {i < items.length - 1 ? ', ' : ''}
      </span>
    ))
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
      <header className="sticky top-0 bg-surface border-b border-outline-variant z-10 px-6 py-4">
        <h1 className="text-xl font-bold text-primary">History</h1>
      </header>

      <div className="p-6 space-y-6">

        {/* recent activity */}
        {recentActivity.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-bold text-on-surface">Recent Activity</h2>
            <div className="space-y-2">
              {recentActivity.map((borrow: BorrowRequestWithItems) => (
                <div
                  key={borrow.id}
                  className="flex items-start gap-3 bg-white border border-outline-variant rounded-xl px-4 py-3"
                >
                  {/* status icon */}
                  <span className={`material-symbols-outlined text-xl mt-0.5 ${
                    borrow.status === 'active' ? 'text-tertiary' :
                    borrow.status === 'returned' ? 'text-on-surface-variant' :
                    'text-error'
                  }`}>
                    {statusIcon(borrow.status)}
                  </span>

                  <div className="flex-1">
                    {/* committee + borrower */}
                    <p className="text-sm font-semibold text-on-surface">
                      {getCommitteeName(borrow.committee_id)}
                      <span className="font-normal text-on-surface-variant">
                        {' · '}{borrow.borrower_name}
                      </span>
                    </p>
                    {/* items */}
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {renderItems(borrow.items)}
                    </p>
                    {/* date */}
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {formatDate(borrow.borrowed_at)}
                    </p>
                  </div>

                  <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${statusStyle(borrow.status)}`}>
                    {borrow.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* all records */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-on-surface">All Records</h2>
            <select
              value={selectedCommittee}
              onChange={e => setSelectedCommittee(e.target.value)}
              className="py-1.5 px-3 bg-surface-container-low border border-outline-variant rounded-full text-xs outline-none focus:border-primary"
            >
              <option value="">All Committees</option>
              {committees.map((c: Committee) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant">
                history
              </span>
              <p className="text-on-surface-variant mt-2 text-sm">
                No borrow records yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((borrow: BorrowRequestWithItems) => (
                <div
                  key={borrow.id}
                  className="bg-white border border-outline-variant rounded-xl p-4 space-y-3"
                >
                  {/* top row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-on-surface text-sm">
                        {getCommitteeName(borrow.committee_id)}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {borrow.borrower_name}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {formatDate(borrow.borrowed_at)}
                        {' · '}
                        Return by: {formatDate(borrow.expected_return_at)}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${statusStyle(borrow.status)}`}>
                      {borrow.status}
                    </span>
                  </div>

                  {/* items */}
                  {borrow.items && borrow.items.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {borrow.items.map((item, i) => (
                        <span
                          key={i}
                          className="text-xs bg-surface-container px-2 py-1 rounded-full text-on-surface-variant"
                        >
                          {item.item_name}
                          {item.variant ? ` · ${item.variant}` : ''}
                          {' '}x{item.quantity}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* remarks */}
                  {borrow.remarks?.string && (
                    <p className="text-xs text-on-surface-variant italic">
                      "{borrow.remarks.string}"
                    </p>
                  )}

                  {/* photos */}
                  {borrow.borrow_photo_url && borrow.borrow_photo_url !== 'placeholder' && (
                    <div className="flex gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-on-surface-variant">Borrow</p>
                        <img
                          src={borrow.borrow_photo_url}
                          alt="borrow proof"
                          className="w-16 h-16 object-cover rounded-lg border border-outline-variant"
                        />
                      </div>
                      {borrow.return_photo_url && (
                        <div className="space-y-1">
                          <p className="text-xs text-on-surface-variant">Return</p>
                          <img
                            src={borrow.return_photo_url}
                            alt="return proof"
                            className="w-16 h-16 object-cover rounded-lg border border-outline-variant"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}