import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getWeeklyStats, getStreak, getWorkoutSessions, getCardioLogs, getGolfLogs, getStudyLogs, getRoutines, getScheduleLogs, getOneOffTasksByDateRange, updateOneOffTaskStatus } from '../utils/db'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import QuickLogModal from '../components/QuickLogModal'

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
  const [agendaTasks, setAgendaTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      const todayDayOfWeek = new Date().getDay()

      const [s, str, workouts, cardio, golf, study, fetchedRoutines, fetchedLogs, fetchedOneOff] = await Promise.all([
        getWeeklyStats(),
        getStreak(),
        getWorkoutSessions(7),
        getCardioLogs(7),
        getGolfLogs(7),
        getStudyLogs(7),
        getRoutines(),
        getScheduleLogs(todayStr, todayStr),
        getOneOffTasksByDateRange(todayStr, todayStr)
      ])
      setStats(s)
      setStreak(str)

      // Build Agenda Tasks
      const scheduled = fetchedRoutines.filter(r => {
        if (!r.is_active) return false
        if (!r.days_of_week.includes(todayDayOfWeek)) return false
        if (r.date_start && todayStr < r.date_start) return false
        if (r.date_end && todayStr > r.date_end) return false
        return true
      }).map(r => ({
        type: 'routine',
        routine: r,
        log: fetchedLogs.find(l => l.routine_id === r.id && l.scheduled_date === todayStr) || null,
        dateStr: todayStr
      }))

      const mappedOneOff = (fetchedOneOff || []).map(t => ({
        type: 'one_off',
        task: t,
      }))

      setAgendaTasks([...mappedOneOff, ...scheduled])

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

      {/* Today's Agenda */}
      <div className="agenda-section" style={{ marginBottom: 24, background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            📌 ต้องทำวันนี้ (Agenda)
          </h2>
        </div>

        <form 
          onSubmit={async (e) => {
            e.preventDefault()
            const title = e.target.elements.taskTitle.value.trim()
            if (!title) return
            e.target.elements.taskTitle.value = ''
            await import('../utils/db').then(m => m.addOneOffTask({ title, task_date: format(new Date(), 'yyyy-MM-dd') }))
            loadData()
          }}
          style={{ display: 'flex', gap: 8, marginBottom: 16 }}
        >
          <input 
            name="taskTitle"
            className="form-input" 
            placeholder="เพิ่มงานพิเศษวันนี้ เช่น ไปหาหมอ..." 
            style={{ flex: 1, padding: '8px 12px', fontSize: 14 }}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>+</button>
        </form>

        {agendaTasks.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 14 }}>วันนี้ไม่มีตารางกิจกรรมพักผ่อนได้เต็มที่เลยค่ะ! 🌸</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agendaTasks.map((item, idx) => {
              if (item.type === 'routine') {
                const isDone = item.log?.status === 'done'
                return (
                  <div key={idx} 
                    onClick={() => setSelectedTask(item)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', padding: 12, borderRadius: 8, cursor: 'pointer',
                      opacity: isDone ? 0.6 : 1, borderLeft: `4px solid ${item.routine.color || 'blue'}`
                    }}>
                    <div style={{ fontSize: 20 }}>{CATS.find(c => c.key === item.routine.category)?.icon || '📅'}</div>
                    <div style={{ flex: 1, fontSize: 15, fontWeight: 500, textDecoration: isDone ? 'line-through' : 'none' }}>{item.routine.name}</div>
                    {isDone ? <div style={{ color: '#22c55e' }}>✓ ทำแล้ว</div> : <div style={{ fontSize: 12, color: 'var(--accent)' }}>กดเพื่อบันทึก</div>}
                  </div>
                )
              } else {
                const isDone = item.task.status === 'done'
                return (
                  <div key={idx} 
                    onClick={async () => {
                      const newStatus = isDone ? 'pending' : 'done'
                      await updateOneOffTaskStatus(item.task.id, newStatus)
                      loadData()
                    }}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', padding: 12, borderRadius: 8, cursor: 'pointer',
                      opacity: isDone ? 0.6 : 1, borderLeft: `4px solid #a855f7`
                    }}>
                    <div style={{ fontSize: 20 }}>📝</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, textDecoration: isDone ? 'line-through' : 'none' }}>{item.task.title}</div>
                      {item.task.task_time && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>⏰ {item.task.task_time.substring(0,5)}</div>}
                    </div>
                    {isDone ? <div style={{ color: '#22c55e', fontSize: 14 }}>✓ ทำแล้ว</div> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border-md)' }} />}
                  </div>
                )
              }
            })}
          </div>
        )}
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

      {selectedTask && (
        <QuickLogModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            loadData()
            setSelectedTask(null)
          }}
        />
      )}
    </div>
  )
}
