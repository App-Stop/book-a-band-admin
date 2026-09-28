import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { FieldOptionsProvider } from './context/FieldOptionsContext'
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import BookingsPage from './pages/BookingsPage'
import PayoutsPage from './pages/PayoutsPage'
import OpenRequestsPage from './pages/OpenRequestsPage'
import DisputesPage from './pages/DisputesPage'
import ModerationPage from './pages/ModerationPage'
import ConfigPage from './pages/ConfigPage'
import NotFoundPage from './pages/NotFoundPage'

function Providers({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <FieldOptionsProvider>{children}</FieldOptionsProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default function App() {
  return (
    <Providers>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/payouts" element={<PayoutsPage />} />
          <Route path="/open-requests" element={<OpenRequestsPage />} />
          <Route path="/disputes" element={<DisputesPage />} />
          <Route path="/moderation" element={<ModerationPage />} />
          <Route path="/config" element={<ConfigPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Providers>
  )
}
