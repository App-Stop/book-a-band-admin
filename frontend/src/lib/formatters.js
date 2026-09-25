import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

export function toDate(value) {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : new Date(value)
  return isValid(date) ? date : null
}

export function formatDate(value, pattern = 'MMM d, yyyy') {
  const date = toDate(value)
  return date ? format(date, pattern) : '—'
}

export function formatDateTime(value) {
  return formatDate(value, 'MMM d, yyyy · h:mm a')
}

export function formatRelative(value) {
  const date = toDate(value)
  return date ? formatDistanceToNow(date, { addSuffix: true }) : '—'
}

export function formatCurrency(value, currency = 'USD') {
  if (value == null || Number.isNaN(Number(value))) return '—'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value))
  } catch {
    return `$${Number(value).toFixed(2)}`
  }
}

export function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('en-US').format(Number(value))
}

export function titleCase(value) {
  if (!value) return '—'
  return String(value)
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function initials(name) {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}
