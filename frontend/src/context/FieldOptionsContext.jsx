import { createContext, useContext, useEffect, useState } from 'react'
import { ConfigAPI } from '../lib/api'
import { useAuth } from './AuthContext'

const FieldOptionsContext = createContext({ options: null, loading: true })

export function FieldOptionsProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [options, setOptions] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    setLoading(true)
    ConfigAPI.fieldOptions()
      .then((res) => {
        if (!cancelled) setOptions(res?.data ?? null)
      })
      .catch(() => {
        if (!cancelled) setOptions(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  return (
    <FieldOptionsContext.Provider value={{ options, loading }}>
      {children}
    </FieldOptionsContext.Provider>
  )
}

export function useFieldOptions() {
  return useContext(FieldOptionsContext)
}
