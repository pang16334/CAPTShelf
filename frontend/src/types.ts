export interface Committee {
  id: number
  name: string
  created_at: string
}

export interface Item {
  id: number
  name: string
  category: string
  variant: { string: string; valid: boolean } | null
  committee_id: number
  total_quantity: number
  borrowed_quantity: number
  description: { string: string; valid: boolean } | null
  created_at: string
  updated_at: string
}

export interface ItemBorrowHistoryRow {
  id: number
  borrower_name: string
  borrower_telegram_id: number
  status: string
  borrowed_at: string
  expected_return_at: string
  quantity: number
}

export interface BorrowRequest {
  id: number
  borrower_name: string
  borrower_telegram_id: number
  committee_id: number
  borrow_photo_url: string
  return_photo_url: string
  expected_return_at: string
  remarks: { string: string; valid: boolean } | null
  status: string
  borrowed_at: string
}

export interface BorrowRequestItem {
  id: number
  borrow_request_id: number
  item_id: number
  quantity: number
  returned_quantity: number
}

export interface User {
  id: number
  telegram_id: number
  name: string
  username: { string: string; valid: boolean } | null
  role: string
  committee_id: { int32: number; valid: boolean } | null
  created_at: string
}