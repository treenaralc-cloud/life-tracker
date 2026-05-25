import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getWeeklyStats, getStreak, getWorkoutSessions, getCardioLogs, getGolfLogs, getStudyLogs } from '../utils/db'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

const CATS = [
  { key: 'workout', icon: '🏋️', label: 'เวทเทรนนิ่ง', color: '#38bdf8', unit: 'วัน' },
  { key: 'cardio',  icon: '🏃', label: 'คาร์ดิโอ',     color: '#f97316', unit: 'เซสชัน' },
  { key: 'golf',    icon: '⛳', label: 'กอล์ฟ',         color: '#22c55e', unit: 'เซสชัน' },
  { key: 'study',   icon: '📚', label: 'เรียน',          color: '#a855f7', unit: 'ชั่วโมง' },
  { key: 'stretch', icon: '🧘', label: 'ยืดเหยียด',     color: '#ec4899', unit: 'วัน' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '🌤️ อรุณสวัสดิ์ครับบอส!'
  if (h < 17) return '☀️ สวัสดีตอนบ่ายครับบอส!'
  if (h < 21) return '🌆 สวัสดีตอนเย็นครับบอส!'
  return '🌙 สวัสดีตอนค่ำครับบอส!'
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600, fontSize: 13 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats]   = useState(null)
  const [streak, setStreak] = useState(0)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [s, str, workouts, cardio, golf, study] = await Promise.all([
        getWeeklyStats(),
        getStreak(),
        getWorkoutSessions(7),
        getCardioLogs(7),
        getGolfLogs(7),
        getStudyLogs(7),
      ])
      setStats(s)
      setStreak(str)

      // Build weekly chart (last 7 days)
      const week = []
      const today = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const ds = format(d, 'yyyy-MM-dd')
        const dayLabel = format(d, 'EEE', { locale: th })
        week.push({
          day: dayLabel,
          เวท: workouts.filter(r => r.date === ds).length,
          คาร์ดิโอ: cardio.filter(r => r.date === ds).length,
          กอล์ฟ: golf.filter(r => r.date === ds).length,
          เรียน: study.filter(r => r.date === ds).length,
        })
      }
      setChartData(week)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
    </div>
  )

  const statCards = [
    { icon: '🏋️', label: 'เวทเทรนนิ่ง', value: stats?.workout_days ?? 0, unit: 'วัน', color: '#38bdf8' },
    { icon: '🏃', label: 'คาร์ดิโอ',     value: stats?.cardio_sessions ?? 0, unit: 'เซสชัน', color: '#f97316' },
    { icon: '⛳', label: 'กอล์ฟ',         value: stats?.golf_sessions ?? 0, unit: 'ครั้ง', color: '#22c55e' },
    { icon: '📚', label: 'เรียน',         value: stats?.study_hours ?? 0, unit: 'ชม.', color: '#a855f7' },
    { icon: '🧘', label: 'ยืดเหยียด',    value: stats?.stretch_days ?? 0, unit: 'วัน', color: '#ec4899' },
  ]

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{getGreeting()}</h1>
        <p className="page-subtitle">
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: th })} • สัปดาห์นี้เป็นยังไงบ้างคะ?
        </p>
      </div>

      {/* Streak Banner */}
      <div className="streak-banner" style={{ marginBottom: 24 }}>
        <div className="streak-fire">🔥</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="streak-number">{streak}</span>
            <span style={{ color: 'var(--text-2)', fontWeight: 600, fontSize: 16 }}>วัน</span>
          </div>
          <div className="streak-label">Workout Streak ติดต่อกัน</div>
          {streak === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>เริ่มวันนี้เป็นวันแรกได้เลยค่ะ! 💪</div>}
          {streak >= 7  && <div style={{ fontSize: 12, color: '#f97316', marginTop: 4 }}>🏆 ยอดเยี่ยมมากค่ะ!</div>}
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>สัปดาห์นี้</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{stats?.workout_days ?? 0}/7 วัน</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        {statCards.map(c => (
          <div key={c.label} className="stat-card" style={{ '--cat-color': c.color }}>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label} • {c.unit}สัปดาห์นี้</div>
          </div>
        ))}
      </div>

      {/* Weekly Chart */}
      <div className="chart-card">
        <div className="chart-title">📈 กิจกรรม 7 วันที่ผ่านมา</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={8} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={20} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="เวท"    fill="#38bdf8" radius={4} />
            <Bar dataKey="คาร์ดิโอ" fill="#f97316" radius={4} />
            <Bar dataKey="กอล์ฟ"  fill="#22c55e" radius={4} />
            <Bar dataKey="เรียน"  fill="#a855f7" radius={4} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          {[['เวท','#38bdf8'],['คาร์ดิโอ','#f97316'],['กอล์ฟ','#22c55e'],['เรียน','#a855f7']].map(([l,c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
        <button id="quick-log-btn" className="btn btn-primary btn-lg" onClick={() => navigate('/log')}>
          ➕ บันทึกเลย
        </button>
        <button id="view-analytics-btn" className="btn btn-secondary btn-lg" onClick={() => navigate('/analytics')}>
          📊 ดูกราฟ
        </button>
      </div>
    </div>
  )
}
