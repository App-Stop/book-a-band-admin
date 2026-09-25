import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AuthAPI, setUnauthorizedHandler } from '../lib/api'
import {
  clearSession,
  findToken,
  findUser,
  getStoredToken,
  getStoredUser,
  isAdminRole,
  setStoredToken,
  setStoredUser,
} from '../lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken())
  const [user, setUser] = useState(() => getStoredUser())

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  const login = useCallback(async (email, password) => {
    const response = await AuthAPI.login(email, password)
    const payload = response?.data ?? response

    const jwt = findToken(payload)
    if (!jwt) {
      throw { message: 'Login succeeded but no auth token was found in the response.' }
    }

    const profile = findUser(payload) ?? {}
    if (!isAdminRole(profile)) {
      throw { message: 'This account does not have admin access.' }
    }

    setStoredToken(jwt)
    setStoredUser(profile)
    setToken(jwt)
    setUser(profile)
    return profile
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
