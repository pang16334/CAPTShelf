import axios from 'axios'
import type { Item, Committee, BorrowRequest, User, ItemBorrowHistoryRow, BorrowRequestWithItems } from '../types'

const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    }
})

//interceptor - runs before every request automatically 
//attach telegram initData on every request
client.interceptors.request.use((config) => {
    if (window.Telegram?.WebApp?.initData) {
        config.headers['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData
    }
    return config
})

// committees
export const getCommittees = (): Promise<Committee[]> =>
    client.get('/committees').then(res => res.data)

// items — fetch all at once, filter client-side
export const getItems = (): Promise<Item[]> =>
    client.get('/items').then(res => res.data)

export const getItemById = (id: number): Promise<Item> =>
    client.get(`/items/${id}`).then(res => res.data)

export const getItemBorrowHistory = (id: number): Promise<ItemBorrowHistoryRow[]> =>
    client.get(`/items/${id}/borrows`).then(res => res.data)

// borrow requests
export const getBorrowRequestsWithItems = (): Promise<BorrowRequestWithItems[]> =>
    client.get('/borrow-requests/with-items').then(res => res.data)

export const getBorrowRequestById = (id: number): Promise<BorrowRequest[]> =>
    client.get(`/borrow-requests/${id}`).then(res => res.data)

export const createBorrowRequest = (data: any): Promise<BorrowRequest[]> =>
    client.post('/borrow-requests', data).then(res => res.data)

export const returnBorrowRequest = (id: number, data: any): Promise<BorrowRequest[]> =>
    client.post(`/borrow-requests/${id}/return`, data).then(res => res.data)

export const cancelBorrowRequest = (id: number) : Promise<BorrowRequest[]> =>
    client.post(`/borrow-requests/${id}/cancel`).then(res => res.data)

// users
export const getMe = (): Promise<User> =>
    client.get('/me').then(res => res.data)

export const getUsers = (): Promise<User> =>
    client.get('/admin/users').then(res => res.data)

export const updateUserRole = (id: number, data: any): Promise<User> =>
    client.put(`/admin/users/${id}/role`, data).then(res => res.data)

// admin items
export const createItem = (data: any): Promise<Item> =>
    client.post('/items', data).then(res => res.data)

export const updateItem = (id: number, data: any): Promise<Item> =>
    client.put(`/items/${id}`, data).then(res => res.data)

export const deleteItem = (id: number): Promise<void> =>
    client.delete(`/items/${id}`).then(res => res.data)

// import excel sheet 
export const importItems = (file: File): Promise<{ imported: number, skipped: number, errors: string[] }> => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post('/admin/items/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data)
}