import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { homeFor, useAuth } from './api/auth'
import type { Role } from './api/types'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import { Icon } from './components/icons'
import LoginPage from './pages/LoginPage'
import DriverHome from './pages/DriverHome'
import RidesPage, { ApprovalsPage } from './pages/RidesPage'
import RideDetailPage from './pages/RideDetailPage'
import DashboardPage from './pages/DashboardPage'
import MonthlyPage from './pages/MonthlyPage'
import AdminPage from './pages/AdminPage'

function NotAllowed() {
  const { t } = useTranslation()
  const { user } = useAuth()
  return (
    <div className="card mx-auto max-w-md p-10 text-center" data-testid="not-allowed">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon name="alert" /></span>
      <h1 className="mt-4 text-2xl font-extrabold">{t('common.notAllowed')}</h1>
      <p className="mt-2 text-slate-500">{t('common.notAllowedText')}</p>
      {user && <Link to={homeFor(user.role)} className="btn-primary mt-6">{t('common.goHome')}</Link>}
    </div>
  )
}

function Guard({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <NotAllowed />
  return <>{children}</>
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={user ? <Navigate to={homeFor(user.role)} replace /> : null} />
        <Route path="/driver" element={<Guard roles={['Driver']}><DriverHome /></Guard>} />
        <Route path="/rides" element={<Guard><RidesPage /></Guard>} />
        <Route path="/rides/:id" element={<Guard><RideDetailPage /></Guard>} />
        <Route path="/approvals" element={<Guard roles={['Manager']}><ApprovalsPage /></Guard>} />
        <Route path="/dashboard" element={<Guard roles={['HR', 'Manager']}><DashboardPage /></Guard>} />
        <Route path="/monthly" element={<Guard roles={['HR', 'Driver']}><MonthlyPage /></Guard>} />
        <Route path="/admin" element={<Guard roles={['HR']}><AdminPage /></Guard>} />
        <Route path="*" element={<NotAllowed />} />
      </Route>
    </Routes>
  )
}
