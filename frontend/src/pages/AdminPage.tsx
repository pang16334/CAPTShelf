import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { getItems, getCommittees, getUsers, updateUserRole, createItem, updateItem, deleteItem, importItems } from '../api'
import type { Item, Committee, User } from '../types'

type AdminTab = 'items' | 'users'

interface ItemForm {
  name: string
  category: string
  variant: string
  committee_id: string
  total_quantity: string
  description: string
}

const emptyForm: ItemForm = {
  name: '',
  category: '',
  variant: '',
  committee_id: '',
  total_quantity: '',
  description: '',
}

export default function AdminPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<AdminTab>('items')
  const [selectedCommittee, setSelectedCommittee] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number, skipped: number, errors: string[] } | null>(null)

  // item form state
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [form, setForm] = useState<ItemForm>(emptyForm)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Item | null>(null)

  // fetch data
  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: getItems,
  })

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: getCommittees,
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const filteredItems = useMemo(
    () => items.filter((i: Item) =>
      selectedCommittee ? i.committee_id === Number(selectedCommittee) : true
    ),
    [items, selectedCommittee]
  )

  const getCommitteeName = (id: number) =>
    committees.find((c: Committee) => c.id === id)?.name ?? 'Unknown'

  const available = (item: Item) => item.total_quantity - item.borrowed_quantity

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setTimeout(() => setError(''), 3000)
    } else {
      setSuccess(msg)
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  // create item mutation
  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setShowForm(false)
      setForm(emptyForm)
      showFeedback('Item created successfully')
    },
    onError: () => showFeedback('Failed to create item', true)
  })

  // update item mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['items'] })
      setShowForm(false)
      setEditingItem(null)
      setForm(emptyForm)
      showFeedback('Item updated successfully')
    },
    onError: () => showFeedback('Failed to update item', true)
  })

  // delete item mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setShowDeleteConfirm(null)
      showFeedback('Item deleted successfully')
    },
    onError: () => showFeedback('Failed to delete item', true)
  })

  // update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role, committeeId }: { id: number, role: string, committeeId: number | null }) =>
      updateUserRole(id, { role, committee_id: committeeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      showFeedback('User role updated')
    },
    onError: () => showFeedback('Failed to update user role', true)
  })

  const handleOpenAdd = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      category: item.category,
      variant: item.variant ?? '',
      committee_id: String(item.committee_id),
      total_quantity: String(item.total_quantity),
      description: item.description ?? '',
    })
    setShowForm(true)
  }

  const handleSubmitForm = () => {
    if (!form.name.trim()) return showFeedback('Name is required', true)
    if (!form.category.trim()) return showFeedback('Category is required', true)
    if (!form.committee_id) return showFeedback('Committee is required', true)
    if (!form.total_quantity) return showFeedback('Quantity is required', true)

    const data = {
      name: form.name,
      category: form.category,
      variant: form.variant || null,
      committee_id: Number(form.committee_id),
      total_quantity: Number(form.total_quantity),
      description: form.description || null,
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImporting(true)
    setImportResult(null)
    try {
        const result = await importItems(file)
        setImportResult(result)
        queryClient.invalidateQueries({ queryKey: ['items'] })
        showFeedback(`Imported ${result.imported} items successfully`)
    } catch (err) {
        const message = isAxiosError(err) && typeof err.response?.data === 'string'
            ? err.response.data
            : 'Failed to import file'
        showFeedback(message, true)
    } finally {
        setImporting(false)
        e.target.value = '' // reset file input
    }
  }

  return (
    <div className="flex flex-col">
      {/* header */}
      <header className="sticky top-0 bg-surface border-b border-outline-variant z-10 px-6 py-4">
        <h1 className="text-xl font-bold text-primary">Admin</h1>
      </header>

      <div className="p-6 space-y-4">

        {/* tabs */}
        <div className="flex p-1 bg-surface-container rounded-full">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 py-2 rounded-full font-semibold text-sm transition-all ${
              activeTab === 'items'
                ? 'bg-white shadow text-primary'
                : 'text-on-surface-variant'
            }`}
          >
            Items
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 rounded-full font-semibold text-sm transition-all ${
              activeTab === 'users'
                ? 'bg-white shadow text-primary'
                : 'text-on-surface-variant'
            }`}
          >
            Users
          </button>
        </div>

        {/* feedback */}
        {success && (
          <p className="text-sm font-semibold bg-surface-container px-4 py-3 rounded-xl">
            ✅ {success}
          </p>
        )}
        {error && (
          <p className="text-sm text-error font-semibold bg-error-container px-4 py-3 rounded-xl">
            {error}
          </p>
        )}

        {/* ── ITEMS TAB ── */}
        {activeTab === 'items' && (
          <div className="space-y-4">

            {/* action buttons */}
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                  <div className={`py-3 bg-surface-container text-on-surface rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${importing ? 'opacity-50' : ''}`}>
                      <span className="material-symbols-outlined text-base">upload_file</span>
                      {importing ? 'Importing...' : 'Import Excel'}
                  </div>
                  <input
                      type="file"
                      accept=".xlsx"
                      onChange={handleImport}
                      disabled={importing}
                      className="hidden"
                  />
              </label>
              {importResult && (
                <div className={`px-4 py-3 rounded-xl text-sm space-y-1 ${
                    importResult.skipped > 0 ? 'bg-error-container' : 'bg-surface-container'
                }`}>
                    <p className="font-semibold text-on-surface">
                        ✅ {importResult.imported} items imported
                        {importResult.skipped > 0 && ` · ⚠️ ${importResult.skipped} skipped`}
                    </p>
                    {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-error">{err}</p>
                    ))}
                </div>
              )}
              <button
                onClick={handleOpenAdd}
                className="flex-1 py-3 bg-primary-container text-on-primary-container rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Add Item
              </button>
            </div>

            {/* add/edit form */}
            {showForm && (
              <div className="bg-white border border-outline-variant rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-on-surface">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h3>

                <input
                  type="text"
                  placeholder="Item name *"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                />

                <input
                  type="text"
                  placeholder="Category * (e.g. Electronics, Decorations)"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                />

                <input
                  type="text"
                  placeholder="Variant (optional, e.g. A, B, Red)"
                  value={form.variant}
                  onChange={e => setForm(f => ({ ...f, variant: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                />

                <select
                  value={form.committee_id}
                  onChange={e => setForm(f => ({ ...f, committee_id: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                >
                  <option value="">Select committee *</option>
                  {committees.map((c: Committee) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Total quantity *"
                  value={form.total_quantity}
                  onChange={e => setForm(f => ({ ...f, total_quantity: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                />

                <textarea
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:border-primary resize-none"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowForm(false)
                      setEditingItem(null)
                      setForm(emptyForm)
                    }}
                    className="flex-1 py-2.5 bg-surface-container text-on-surface rounded-full font-semibold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitForm}
                    disabled={isPending}
                    className="flex-1 py-2.5 bg-primary-container text-on-primary-container rounded-full font-semibold text-sm disabled:opacity-50"
                  >
                    {isPending ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Item'}
                  </button>
                </div>
              </div>
            )}

            {/* delete confirm */}
            {showDeleteConfirm && (
              <div className="bg-error-container border border-error rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-error">
                  Delete "{showDeleteConfirm.name}"?
                </p>
                <p className="text-xs text-error">
                  This cannot be undone. Items with active borrows cannot be deleted.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 py-2.5 bg-white text-on-surface rounded-full font-semibold text-sm border border-outline-variant"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(showDeleteConfirm.id)}
                    disabled={deleteMutation.isPending}
                    className="flex-1 py-2.5 bg-error text-white rounded-full font-semibold text-sm disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )}

            {/* committee filter */}
            <select
              value={selectedCommittee}
              onChange={e => setSelectedCommittee(e.target.value)}
              className="w-full py-2 px-4 bg-surface-container-low border border-outline-variant rounded-full text-sm outline-none focus:border-primary"
            >
              <option value="">All Committees</option>
              {committees.map((c: Committee) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* items list */}
            <div className="space-y-2">
              {filteredItems.map((item: Item) => (
                <div
                  key={item.id}
                  className="bg-white border border-outline-variant rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-on-surface text-sm">
                        {item.name}
                        {item.variant && (
                          <span className="font-normal text-on-surface-variant">
                            {' '}· {item.variant}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {item.category} · {getCommitteeName(item.committee_id)}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Available: {available(item)}/{item.total_quantity}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="material-symbols-outlined text-on-surface-variant text-xl"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(item)}
                        className="material-symbols-outlined text-error text-xl"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <div className="space-y-2">
            {(users as User[]).map((user: User) => (
              <div
                key={user.id}
                className="bg-white border border-outline-variant rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-on-surface text-sm">
                      {user.name}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      @{user.username?.string ?? 'no username'}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {user.committee_id?.valid
                        ? getCommitteeName(user.committee_id.int32)
                        : 'No committee'}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    user.role === 'super_admin'
                      ? 'bg-primary-container text-on-primary-container'
                      : user.role === 'committee_admin'
                      ? 'bg-tertiary-container text-tertiary'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    {user.role}
                  </span>
                </div>

                <div className="flex gap-2">
                  <select
                    defaultValue={user.role}
                    onChange={e => {
                      updateRoleMutation.mutate({
                        id: user.id,
                        role: e.target.value,
                        committeeId: user.committee_id?.valid ? user.committee_id.int32 : null
                      })
                    }}
                    className="flex-1 py-1.5 px-3 bg-surface-container-low border border-outline-variant rounded-full text-xs outline-none focus:border-primary"
                  >
                    <option value="user">User</option>
                    <option value="committee_admin">Committee Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>

                  <select
                    defaultValue={user.committee_id?.valid ? user.committee_id.int32 : ''}
                    onChange={e => {
                      updateRoleMutation.mutate({
                        id: user.id,
                        role: user.role,
                        committeeId: e.target.value ? Number(e.target.value) : null
                      })
                    }}
                    className="flex-1 py-1.5 px-3 bg-surface-container-low border border-outline-variant rounded-full text-xs outline-none focus:border-primary"
                  >
                    <option value="">No committee</option>
                    {committees.map((c: Committee) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}