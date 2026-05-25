import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout       from './components/Layout'
import LoginPage    from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LogPage      from './pages/LogPage'
import HistoryPage  from './pages/HistoryPage'
import AnalyticsPage from './pages/AnalyticsPage'
import GoalsPage    from './pages/GoalsPage'
import SchedulePage from './pages/SchedulePage'
import RoutineManagerPage from './pages/RoutineManagerPage'
import ProgressGalleryPage from './pages/ProgressGalleryPage'
import './index.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div className="spinner" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index       element={<DashboardPage />} />
            <Route path="schedule"  element={<SchedulePage />} />
            <Route path="routines"  element={<RoutineManagerPage />} />
            <Route path="log"       element={<LogPage />} />
            <Route path="history"   element={<HistoryPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="goals"     element={<GoalsPage />} />
            <Route path="gallery"   element={<ProgressGalleryPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
