import axios from 'axios'
import { clearSession, getStoredToken } from './auth'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'


export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
})

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let unauthorizedHandler = null
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn
}

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    const payload = error.response?.data
    const message =
      payload?.message ||
      (status === 401
        ? 'Your session has expired. Please sign in again.'
        : status === 403
          ? "You don't have permission to do that."
          : error.message || 'Something went wrong. Please try again.')

    if (status === 401) {
      clearSession()
      unauthorizedHandler?.()
    }

    return Promise.reject({ status, message, data: payload?.data ?? null })
  },
)

function stripEmpty(params = {}) {
  const out = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === '' || value === null || value === undefined) continue
    out[key] = value
  }
  return out
}

export const AuthAPI = {
  login: (email, password) => apiClient.post('/auth/login', { email, password, deviceType: 'web' }),
}

export const UsersAPI = {
  list: (params) => apiClient.get('/admin/users', { params: stripEmpty(params) }),
  get: (userId) => apiClient.get(`/admin/users/${userId}`),
  verifyEmail: (userId) => apiClient.patch(`/admin/users/${userId}/verify-email`),
  setRole: (userId, body) => apiClient.patch(`/admin/users/${userId}/role`, body),
  suspend: (userId, reason) => apiClient.post(`/admin/users/${userId}/suspend`, reason ? { reason } : {}),
  restore: (userId) => apiClient.post(`/admin/users/${userId}/restore`),
}

export const BookingsAPI = {
  list: (params) => apiClient.get('/admin/bookings', { params: stripEmpty(params) }),
  get: (id) => apiClient.get(`/admin/bookings/${id}`),
  cancel: (id, reason) => apiClient.post(`/admin/bookings/${id}/cancel`, reason ? { reason } : {}),
  forceComplete: (id) => apiClient.post(`/admin/bookings/${id}/force-complete`),
}

export const PayoutsAPI = {
  list: (params) => apiClient.get('/admin/payouts', { params: stripEmpty(params) }),
  get: (id) => apiClient.get(`/admin/payouts/${id}`),
  retry: (id) => apiClient.post(`/admin/payouts/${id}/retry`),
}

export const OpenRequestsAPI = {
  list: (params) => apiClient.get('/admin/open-requests', { params: stripEmpty(params) }),
  expire: (id) => apiClient.post(`/admin/open-requests/${id}/expire`),
}

export const PostsAPI = {
  list: (params) => apiClient.get('/admin/posts', { params: stripEmpty(params) }),
  remove: (postId) => apiClient.delete(`/admin/posts/${postId}`),
  removeComment: (commentId) => apiClient.delete(`/admin/comments/${commentId}`),
}

export const BandPackagesAPI = {
  list: (params) => apiClient.get('/admin/band-packages', { params: stripEmpty(params) }),
  remove: (packageId) => apiClient.delete(`/admin/band-packages/${packageId}`),
}

export const SupportMessagesAPI = {
  list: (params) => apiClient.get('/admin/support-messages', { params: stripEmpty(params) }),
  get: (id) => apiClient.get(`/admin/support-messages/${id}`),
  updateStatus: (id, body) => apiClient.patch(`/admin/support-messages/${id}/status`, body),
}

export const AnalyticsAPI = {
  bandAnalytics: (bandId) => apiClient.get(`/admin/bands/${bandId}/analytics`),
}

export const ReportsAPI = {
  list: (params) => apiClient.get('/admin/reports', { params: stripEmpty(params) }),
  resolve: (reportId, action) => apiClient.patch(`/admin/reports/${reportId}/resolve`, { action }),
}

export const ConfigAPI = {
  bookingPolicy: () => apiClient.get('/admin/config/booking-policy'),
  fieldOptions: () => apiClient.get('/admin/field-options'),
}
