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
import PostsPage from './pages/PostsPage'
import BandPackagesPage from './pages/BandPackagesPage'
import SupportMessagesPage from './pages/SupportMessagesPage'
import BandAnalyticsPage from './pages/BandAnalyticsPage'
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
          <Route path="/posts" element={<PostsPage />} />
          <Route path="/band-packages" element={<BandPackagesPage />} />
          <Route path="/support-messages" element={<SupportMessagesPage />} />
          <Route path="/analytics" element={<BandAnalyticsPage />} />
          <Route path="/config" element={<ConfigPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Providers>
  )
}
