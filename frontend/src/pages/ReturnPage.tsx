import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBorrowRequestsWithItems, returnBorrowRequest, getCommittees } from '../api'
import type { BorrowRequestWithItems, Committee } from '../types'

export default function ReturnPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedRequest, setSelectedRequest] = useState<BorrowRequestWithItems | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  // fetch all active borrow requests
  const { data: borrows = [], isLoading } = useQuery({
    queryKey: ['borrow-requests-with-items'],
    queryFn: () => getBorrowRequestsWithItems(),
  })

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: getCommittees,
  })

  // filter to active only
  const activeBorrows = (borrows ?? []).filter(
    (b: BorrowRequestWithItems) => b.status === 'active'
  )

  // handle photo
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  // return mutation
  const mutation = useMutation({
    mutationFn: (id: number) =>
      returnBorrowRequest(id, {
        return_photo_url: photoPreview ?? 'placeholder',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['borrow-requests-with-items'] })
      setSelectedRequest(null)
      setPhotoFile(null)
      setPhotoPreview(null)
    },
    onError: () => {
      setError('Failed to return. Please try again.')
    },
  })

  const handleReturn = () => {
    setError('')
    if (!selectedRequest) return setError('Please select a borrow request')
    if (!photoFile) return setError('Please upload a return photo')
    mutation.mutate(selectedRequest.id)
  }

  const getCommitteeName = (id: number) =>
    committees.find((c: Committee) => c.id === id)?.name ?? 'Unknown'

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

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
          onClick={() => navigate(-1)}
          className="material-symbols-outlined text-on-surface-variant"
        >
          arrow_back
        </button>
        <h1 className="text-lg font-bold text-on-surface">Return Items</h1>
      </header>

      <div className="p-6 space-y-5 pb-32">

        {/* active borrows list */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
            Select Borrow Request *
          </label>

          {activeBorrows.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant">
                inventory_2
              </span>
              <p className="text-on-surface-variant mt-2 text-sm">
                No active borrows to return
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeBorrows.map((borrow: BorrowRequestWithItems) => (
                <button
                  key={borrow.id}
                  onClick={() => {
                    setSelectedRequest(borrow)
                    setPhotoFile(null)
                    setPhotoPreview(null)
                    setError('')
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedRequest?.id === borrow.id
                      ? 'border-primary bg-primary-container/20'
                      : 'border-outline-variant bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-on-surface text-sm">
                        {borrow.borrower_name}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {getCommitteeName(borrow.committee_id)}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Borrowed: {formatDate(borrow.borrowed_at)}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Return by: {formatDate(borrow.expected_return_at)}
                      </p>
                      {/* items borrowed */}
                      {borrow.items && borrow.items.length > 0 && (
                        <p className="text-xs text-on-surface-variant mt-1">
                          {borrow.items.map((item, i) => (
                            <span key={i}>
                              {item.item_name}
                              {item.variant ? ` (${item.variant})` : ''}
                              {' '}x{item.quantity}
                              {i < borrow.items.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-tertiary-container text-tertiary">
                        active
                      </span>
                      {selectedRequest?.id === borrow.id && (
                        <span className="material-symbols-outlined text-primary text-xl">
                          check_circle
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* return photo — only show when request selected */}
        {selectedRequest && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
                Return Photo *
              </label>
              <label className="block cursor-pointer">
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="return proof"
                      className="w-full h-48 object-cover rounded-xl border border-outline-variant"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-xl">
                      <p className="text-white text-sm font-semibold">
                        Tap to change
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-40 border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center gap-2 bg-surface-container-low hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant text-4xl">
                      add_a_photo
                    </span>
                    <p className="text-sm text-on-surface-variant">
                      Tap to upload return photo
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

            {/* confirm return summary */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-1">
              <p className="text-sm font-semibold text-on-surface">
                Returning person: {selectedRequest.borrower_name}
              </p>
              <p className="text-xs text-on-surface-variant">
                Committee: {getCommitteeName(selectedRequest.committee_id)}
              </p>
              <p className="text-xs text-on-surface-variant">
                Originally borrowed: {formatDate(selectedRequest.borrowed_at)}
              </p>
            </div>

            {/* error */}
            {error && (
              <p className="text-sm text-error font-semibold bg-error-container px-4 py-3 rounded-xl">
                {error}
              </p>
            )}

            {/* confirm button */}
            <button
              onClick={handleReturn}
              disabled={mutation.isPending}
              className="w-full py-4 bg-primary-container text-on-primary-container font-bold rounded-full text-base active:scale-95 transition-all disabled:opacity-50"
            >
              {mutation.isPending ? 'Returning...' : 'Confirm Return'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}