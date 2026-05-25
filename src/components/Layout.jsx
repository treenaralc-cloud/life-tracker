import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'

const NAV_ITEMS = [
  { to: '/',          icon: '🏠', label: 'หน้าหลัก' },
  { to: '/schedule',  icon: '📅', label: 'ตาราง' },
  { to: '/routines',  icon: '🔁', label: 'กิจวัตร' },
  { to: '/log',       icon: '➕', label: 'บันทึก' },
  { to: '/history',   icon: '📋', label: 'ประวัติ' },
  { to: '/analytics', icon: '📊', label: 'วิเคราะห์' },
  { to: '/goals',     icon: '🎯', label: 'เป้าหมาย' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    // Schedule evening reminder
    scheduleReminder()
  }, [])

  function scheduleReminder() {
    const now = new Date()
    const target = new Date()
    target.setHours(20, 0, 0, 0)
    if (now > target) target.setDate(target.getDate() + 1)
    const ms = target - now
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('Life Tracker 📝', {
          body: 'อย่าลืมบันทึกกิจกรรมวันนี้นะคะบอส!',
          icon: '/icon-192.png',
        })
      }
    }, ms)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const getNavLinkClass = ({ isActive }) =>
    isActive ? 'nav-link active' : 'nav-link'

  const getBottomClass = ({ isActive }) =>
    isActive ? 'bottom-nav-item active' : 'bottom-nav-item'

  return (
    <div className="app-shell">
      {/* Sidebar — desktop */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">💪</div>
          <span className="sidebar-logo-text">Life Tracker</span>
        </div>

        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={getNavLinkClass}>
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto' }}>
          <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-3)', borderTop: '1px solid var(--border)', marginTop: 8, wordBreak: 'break-all' }}>
            {user?.email}
          </div>
          <button className="nav-link" style={{ width: '100%' }} onClick={handleSignOut}>
            <span className="nav-icon">🚪</span>
            ออกจากระบบ
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom nav — mobile */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={getBottomClass}>
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
