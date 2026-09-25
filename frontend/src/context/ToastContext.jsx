import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const ACCENTS = {
  success: 'text-success-400 border-success-500/30',
  error: 'text-danger-400 border-danger-500/30',
  warning: 'text-warning-400 border-warning-500/30',
  info: 'text-info-400 border-info-500/30',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'info') => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => dismiss(id), 5000)
      return id
    },
    [dismiss],
  )

  const toast = {
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error'),
    warning: (message) => push(message, 'warning'),
    info: (message) => push(message, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICONS[t.type]
          return (
            <div
              key={t.id}
              className={`glass-panel flex items-start gap-3 rounded-xl border p-3 shadow-2xl shadow-black/40 animate-[toast-in_0.2s_ease-out] ${ACCENTS[t.type]}`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="flex-1 text-sm text-slate-100">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
