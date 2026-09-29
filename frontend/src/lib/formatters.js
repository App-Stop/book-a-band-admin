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

/**
 * "2026-09-29T10:00:00.000Z" + "2026-09-29T13:00:00.000Z" -> "10:00 AM – 1:00 PM"
 * (adds the date to the end time if the event spans days). Plain "HH:mm" strings pass through.
 */
export function formatTimeRange(start, end) {
  if (!start && !end) return null
  const s = toDate(start)
  const e = toDate(end)
  const raw = (v) => (v ? String(v) : '—')
  if ((start && !s) || (end && !e)) return `${raw(start)} – ${raw(end)}`
  const t = (d) => (d ? format(d, 'h:mm a') : '—')
  if (s && e && format(s, 'yyyy-MM-dd') !== format(e, 'yyyy-MM-dd')) {
    return `${formatDate(s, 'MMM d, h:mm a')} – ${formatDate(e, 'MMM d, h:mm a')}`
  }
  return `${t(s)} – ${t(e)}`
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
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** "BOOKING_CREATED_PAYMENT_PENDING" / "bookingCreated" -> "Booking created payment pending" */
export function humanizeText(value) {
  if (!value) return '—'
  const words = String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function isUrl(value) {
  return typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim())
}

const URL_KEYS = ['url', 'link', 'shareUrl', 'postUrl', 'webUrl', 'mediaUrl', 'videoUrl', 'imageUrl', 'thumbnail', 'image', 'video']

/** Best-effort: find a viewable URL on a record (post, media object, etc.). */
export function findUrl(obj, depth = 0) {
  if (!obj || depth > 2) return null
  if (isUrl(obj)) return obj
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const u = findUrl(item, depth + 1)
      if (u) return u
    }
    return null
  }
  if (typeof obj !== 'object') return null
  for (const k of URL_KEYS) {
    const u = findUrl(obj[k], depth + 1)
    if (u) return u
  }
  for (const k of ['media', 'medias', 'images', 'videos', 'attachments', 'post']) {
    const u = findUrl(obj[k], depth + 1)
    if (u) return u
  }
  return null
}

/** Reads an id from a populated object or a raw id string. */
export function refId(v) {
  if (!v) return null
  return typeof v === 'object' ? v._id || null : String(v)
}

export function initials(name) {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}
