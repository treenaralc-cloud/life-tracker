import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getWeeklyStats, getStreak, getWorkoutSessions, getCardioLogs, getGolfLogs, getStudyLogs, getRoutines, getScheduleLogs, getOneOffTasksByDateRange, updateOneOffTaskStatus, getIcalUrl, fetchCalendarEvents, getGamificationStats, addXp } from '../utils/db'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays } from 'date-fns'
import { th } from 'date-fns/locale'
import QuickLogModal from '../components/QuickLogModal'
import AddEventModal from '../components/AddEventModal'
import SettingsModal from '../components/SettingsModal'

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
  const [gameStats, setGameStats] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [agendaTasks, setAgendaTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [selectedDate])

  async function loadData() {
    try {
      const selectedStr = format(selectedDate, 'yyyy-MM-dd')
      const selectedDayOfWeek = selectedDate.getDay()

      const [s, str, workouts, cardio, golf, study, fetchedRoutines, fetchedLogs, fetchedOneOff, icalUrl, gStats] = await Promise.all([
        getWeeklyStats(),
        getStreak(),
        getWorkoutSessions(7),
        getCardioLogs(7),
        getGolfLogs(7),
        getStudyLogs(7),
        getRoutines(),
        getScheduleLogs(selectedStr, selectedStr),
        getOneOffTasksByDateRange(selectedStr, selectedStr),
        getIcalUrl(),
        getGamificationStats()
      ])
      
      const calEvents = await fetchCalendarEvents(icalUrl, selectedStr, selectedStr)
      
      setStats(s)
      setStreak(str)
      setGameStats(gStats)

      // Build Agenda Tasks
      const scheduled = fetchedRoutines.filter(r => {
        if (!r.is_active) return false
        if (!r.days_of_week.includes(selectedDayOfWeek)) return false
        if (r.date_start && selectedStr < r.date_start) return false
        if (r.date_end && selectedStr > r.date_end) return false
        return true
      }).map(r => ({
        type: 'routine',
        routine: r,
        log: fetchedLogs.find(l => l.routine_id === r.id && l.scheduled_date === selectedStr) || null,
        dateStr: selectedStr
      }))

      const mappedOneOff = (fetchedOneOff || []).map(t => ({
        type: 'one_off',
        task: t,
      }))

      const mappedCal = calEvents.map(e => ({
        type: 'calendar',
        event: e
      }))

      setAgendaTasks([...mappedCal, ...mappedOneOff, ...scheduled])

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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">{getGreeting()}</h1>
          <p className="page-subtitle">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: th })} • สัปดาห์นี้เป็นยังไงบ้างคะ?
          </p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 24, padding: 8 }} onClick={() => setShowSettingsModal(true)}>⚙️</button>
      </div>

      {/* Today's Agenda */}
      <div className="agenda-section" style={{ marginBottom: 24, background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border-md)' }}>
        
        {/* Horizontal Date Selector */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid var(--border-md)' }}>
          {(() => {
            // Generate dates for current week
            const start = startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
            const dates = eachDayOfInterval({ start, end: addDays(start, 6) })
            return dates.map((date, idx) => {
              const isSelected = isSameDay(date, selectedDate)
              const isToday = isSameDay(date, new Date())
              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    minWidth: 50, padding: '8px 4px', textAlign: 'center', borderRadius: 12, cursor: 'pointer', flexShrink: 0,
                    background: isSelected ? 'var(--accent)' : isToday ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--text-2)'
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{format(date, 'EEE', { locale: th })}</div>
                  <div style={{ fontSize: 16, fontWeight: isSelected || isToday ? 'bold' : 'normal' }}>{format(date, 'd')}</div>
                </div>
              )
            })
          })()}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            📌 ต้องทำวันที่ {format(selectedDate, 'd MMM', { locale: th })}
          </h2>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => setShowAddModal(true)}
            style={{ borderRadius: 20 }}
          >
            + เพิ่มงาน/นัดหมาย
          </button>
        </div>

        {agendaTasks.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 14 }}>ไม่มีตารางกิจกรรมพักผ่อนได้เต็มที่เลยค่ะ! 🌸</div>
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
              } else if (item.type === 'calendar') {
                return (
                  <div key={idx} 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', padding: 12, borderRadius: 8,
                      borderLeft: `4px solid #3b82f6`
                    }}>
                    <div style={{ fontSize: 20 }}>🗓️</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{item.event.title}</div>
                      {!item.event.isAllDay && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>⏰ {format(new Date(item.event.start), 'HH:mm')} - {format(new Date(item.event.end), 'HH:mm')}</div>}
                      {item.event.isAllDay && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>⏰ ตลอดวัน</div>}
                    </div>
                  </div>
                )
              } else {
                const isDone = item.task.status === 'done'
                return (
                  <div key={idx} 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', padding: 12, borderRadius: 8, cursor: 'pointer',
                      opacity: isDone ? 0.6 : 1, borderLeft: `4px solid #a855f7`
                    }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }} onClick={async () => {
                      const newStatus = isDone ? 'pending' : 'done'
                      await updateOneOffTaskStatus(item.task.id, newStatus)
                      if (newStatus === 'done') {
                        const { leveledUp, newLevel } = await addXp(20)
                        if (leveledUp) alert(`🎉 ยินดีด้วยบอส! เลเวลอัปเป็นระดับ ${newLevel} แล้ว!`)
                      } else {
                        await addXp(-20)
                      }
                      loadData()
                    }}>
                      <div style={{ fontSize: 20 }}>📝</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, textDecoration: isDone ? 'line-through' : 'none' }}>{item.task.title}</div>
                        {item.task.task_time && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>⏰ {item.task.task_time.substring(0,5)}</div>}
                      </div>
                      {isDone ? <div style={{ color: '#22c55e', fontSize: 14 }}>✓ ทำแล้ว</div> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border-md)' }} />}
                    </div>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '4px 8px', color: '#ef4444' }}
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (window.confirm('ลบงานนี้?')) {
                          await deleteOneOffTask(item.task.id)
                          loadData()
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                )
              }
            })}
          </div>
        )}
      </div>

      {/* Gamification Banner */}
      <div className="gamification-banner" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #1e1b4b, #312e81)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid #4f46e5', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 2 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(45deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold', color: '#fff', border: '3px solid #fff' }}>
            {gameStats?.current_level || 1}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
              <div style={{ fontWeight: 'bold', fontSize: 16, color: '#fff' }}>ผู้เล่น: บอส</div>
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>{gameStats?.xp_points || 0} / {((gameStats?.current_level || 1)) * 100} XP</div>
            </div>
            <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${((gameStats?.xp_points || 0) % 100)}%`, height: '100%', background: '#10b981', transition: 'width 0.5s' }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 2 }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>🔥 Streak ปัจจุบัน</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#f59e0b' }}>{streak} วัน</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>🏆 Longest Streak</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#38bdf8' }}>{Math.max(gameStats?.longest_streak || 0, streak)} วัน</div>
          </div>
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

      {showAddModal && (
        <AddEventModal 
          selectedDate={selectedDate}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            loadData()
          }}
        />
      )}

      {showSettingsModal && (
        <SettingsModal 
          onClose={() => setShowSettingsModal(false)}
          onSaved={() => {
            setShowSettingsModal(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
