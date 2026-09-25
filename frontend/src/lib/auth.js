const TOKEN_KEY = 'bab_admin_token'
const USER_KEY = 'bab_admin_user'

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

/**
 * The admin API guide doesn't pin down the exact field name the login
 * response uses for the JWT, so we walk the response payload looking for
 * anything JWT-shaped (preferring common key names first).
 */
export function findToken(payload, depth = 0) {
  if (payload == null || depth > 5) return null

  if (typeof payload === 'string') {
    return JWT_PATTERN.test(payload) ? payload : null
  }

  if (typeof payload !== 'object') return null

  const priorityKeys = ['token', 'accessToken', 'authToken', 'jwt', 'idToken']
  for (const key of priorityKeys) {
    const value = payload[key]
    if (typeof value === 'string' && JWT_PATTERN.test(value)) return value
  }

  for (const value of Object.values(payload)) {
    const found = findToken(value, depth + 1)
    if (found) return found
  }

  return null
}

/** Similarly, find the user/profile object nested in the login response. */
export function findUser(payload, depth = 0) {
  if (payload == null || typeof payload !== 'object' || depth > 4) return null

  if ('role' in payload && ('email' in payload || 'fullName' in payload || '_id' in payload)) {
    return payload
  }

  const priorityKeys = ['user', 'admin', 'profile', 'account']
  for (const key of priorityKeys) {
    if (payload[key] && typeof payload[key] === 'object') {
      const found = findUser(payload[key], depth + 1)
      if (found) return found
    }
  }

  for (const value of Object.values(payload)) {
    if (value && typeof value === 'object') {
      const found = findUser(value, depth + 1)
      if (found) return found
    }
  }

  return null
}

export function isAdminRole(user) {
  if (!user) return false
  const role = user.role
  if (Array.isArray(role)) return role.includes('admin')
  return role === 'admin'
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY)
}

export function clearSession() {
  clearStoredToken()
  clearStoredUser()
}
