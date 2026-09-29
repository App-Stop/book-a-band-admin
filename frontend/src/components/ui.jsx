import { Children, Fragment, forwardRef, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { SlidersHorizontal, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, ExternalLink as ExternalLinkIcon, Loader2, Search, X } from 'lucide-react'
import { clsx } from 'clsx'
import { formatCurrency, formatDate, formatDateTime, formatNumber, initials, isUrl, titleCase, toDate } from '../lib/formatters'
import { UsersAPI } from '../lib/api'

/* ----------------------------- Buttons ----------------------------- */

const BUTTON_VARIANTS = {
  primary:
    'brand-gradient text-white shadow-sm shadow-brand-600/25 hover:brightness-110 active:brightness-95',
  secondary:
    'glass-card text-slate-800 hover:bg-slate-50 border-slate-900/10',
  ghost: 'text-slate-300 hover:text-slate-900 hover:bg-slate-900/5',
  danger: 'bg-danger-500/15 text-danger-300 border border-danger-500/30 hover:bg-danger-500/25',
  outline: 'border border-slate-900/15 text-slate-200 hover:bg-slate-900/5',
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
      data-variant={variant}
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
        'focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-900/10 hover:text-slate-900',
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
    brand: 'bg-brand-500/10 text-brand-600',
    accent: 'bg-accent-500/10 text-accent-500',
    success: 'bg-success-500/10 text-success-400',
    warning: 'bg-warning-500/10 text-warning-400',
    info: 'bg-info-500/10 text-info-400',
  }
  return (
    <Card className="flex items-center gap-4 p-4 sm:p-5">
      <div
        className={clsx(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          accents[accent],
        )}
      >
        {Icon && <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-xl font-semibold text-slate-900 sm:text-2xl">{value}</p>
        {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </Card>
  )
}

/* ---------------------------- Status badge --------------------------- */

const STATUS_MAP = {
  success: ['confirmed', 'accepted', 'completed', 'resolved', 'active', 'won', 'closed_won', 'verified', 'paid', 'paid_out'],
  danger: ['cancelled', 'declined', 'failed', 'expired', 'rejected', 'suspended', 'deleted', 'disputed', 'refunded'],
  warning: [
    'pending',
    'pending_payment',
    'waiting_onboarding',
    'processing',
    'in_progress',
    'open',
    'review',
    'holding_funds',
  ],
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
  neutral: 'bg-slate-900/8 text-slate-300 border-slate-900/15',
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
          'focus-ring w-full rounded-xl border border-slate-900/10 bg-slate-900/[0.03] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500',
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

function collectOptions(children, out = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === Fragment) collectOptions(child.props.children, out)
    else if (child.type === 'option') {
      const label = Children.toArray(child.props.children).join('')
      out.push({ value: String(child.props.value ?? label), label, disabled: !!child.props.disabled })
    }
  })
  return out
}

/**
 * Themed dropdown. Drop-in replacement for a native <select>: accepts <option>
 * children and calls onChange with a `{ target: { value } }` shaped event.
 */
export function Select({ className, children, value, onChange, disabled, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const [active, setActive] = useState(-1)
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const options = collectOptions(children)
  const current = options.find((o) => o.value === String(value ?? ''))

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom
    const flip = below < 260 && r.top > below
    setPos({
      left: r.left,
      width: r.width,
      ...(flip ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      maxHeight: Math.min(288, (flip ? r.top : below) - 16),
    })
  }, [])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  useEffect(() => {
    if (open) setActive(options.findIndex((o) => o.value === String(value ?? '')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open && active >= 0) menuRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const choose = (o) => {
    if (o.disabled) return
    onChange?.({ target: { value: o.value } })
    setOpen(false)
    btnRef.current?.focus()
  }

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (options[active]) choose(options[active])
    } else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={clsx(
          'focus-ring flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border bg-slate-900/[0.03] py-2 pl-3.5 pr-3 text-left text-sm transition duration-200 hover:bg-slate-900/[0.06] disabled:cursor-not-allowed disabled:opacity-50',
          open ? 'border-brand-500/60 bg-slate-900/[0.06]' : 'border-slate-900/10',
          current ? 'text-slate-100' : 'text-slate-500',
          className,
        )}
      >
        <span className="truncate">{current ? current.label : placeholder}</span>
        <ChevronDown className={clsx('h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200', open && 'rotate-180 text-brand-300')} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={pos}
            className="select-menu fixed z-[70] overflow-y-auto rounded-xl border border-slate-900/10 bg-white p-1 shadow-xl shadow-slate-900/15"
          >
            {options.map((o, i) => {
              const selected = o.value === String(value ?? '')
              return (
                <button
                  key={o.value + i}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-idx={i}
                  disabled={o.disabled}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={clsx(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-40',
                    selected ? 'text-brand-300' : 'text-slate-200',
                    active === i && 'bg-brand-500/15',
                    selected && active !== i && 'bg-slate-900/[0.04]',
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        'focus-ring w-full rounded-xl border border-slate-900/10 bg-slate-900/[0.03] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500',
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
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/5">
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
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-900/8 px-4 py-3 sm:flex-row">
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
          <tr className="border-b border-slate-900/8 text-left text-xs uppercase tracking-wide text-slate-500">
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
                'border-b border-slate-900/[0.05] transition-colors',
                onRowClick && 'cursor-pointer hover:bg-slate-900/[0.04]',
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'glass-panel relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-2xl shadow-xl shadow-slate-900/15',
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-900/8 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
          </div>
          <IconButton onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-900/8 px-5 py-4">{footer}</div>}
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
    <div className="drawer-enter fixed inset-0 z-50">
      <div ref={ref} className="app-shell-bg relative z-10 flex h-full w-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-900/8 bg-ink-950/70 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p>}
          </div>
          <IconButton onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8">
            {children}
            {footer && <div className="mt-8 flex flex-wrap justify-end gap-2">{footer}</div>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* -------------------------------- Tabs -------------------------------- */

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-900/8">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={clsx(
            'focus-ring shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-medium transition',
            active === tab.key
              ? 'border-brand-500 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200',
          )}
        >
          {tab.label}
          {tab.count != null && (
            <span className="ml-1.5 rounded-full bg-slate-900/10 px-1.5 py-0.5 text-[10px] text-slate-300">
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
    <details className="group rounded-xl border border-slate-900/8 bg-slate-900/[0.03]">
      <summary className="focus-ring cursor-pointer select-none list-none px-3.5 py-2.5 text-xs font-medium text-slate-400 group-open:text-slate-200">
        {label}
      </summary>
      <pre className="max-h-72 overflow-auto border-t border-slate-900/8 px-3.5 py-3 text-[11px] leading-relaxed text-slate-400">
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

/* ------------------------------ Avatar ------------------------------ */

export function Avatar({ src, name, size = 'md', className }) {
  const [failed, setFailed] = useState(false)
  const sizes = { sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl', xl: 'h-24 w-24 text-3xl' }
  useEffect(() => setFailed(false), [src])
  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 font-semibold text-white',
        sizes[size],
        className,
      )}
    >
      {src && !failed ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initials(name)
      )}
    </div>
  )
}

const pictureCache = new Map()

/**
 * List endpoints only populate {fullName, email}, so look the picture up lazily
 * (users by id, bands by name) and cache the result per person.
 */
function resolvePicture(person, role) {
  const key = role === 'band' || !person._id ? `name:${role}:${person.fullName}` : `id:${person._id}`
  if (!pictureCache.has(key)) {
    const request =
      key.startsWith('id:')
        ? UsersAPI.get(person._id).then((res) => res.data?.user?.profilePicture || res.data?.band?.profilePicture || null)
        : UsersAPI.list({ search: person.fullName, limit: 10 }).then((res) => {
            const items = res.data?.items || []
            const hit = items.find((u) => (u.bandProfile?.fullName || u.fullName) === person.fullName) || null
            return hit?.bandProfile?.profilePicture || hit?.profilePicture || null
          })
    pictureCache.set(key, request.catch(() => null))
  }
  return pictureCache.get(key)
}

function usePersonPicture(person, role) {
  const [pic, setPic] = useState(person?.profilePicture || null)
  const id = person?._id
  const name = person?.fullName
  useEffect(() => {
    if (!person) return undefined
    if (person.profilePicture) {
      setPic(person.profilePicture)
      return undefined
    }
    if (!id && !name) return undefined
    let alive = true
    resolvePicture(person, role).then((url) => alive && setPic(url))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, name, role, person?.profilePicture])
  return pic
}

/** Compact avatar + name + email, for table cells. */
export function PersonCell({ person, role = 'user', fallback = '—' }) {
  const pic = usePersonPicture(person, role)
  if (!person) return <span className="text-slate-500">{fallback}</span>
  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm" src={pic} name={person.fullName || person.email} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-100">{person.fullName || 'Unnamed'}</p>
        {person.email && <p className="truncate text-xs text-slate-500">{person.email}</p>}
      </div>
    </div>
  )
}

/** Profile card used in drawers: big round picture, name, email, role label. */
export function ProfileCard({ label, person, role }) {
  const pic = usePersonPicture(person, role || (label === 'Band' ? 'band' : 'user'))
  if (!person) return null
  return (
    <Card className="flex items-center gap-4 p-4">
      <Avatar size="lg" src={pic} name={person.fullName || person.email} className="ring-4 ring-brand-500/10" />
      <div className="min-w-0">
        {label && <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">{label}</p>}
        <p className="truncate text-lg font-semibold text-slate-100">{person.fullName || 'Unnamed'}</p>
        {person.email && <p className="truncate text-sm text-slate-500">{person.email}</p>}
      </div>
    </Card>
  )
}

/* --------------------------- Section heading --------------------------- */

export function SectionHeading({ icon: Icon, children }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-brand-600">
      {Icon && <Icon className="h-4.5 w-4.5" />}
      <h4 className="text-base font-semibold">{children}</h4>
    </div>
  )
}

/* ------------------------ Search + filter tags bar ------------------------ */

/**
 * One search box plus a "Filter" popover. Active filters render as removable tags.
 * fields: [{ key, label, type: 'select' | 'date', options?: [{ value, label }] }]
 */
export function FilterBar({ search, onSearch, placeholder, fields, values, onChange, onClear }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const boxRef = useRef(null)
  const popRef = useRef(null)

  const place = useCallback(() => {
    const r = boxRef.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(480, window.innerWidth - 16)
    const minLeft = (boxRef.current.closest('main')?.getBoundingClientRect().left ?? 0) + 8
    const left = Math.max(minLeft, Math.min(r.left, window.innerWidth - width - 8))
    setPos({ left, top: r.bottom + 8, width })
  }, [])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return undefined
    const inside = (t) => popRef.current?.contains(t) || boxRef.current?.contains(t) || t.closest?.('[role="listbox"]')
    const onDown = (e) => {
      if (!inside(e.target)) setOpen(false)
    }
    const onScroll = (e) => {
      if (!inside(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  const tagText = (f) => {
    const v = values[f.key]
    if (f.type === 'date') return `${f.label}: ${formatDate(v)}`
    if (f.type === 'entity') return `${f.label}: ${values[f.labelKey] || '…'}`
    const opt = f.options?.find((o) => o.value === v)
    return `${f.label}: ${opt ? opt.label : v}`
  }
  const active = fields.filter((f) => values[f.key] !== '' && values[f.key] != null)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {onSearch && (
          <div className="w-full sm:max-w-xs">
            <SearchInput value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="!py-1.5" />
          </div>
        )}
        <div className="relative" ref={boxRef}>
          <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)} className="py-2">
            <SlidersHorizontal className="h-4 w-4" /> Filter
            {active.length > 0 && (
              <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {active.length}
              </span>
            )}
          </Button>
          {open && pos && createPortal(
            <div ref={popRef} style={pos} className="select-menu fixed z-[60] rounded-2xl border border-slate-900/10 bg-white p-4 shadow-xl shadow-slate-900/15">
              <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key} className={f.type === 'date' ? '' : 'col-span-2'}>
                <Field label={f.label}>
                  {f.type === 'entity' ? (
                    <EntitySearchSelect
                      role={f.role}
                      placeholder={f.placeholder || 'Search by name…'}
                      value={values[f.key]}
                      valueLabel={values[f.labelKey]}
                      onSelect={(id, label) => {
                        onChange(f.key, id || '')
                        onChange(f.labelKey, label || '')
                      }}
                    />
                  ) : f.type === 'date' ? (
                    <TextInput type="date" value={values[f.key] || ''} onChange={(e) => onChange(f.key, e.target.value)} />
                  ) : (
                    <Select value={values[f.key] ?? ''} onChange={(e) => onChange(f.key, e.target.value)}>
                      <option value="">Any</option>
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                </div>
              ))}
              </div>
              <div className="flex justify-between pt-3">
                <Button size="sm" variant="ghost" onClick={onClear} disabled={active.length === 0 && !search}>
                  Clear all
                </Button>
                <Button size="sm" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            </div>,
            document.body,
          )}
        </div>
      </div>

      {(active.length > 0 || (onSearch && search)) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onSearch && search && (
            <FilterTag onRemove={() => onSearch('')}>Search: “{search}”</FilterTag>
          )}
          {active.map((f) => (
            <FilterTag key={f.key} onRemove={() => onChange(f.key, '')}>
              {tagText(f)}
            </FilterTag>
          ))}
          <button type="button" onClick={onClear} className="focus-ring rounded-md px-1.5 text-xs font-medium text-slate-500 hover:text-slate-900">
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

function FilterTag({ children, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand-500/30 bg-brand-500/10 py-1 pl-3 pr-1.5 text-xs font-medium text-brand-600">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="focus-ring flex h-4.5 w-4.5 items-center justify-center rounded-full hover:bg-brand-500/20"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

/* ------------------------- Entity name search select ------------------------- */

/**
 * Type-ahead text input that searches `/admin/users` by name (role-scoped) and
 * resolves the pick to an id, so callers can filter list endpoints by the id
 * they actually accept while the admin only ever types a name.
 */
export function EntitySearchSelect({ role, placeholder = 'Search by name…', value, valueLabel, onSelect, className }) {
  const [query, setQuery] = useState(valueLabel || '')
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    setQuery(valueLabel || '')
  }, [valueLabel])

  useEffect(() => {
    if (!open) return undefined
    const q = query.trim()
    if (!q) {
      setOptions([])
      setLoading(false)
      return undefined
    }
    setLoading(true)
    const handle = setTimeout(() => {
      UsersAPI.list({ role, search: q, limit: 8 })
        .then((res) => setOptions(res.data?.items || []))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [query, open, role])

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={boxRef}>
      <TextInput
        icon={Search}
        placeholder={placeholder}
        className={className}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const next = e.target.value
          setQuery(next)
          setOpen(true)
          if (!next.trim() && value) onSelect(null, '')
        }}
      />
      {value && query && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setQuery('')
            onSelect(null, '')
          }}
          className="focus-ring absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-500 hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {open && query.trim() && (loading || options.length > 0) && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-900/10 bg-white shadow-xl shadow-slate-900/15">
          {loading && <div className="px-3.5 py-2.5 text-xs text-slate-500">Searching…</div>}
          {!loading &&
            options.map((o) => (
              <button
                key={o._id}
                type="button"
                onClick={() => {
                  onSelect(o._id, o.fullName || '')
                  setQuery(o.fullName || '')
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-900/8"
              >
                {o.profilePicture ? (
                  <img src={o.profilePicture} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-6 w-6 shrink-0 rounded-full bg-slate-900/10" />
                )}
                <span className="min-w-0 flex-1 truncate">{o.fullName || 'Unnamed'}</span>
                {o.email && <span className="shrink-0 truncate text-xs text-slate-500">{o.email}</span>}
              </button>
            ))}
          {!loading && options.length === 0 && (
            <div className="px-3.5 py-2.5 text-xs text-slate-500">No matches found.</div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------ Auto-formatted fields ------------------------------ */

const AUTO_HIDDEN_KEYS = new Set(['__v', 'password', 'otp', 'otpExpiry', 'resetToken', 'resetTokenExpiry'])

function humanizeKey(key) {
  return titleCase(String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2'))
}

function isDateKey(key) {
  return /(At|Date)$/.test(key)
}

function isMoneyKey(key) {
  return /(amount|price|fee|cost|total|payout|earning|revenue|balance)/i.test(key)
}

function isIdKey(key) {
  return key === '_id' || key === 'id' || /Id$/.test(key)
}

const isIsoDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)
const isObjectId =(v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v)
// snake_case / SCREAMING_SNAKE enum values such as "pending_payment"
const isEnumLike = (v) => typeof v === 'string' && /^[A-Za-z]+(_[A-Za-z]+)+$/.test(v)

function linkLabel(key) {
  const k = String(key || '')
  if (/video/i.test(k)) return 'Click here to view video'
  if (/image|photo|picture|thumbnail|avatar/i.test(k)) return 'Click here to view image'
  if (/post/i.test(k)) return 'Click here to view post'
  return 'Click here to open link'
}

/** Text-styled external link that opens in a new tab. */
export function ExternalLink({ href, children, className }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        'inline-flex items-center gap-1 text-brand-300 underline decoration-brand-300/40 underline-offset-2 transition hover:text-brand-200 hover:decoration-brand-200',
        className,
      )}
    >
      {children}
      <ExternalLinkIcon className="h-3 w-3 shrink-0" />
    </a>
  )
}

/** In-app link to another admin page. */
export function AppLink({ to, children, className }) {
  return (
    <Link
      to={to}
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        'inline-flex items-center gap-1 text-brand-300 underline decoration-brand-300/40 underline-offset-2 transition hover:text-brand-200 hover:decoration-brand-200',
        className,
      )}
    >
      {children}
      <ArrowUpRight className="h-3 w-3 shrink-0" />
    </Link>
  )
}

function AutoPrimitiveValue({ keyName, value }) {
  if (value == null || value === '') return <span className="text-slate-500">—</span>
  if (typeof value === 'boolean') return <BoolBadge value={value} />
  if (typeof value === 'number') {
    return <span>{isMoneyKey(keyName) ? formatCurrency(value) : formatNumber(value)}</span>
  }
  if (typeof value === 'string') {
    if (isUrl(value)) return <ExternalLink href={value}>{linkLabel(keyName)}</ExternalLink>
    if (isIdKey(keyName)) return <span className="font-mono text-xs">{value}</span>
    if ((isDateKey(keyName) || isIsoDate(value)) && toDate(value)) return <span>{formatDateTime(value)}</span>
    if (isEnumLike(value)) return <span>{titleCase(value)}</span>
    return <span className="whitespace-pre-wrap break-words">{value}</span>
  }
  return <span className="text-slate-500">—</span>
}

/**
 * Renders any plain object/array as neat, human-readable UI — labelled rows for
 * primitives, cards for nested objects, chip/row lists for arrays — instead of
 * dumping raw JSON. Used as the default detail view wherever the exact backend
 * schema isn't pinned down (posts, open requests, packages, platform config, …).
 */
export function AutoFields({ data, exclude = [], excludeMatch, depth = 0 }) {
  if (data == null) return <p className="text-sm text-slate-500">No data.</p>

  if (Array.isArray(data)) {
    if (data.length === 0) return <p className="text-xs text-slate-500">None</p>
    data = data.filter((item) => !isObjectId(item))
    if (data.length === 0) return <p className="text-xs text-slate-500">None</p>
    const allPrimitive = data.every((item) => item == null || typeof item !== 'object')
    if (allPrimitive) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {data.map((item, i) => (
            isUrl(item) ? <ExternalLink key={i} href={item}>{linkLabel('')}</ExternalLink> : <Badge key={i}>{isEnumLike(item) ? titleCase(item) : String(item)}</Badge>
          ))}
        </div>
      )
    }
    return (
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={item?._id || i} className="rounded-xl border border-slate-900/8 bg-slate-900/[0.02] p-3.5">
            <AutoFields data={item} excludeMatch={excludeMatch} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }

  if (typeof data !== 'object') {
    return <AutoPrimitiveValue keyName="" value={data} />
  }

  const entries = Object.entries(data).filter(([k, v]) => !AUTO_HIDDEN_KEYS.has(k) && !exclude.includes(k) && !(excludeMatch && excludeMatch.test(k)) && !(isIdKey(k) && (v == null || typeof v !== 'object')) && !isObjectId(v))
  if (entries.length === 0) return <p className="text-xs text-slate-500">No details available.</p>

  const primitive = entries.filter(([, v]) => v == null || typeof v !== 'object')
  const objects = entries.filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v))
  const arrays = entries.filter(([, v]) => Array.isArray(v))

  return (
    <div className="space-y-4">
      {primitive.length > 0 && (
        <div className="divide-y divide-slate-900/5">
          {primitive.map(([k, v]) => (
            <KeyValue key={k} label={humanizeKey(k)} value={<AutoPrimitiveValue keyName={k} value={v} />} />
          ))}
        </div>
      )}
      {objects.map(([k, v]) => (
        <div key={k}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{humanizeKey(k)}</p>
          <div className="rounded-xl border border-slate-900/8 bg-slate-900/[0.02] p-3.5">
            <AutoFields data={v} excludeMatch={excludeMatch} depth={depth + 1} />
          </div>
        </div>
      ))}
      {arrays.map(([k, v]) => (
        <div key={k}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {humanizeKey(k)} {v.length > 0 && <span className="text-slate-600">({v.length})</span>}
          </p>
          <AutoFields data={v} excludeMatch={excludeMatch} depth={depth + 1} />
        </div>
      ))}
    </div>
  )
}
