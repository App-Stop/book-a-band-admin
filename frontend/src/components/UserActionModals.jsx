import { useState } from 'react'
import { Button, Field, Modal, Textarea, TextInput } from './ui'
import { NotificationsAPI, UsersAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { titleCase } from '../lib/formatters'

const rolesOf = (user) => (Array.isArray(user?.role) ? user.role : user?.role ? [user.role] : [])

/** Irreversible hard delete. The admin must type the account's email to enable the button. */
export function DeleteUserModal({ user, onClose, onDeleted }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isBand = rolesOf(user).includes('band')
  const confirmWord = user.email || 'DELETE'

  async function handleDelete() {
    setBusy(true)
    setError('')
    try {
      const res = await UsersAPI.remove(user._id, reason.trim())
      toast.success(res?.message || 'User permanently deleted.')
      onDeleted()
    } catch (err) {
      if (err?.status === 409 && /^Account deletion aborted/.test(err.message || '')) {
        // Each booking is cancelled in its own transaction, so some may already be cancelled and refunded.
        setError(
          'Some active bookings could not be cancelled, so the account was not deleted. Bookings that were already cancelled stay cancelled. Please retry.',
        )
      } else if (err?.status === 409 || err?.message === 'User not found.') {
        toast.success('This user was already deleted.')
        onDeleted()
      } else {
        setError(err?.message || 'Failed to delete user.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Permanently delete ${user.fullName || user.email}?`}
      description="This removes the account from the database and cannot be undone. To block the user temporarily, use Suspend instead."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={busy} disabled={confirmText !== confirmWord}>
            Delete permanently
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isBand && (
          <p className="rounded-xl border border-warning-500/30 bg-warning-500/10 p-3 text-sm text-warning-400">
            Their band profile will be deleted too. All pending, confirmed and in-progress bookings for the band will be cancelled, and
            paying customers refunded (minus the platform fee).
          </p>
        )}
        <Field label="Reason (optional)" hint="Shown to the user and to customers whose bookings are cancelled.">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Field label={`Type ${confirmWord} to confirm`}>
          <TextInput value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
        </Field>
        {error && <p className="text-sm text-danger-400">{error}</p>}
      </div>
    </Modal>
  )
}

/** Sends a custom in-app + push notification to one user, on the user or band side of their account. */
export function SendNotificationModal({ user, onClose }) {
  const toast = useToast()
  const sides = rolesOf(user).filter((r) => r === 'user' || r === 'band')
  const [recipientRole, setRecipientRole] = useState(sides.includes(user.activeRole) ? user.activeRole : sides[0] || '')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canSend = recipientRole && title.trim() && message.trim() && !busy

  async function handleSend() {
    setBusy(true)
    setError('')
    try {
      await NotificationsAPI.send({ userId: user._id, recipientRole, title: title.trim(), message: message.trim() })
      toast.success('Notification sent.')
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to send notification.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title="Send notification"
      description={`To ${user.fullName || user.email}. They receive it in-app and as a push.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSend} loading={busy} disabled={!canSend}>
            Send
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {sides.length === 0 && (
          <p className="text-sm text-warning-400">This account has no user or band role yet, so it can't receive notifications.</p>
        )}
        {sides.length > 1 && (
          <Field label="Send to" hint="The app keeps separate notification feeds for each side of the account.">
            <div className="flex gap-2">
              {sides.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecipientRole(r)}
                  className={`focus-ring rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    recipientRole === r
                      ? 'border-brand-500/60 bg-brand-500/20 text-brand-200'
                      : 'border-slate-900/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {titleCase(r)} side
                </button>
              ))}
            </div>
          </Field>
        )}
        <Field label="Title" hint={`${title.length}/120`}>
          <TextInput value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Profile tip" />
        </Field>
        <Field label="Message" hint={`${message.length}/500`}>
          <Textarea rows={4} value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)} placeholder="Add a few more photos to get more bookings!" />
        </Field>
        {error && <p className="text-sm text-danger-400">{error}</p>}
      </div>
    </Modal>
  )
}
