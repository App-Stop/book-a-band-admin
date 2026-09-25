import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '../components/ui'

export default function NotFoundPage() {
  return (
    <div className="app-shell-bg flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
        <Compass className="h-7 w-7 text-brand-400" />
      </div>
      <h1 className="text-2xl font-bold text-white">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-400">The page you're looking for doesn't exist or has moved.</p>
      <Button as={Link} to="/">
        Back to dashboard
      </Button>
    </div>
  )
}
