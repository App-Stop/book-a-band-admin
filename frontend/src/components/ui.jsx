import { forwardRef, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react'
import { clsx } from 'clsx'
import { titleCase } from '../lib/formatters'

/* ----------------------------- Buttons ----------------------------- */

const BUTTON_VARIANTS = {
  primary:
    'brand-gradient text-white shadow-lg shadow-brand-600/25 hover:brightness-110 active:brightness-95',
  secondary:
    'glass-card text-slate-100 hover:bg-white/[0.08] border-white/10',
  ghost: 'text-slate-300 hover:text-white hover:bg-white/5',
  danger: 'bg-danger-500/15 text-danger-300 border border-danger-500/30 hover:bg-danger-500/25',
  outline: 'border border-white/15 text-slate-200 hover:bg-white/5',
}

export const Button = forwardRef(function Button(
  { as: Comp = 'button', variant = 'primary', size = 'md', className, loading, disabled, children, ...props },
  ref,
) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2',
  }
  return (
    <Comp
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'focus-ring inline-flex items-center justify-center rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Comp>
  )
})

export function IconButton({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={clsx(
        'focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* ------------------------------ Cards ------------------------------ */

export function Card({ className, children, ...props }) {
  return (
    <div className={clsx('glass-card rounded-2xl', className)} {...props}>
      {children}
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, hint, accent = 'brand' }) {
  const accents = {
    brand: 'from-brand-500/25 to-brand-700/10 text-brand-300',
    accent: 'from-accent-500/25 to-accent-600/10 text-accent-300',
    success: 'from-success-500/25 to-success-500/5 text-success-400',
    warning: 'from-warning-500/25 to-warning-500/5 text-warning-400',
    info: 'from-info-500/25 to-info-500/5 text-info-400',
  }
  return (
    <Card className="flex items-center gap-4 p-4 sm:p-5">
      <div
        className={clsx(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br',
          accents[accent],
        )}
      >
        {Icon && <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-xl font-semibold text-white sm:text-2xl">{value}</p>
        {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </Card>
  )
}

/* ---------------------------- Status badge --------------------------- */

const STATUS_MAP = {
  success: ['confirmed', 'accepted', 'completed', 'resolved', 'active', 'won', 'closed_won', 'verified', 'paid'],
  danger: ['cancelled', 'declined', 'failed', 'expired', 'rejected', 'suspended', 'deleted', 'disputed'],
  warning: ['pending', 'waiting_onboarding', 'processing', 'in_progress', 'open', 'review'],
  info: ['new', 'unread'],
}

function statusTone(value) {
  const v = String(value || '').toLowerCase()
  for (const [tone, list] of Object.entries(STATUS_MAP)) {
    if (list.includes(v)) return tone
  }
  return 'neutral'
}

const TONE_CLASSES = {
  success: 'bg-success-500/15 text-success-400 border-success-500/30',
  danger: 'bg-danger-500/15 text-danger-400 border-danger-500/30',
  warning: 'bg-warning-500/15 text-warning-400 border-warning-500/30',
  info: 'bg-info-500/15 text-info-400 border-info-500/30',
  neutral: 'bg-white/8 text-slate-300 border-white/15',
}

export function Badge({ children, tone = 'neutral', className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  if (!status) return <span className="text-slate-500">—</span>
  return <Badge tone={statusTone(status)}>{titleCase(status)}</Badge>
}

export function BoolBadge({ value, trueLabel = 'Yes', falseLabel = 'No' }) {
  return <Badge tone={value ? 'success' : 'neutral'}>{value ? trueLabel : falseLabel}</Badge>
}

/* ------------------------------ Inputs ------------------------------ */

export const TextInput = forwardRef(function TextInput({ className, icon: Icon, ...props }, ref) {
  return (
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />}
      <input
        ref={ref}
        className={clsx(
          'focus-ring w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500',
          Icon && 'pl-9',
          className,
        )}
        {...props}
      />
    </div>
  )
})

export function SearchInput({ className, ...props }) {
  return <TextInput icon={Search} placeholder="Search…" className={className} {...props} />
}

export function SuggestInput({ suggestions = [], className, ...props }) {
  const listId = useId()
  return (
    <div>
      <TextInput list={listId} className={className} {...props} />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  )
}

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={clsx(
        'focus-ring w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-slate-100',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        'focus-ring w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500',
        className,
      )}
      {...props}
    />
  )
})

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

/* ----------------------------- Feedback ----------------------------- */

export function Spinner({ className }) {
  return <Loader2 className={clsx('h-5 w-5 animate-spin text-brand-400', className)} />
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <Spinner className="h-6 w-6" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ icon: Icon, title = 'Nothing here yet', description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-400">
      {Icon && (
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
          <Icon className="h-6 w-6 text-slate-500" />
        </div>
      )}
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-500">{description}</p>}
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-sm font-medium text-danger-400">{message}</p>
    </div>
  )
}

/* ---------------------------- Pagination ---------------------------- */

export function Pagination({ page, totalPages, total, limit, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null
  const canPrev = page > 1
  const canNext = page < totalPages
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-white/8 px-4 py-3 sm:flex-row">
      <p className="text-xs text-slate-500">
        Showing <span className="text-slate-300">{start}</span>–<span className="text-slate-300">{end}</span> of{' '}
        <span className="text-slate-300">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <IconButton disabled={!canPrev} onClick={() => canPrev && onPageChange(page - 1)} className="disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        <span className="px-2 text-xs text-slate-400">
          Page {page} of {totalPages}
        </span>
        <IconButton disabled={!canNext} onClick={() => canNext && onPageChange(page + 1)} className="disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  )
}

/* ------------------------------- Table ------------------------------- */

export function Table({ columns, rows, rowKey, onRowClick, loading, emptyState }) {
  if (loading) return <LoadingBlock />
  if (!rows || rows.length === 0) return emptyState ?? <EmptyState />

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wide text-slate-500">
            {columns.map((col) => (
              <th key={col.key} className={clsx('whitespace-nowrap px-4 py-3 font-medium', col.headClassName)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={clsx(
                'border-b border-white/[0.05] transition-colors',
                onRowClick && 'cursor-pointer hover:bg-white/[0.04]',
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={clsx('px-4 py-3 align-middle text-slate-200', col.className)}>
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------- Modal ------------------------------- */

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'glass-panel relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-2xl shadow-2xl shadow-black/50',
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
          </div>
          <IconButton onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/8 px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  variant = 'primary',
  loading,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}

/* -------------------------------- Drawer ------------------------------- */

export function Drawer({ open, onClose, title, subtitle, children, footer }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        className="glass-panel relative z-10 flex h-full w-full max-w-xl flex-col shadow-2xl shadow-black/50 sm:border-l sm:border-white/10"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p>}
          </div>
          <IconButton onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-white/8 px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* -------------------------------- Tabs -------------------------------- */

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-white/8">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={clsx(
            'focus-ring shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-medium transition',
            active === tab.key
              ? 'border-brand-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200',
          )}
        >
          {tab.label}
          {tab.count != null && (
            <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------ Key/value ------------------------------ */

export function KeyValue({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={clsx('text-right text-slate-200', mono && 'font-mono text-xs')}>{value ?? '—'}</span>
    </div>
  )
}

export function RawPanel({ data, label = 'Raw record' }) {
  if (data == null) return null
  return (
    <details className="group rounded-xl border border-white/8 bg-black/20">
      <summary className="focus-ring cursor-pointer select-none list-none px-3.5 py-2.5 text-xs font-medium text-slate-400 group-open:text-slate-200">
        {label}
      </summary>
      <pre className="max-h-72 overflow-auto border-t border-white/8 px-3.5 py-3 text-[11px] leading-relaxed text-slate-400">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  )
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h4 className="text-sm font-semibold text-slate-200">{children}</h4>
      {action}
    </div>
  )
}
