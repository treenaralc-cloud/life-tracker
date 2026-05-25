import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getWeeklyStats, getStreak, getRoutines, getScheduleLogs, getOneOffTasksByDateRange, updateOneOffTaskStatus, deleteOneOffTask, getIcalUrl, fetchCalendarEvents, getGamificationStats, addXp, insertScheduleLog, deleteScheduleLog, updateScheduleLogStatus } from '../utils/db'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, startOfMonth, endOfMonth, parseISO, isAfter, isBefore } from 'date-fns'
import { th } from 'date-fns/locale'
import AddEventModal from '../components/AddEventModal'
import SettingsModal from '../components/SettingsModal'

const CATS = [
  { key: 'workout', icon: '🏋️', label: 'เวทเทรนนิ่ง', color: '#38bdf8', category: 'Health' },
  { key: 'cardio',  icon: '🏃', label: 'คาร์ดิโอ',     color: '#f97316', category: 'Health' },
  { key: 'golf',    icon: '⛳', label: 'กอล์ฟ',         color: '#22c55e', category: 'Health' },
  { key: 'study',   icon: '📚', label: 'เรียน',          color: '#a855f7', category: 'Work&Learn' },
  { key: 'stretch', icon: '🧘', label: 'ยืดเหยียด',     color: '#ec4899', category: 'Health' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '🌤️ อรุณสวัสดิ์ครับบอส!'
  if (h < 17) return '☀️ สวัสดีตอนบ่ายครับบอส!'
  if (h < 21) return '🌆 สวัสดีตอนเย็นครับบอส!'
  return '🌙 สวัสดีตอนค่ำครับบอส!'
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('today') // 'today' | 'tracker'
  const [filter, setFilter] = useState('All') // 'All' | 'Health' | 'Work&Learn'
  
  const [stats, setStats] = useState(null)
  const [streak, setStreak] = useState(0)
  const [gameStats, setGameStats] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [agendaTasks, setAgendaTasks] = useState([])
  
  // Tracker Data
  const [routines, setRoutines] = useState([])
  const [monthlyLogs, setMonthlyLogs] = useState([])
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedTaskAction, setSelectedTaskAction] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { loadData() }, [selectedDate])

  async function loadData() {
    setLoading(true)
    try {
      const selectedStr = format(selectedDate, 'yyyy-MM-dd')
      const selectedDayOfWeek = selectedDate.getDay()

      // Fetch year logs for Tracker view and Weekly Stats
      const today = new Date()
      const yearStart = new Date(today)
      yearStart.setDate(yearStart.getDate() - 365)
      const yearStartStr = format(yearStart, 'yyyy-MM-dd')
      const yearEndStr = format(today, 'yyyy-MM-dd')

      const [s, str, fetchedRoutines, dailyOneOff, icalUrl, gStats, fetchedYearlyLogs] = await Promise.all([
        getWeeklyStats(),
        getStreak(),
        getRoutines(),
        getOneOffTasksByDateRange(selectedStr, selectedStr),
        getIcalUrl(),
        getGamificationStats(),
        getScheduleLogs(yearStartStr, yearEndStr)
      ])
      
      const calEvents = await fetchCalendarEvents(icalUrl, selectedStr, selectedStr)
      
      setStats(s)
      setStreak(str)
      setGameStats(gStats)
      setRoutines(fetchedRoutines)
      setMonthlyLogs(fetchedYearlyLogs || [])

      // Find logs specifically for selected date
      const dailyLogs = (fetchedYearlyLogs || []).filter(l => l.scheduled_date === selectedStr)

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
        log: dailyLogs.find(l => l.routine_id === r.id) || null,
        dateStr: selectedStr,
        catMeta: CATS.find(c => c.key === r.category)
      }))

      const mappedOneOff = (dailyOneOff || []).map(t => ({
        type: 'one_off',
        task: t,
      }))

      const mappedCal = calEvents.map(e => ({
        type: 'calendar',
        event: e
      }))

      // Sort routines by ID (or whatever order) and combine
      setAgendaTasks([...mappedCal, ...mappedOneOff, ...scheduled])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleItem(item) {
    if (item.type === 'routine') {
      const isDone = item.log?.status === 'done'
      const newStatus = isDone ? 'pending' : 'done'
      
      if (item.log?.id) {
        if (newStatus === 'pending') {
          // Delete or change status? Deleting is cleaner to revert XP.
          await deleteScheduleLog(item.log.id)
          await addXp(-50)
        } else {
          await updateScheduleLogStatus(item.log.id, newStatus)
          await addXp(50)
        }
      } else {
        await insertScheduleLog(item.routine.id, item.dateStr, newStatus)
        await addXp(50)
      }
      loadData()
    } else if (item.type === 'one_off') {
      const isDone = item.task.status === 'done'
      const newStatus = isDone ? 'pending' : 'done'
      await updateOneOffTaskStatus(item.task.id, newStatus)
      if (newStatus === 'done') {
        await addXp(20)
      } else {
        await addXp(-20)
      }
      loadData()
    }
  }

  function renderAgenda() {
    let filteredTasks = agendaTasks
    if (filter === 'Health') {
      filteredTasks = agendaTasks.filter(t => t.type === 'routine' && t.catMeta?.category === 'Health')
    } else if (filter === 'Work&Learn') {
      filteredTasks = agendaTasks.filter(t => t.type === 'routine' && t.catMeta?.category === 'Work&Learn')
    }

    if (filteredTasks.length === 0) {
      return <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>ไม่มีกิจกรรมในหมวดหมู่นี้ค่ะ 🌸</div>
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredTasks.map((item, idx) => {
          if (item.type === 'calendar') {
            return (
              <div key={idx} style={{ 
                display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', 
                padding: '16px', borderRadius: 24, gap: 16, borderLeft: `6px solid #3b82f6`
              }}>
                <div style={{ fontSize: 28 }}>🗓️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{item.event.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                    {item.event.isAllDay ? 'ตลอดวัน' : `${format(new Date(item.event.start), 'HH:mm')} - ${format(new Date(item.event.end), 'HH:mm')}`}
                  </div>
                </div>
              </div>
            )
          }

          let title, subtitle, icon, isDone, color
          if (item.type === 'routine') {
            title = item.routine.name
            subtitle = item.catMeta?.label
            icon = item.catMeta?.icon || '📅'
            isDone = item.log?.status === 'done'
            color = item.routine.color || item.catMeta?.color || 'var(--accent)'
          } else {
            title = item.task.title
            subtitle = item.task.task_time ? `⏰ ${item.task.task_time.substring(0,5)}` : 'งานทั่วไป'
            icon = '📝'
            isDone = item.task.status === 'done'
            color = '#a855f7'
          }

          return (
            <div key={idx} 
              onClick={() => {
                if (isDone) {
                  // Immediate revert
                  handleToggleItem(item)
                } else {
                  setSelectedTaskAction(item)
                }
              }}
              style={{ 
              display: 'flex', alignItems: 'center', background: isDone ? 'rgba(255,255,255,0.03)' : 'var(--bg-surface)', 
              padding: '16px', borderRadius: 24, gap: 16, transition: 'all 0.2s', cursor: 'pointer',
              borderLeft: `6px solid ${isDone ? 'var(--text-4)' : color}`,
              opacity: isDone ? 0.6 : 1
            }}>
              <div style={{ fontSize: 28, opacity: isDone ? 0.5 : 1 }}>{icon}</div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#94a3b8' : '#fff' }}>
                  {title}
                </div>
                {subtitle && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isDone ? (
                  <div style={{ fontSize: 24, color: '#94a3b8' }}>✅</div>
                ) : (
                  <div style={{ 
                      width: 24, height: 24, borderRadius: '50%', border: '2px solid #94a3b8' 
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function generateHeatmap(routine, allLogs) {
    const weeks = []
    const today = new Date()
    today.setHours(0,0,0,0)
    
    // Backtrack 52 weeks (364 days).
    const startDay = new Date(today)
    startDay.setDate(startDay.getDate() - 363)
    
    for (let w = 0; w < 52; w++) {
      const weekDays = []
      for (let d = 0; d < 7; d++) {
         const date = new Date(startDay)
         date.setDate(date.getDate() + (w * 7) + d)
         
         const dStr = format(date, 'yyyy-MM-dd')
         const log = allLogs.find(l => l.routine_id === routine.id && l.scheduled_date === dStr && l.status === 'done')
         
         weekDays.push({
           date: date,
           isDone: !!log,
           isActiveDay: routine.days_of_week.includes(date.getDay())
         })
      }
      weeks.push(weekDays)
    }
    
    // Calculate stats
    const totalDone = allLogs.filter(l => l.routine_id === routine.id && l.status === 'done').length
    const totalActiveDays = weeks.flat().filter(d => d.isActiveDay && d.date <= today).length
    const percent = totalActiveDays ? Math.round((totalDone / totalActiveDays) * 100) : 0
    
    // Streak calculation
    let currentStreak = 0
    let streakBroken = false
    const flatDays = weeks.flat().reverse() // Newest to oldest
    
    for (const d of flatDays) {
      if (d.date > today) continue
      if (d.isActiveDay) {
        if (d.isDone) {
          currentStreak++
        } else {
          // If it's today and not done yet, we don't break the streak immediately
          if (format(d.date, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd')) {
            streakBroken = true
            break
          }
        }
      }
    }
    
    return { weeks, totalDone, percent, streak: currentStreak }
  }

  function renderTracker() {
    return (
      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Heatmap Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {routines.map(r => {
             const meta = CATS.find(c => c.key === r.category)
             const { weeks, percent, streak } = generateHeatmap(r, monthlyLogs)
             
             return (
               <div key={r.id} style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                       <span style={{ fontSize: 24 }}>{meta?.icon}</span>
                       <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{r.name}</span>
                     </div>
                     <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 600 }}>
                       <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 16 }}>📈</span> {percent}%
                       </span>
                       <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 16 }}>🔥</span> {streak}d
                       </span>
                     </div>
                  </div>
                  
                  {/* Heatmap Grid */}
                  <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                    {weeks.map((week, wIdx) => (
                      <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                         {week.map((day, dIdx) => (
                           <div key={dIdx} 
                             title={`${format(day.date, 'd MMM yyyy')}${day.isDone ? ' (ทำแล้ว)' : ''}`}
                             style={{ 
                               width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                               background: day.isDone ? (meta?.color || 'var(--accent)') : (day.isActiveDay ? 'rgba(255,255,255,0.05)' : 'transparent'),
                               opacity: day.isDone ? 1 : 0.8
                             }} 
                           />
                         ))}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right', marginTop: 8 }}>
                    ประวัติ 365 วันล่าสุด (สไลด์ดูได้)
                  </div>
               </div>
             )
          })}
        </div>

        {/* Gamification Banner */}
        <div className="gamification-banner" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', padding: 20, borderRadius: 24, position: 'relative', overflow: 'hidden' }}>
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
          </div>
        </div>

      </div>
    )
  }

  return (
    <div className="animate-in" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: '0 0 4px 0' }}>{getGreeting()}</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, margin: 0 }}>
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: th })}
          </p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 24, padding: 8 }} onClick={() => setShowSettingsModal(true)}>⚙️</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: 20, padding: 4, marginBottom: 24 }}>
        <button 
          onClick={() => setActiveTab('today')}
          style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 16, fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'today' ? 'var(--accent)' : 'transparent', color: activeTab === 'today' ? '#fff' : 'var(--text-2)' }}
        >
          รายการวันนี้ (Today)
        </button>
        <button 
          onClick={() => setActiveTab('tracker')}
          style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 16, fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'tracker' ? 'var(--accent)' : 'transparent', color: activeTab === 'tracker' ? '#fff' : 'var(--text-2)' }}
        >
          ตารางภาพรวม (Tracker)
        </button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : activeTab === 'today' ? (
        <div className="animate-in">
          {/* Horizontal Date Selector */}
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, marginBottom: 16 }}>
            {(() => {
              const start = startOfWeek(new Date(), { weekStartsOn: 1 })
              const dates = eachDayOfInterval({ start, end: addDays(start, 6) })
              return dates.map((date, idx) => {
                const isSelected = isSameDay(date, selectedDate)
                const isToday = isSameDay(date, new Date())
                return (
                  <div 
                    key={idx} onClick={() => setSelectedDate(date)}
                    style={{
                      minWidth: 54, padding: '12px 4px', textAlign: 'center', borderRadius: 20, cursor: 'pointer', flexShrink: 0,
                      background: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: isSelected ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                      color: isSelected ? '#fff' : 'var(--text-3)'
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{format(date, 'EEE')}</div>
                    <div style={{ 
                      fontSize: 16, fontWeight: isSelected || isToday ? 'bold' : 'normal',
                      color: isToday ? 'var(--accent)' : 'inherit'
                    }}>
                      {format(date, 'd')}
                    </div>
                  </div>
                )
              })
            })()}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
            {['All', 'Work&Learn', 'Health'].map(f => (
              <button 
                key={f} onClick={() => setFilter(f)}
                style={{
                  padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: filter === f ? 'var(--accent)' : 'var(--bg-surface)',
                  color: filter === f ? '#fff' : '#cbd5e1'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Agenda List */}
          {renderAgenda()}

          <button 
            className="btn btn-primary btn-full" 
            onClick={() => setShowAddModal(true)}
            style={{ borderRadius: 24, marginTop: 24, padding: '16px' }}
          >
            + เพิ่มงาน/นัดหมายใหม่
          </button>
        </div>
      ) : (
        renderTracker()
      )}

      {showAddModal && <AddEventModal onClose={() => setShowAddModal(false)} onAdded={loadData} selectedDate={selectedDate} />}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
      
      {/* Action Modal */}
      {selectedTaskAction && (
        <div className="modal-backdrop" onClick={() => setSelectedTaskAction(null)}>
          <div className="modal-content animate-in" onClick={e => e.stopPropagation()} style={{ padding: 24, borderRadius: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>
                {selectedTaskAction.type === 'routine' ? selectedTaskAction.routine.name : selectedTaskAction.task?.title}
              </h3>
              <button className="btn btn-ghost" onClick={() => setSelectedTaskAction(null)} style={{ color: '#fff', fontSize: 20 }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(() => {
                const isDone = selectedTaskAction.type === 'routine' 
                  ? selectedTaskAction.log?.status === 'done' 
                  : selectedTaskAction.task?.status === 'done';

                // We only show this modal if NOT done, based on new logic.
                // But just in case, we'll keep the revert button logic if it somehow opens when done.
                return (
                  <>
                    {!isDone && (
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '16px', borderRadius: 16, fontSize: 16 }}
                        onClick={() => {
                          handleToggleItem(selectedTaskAction)
                          setSelectedTaskAction(null)
                        }}
                      >
                        ✅ ทำเสร็จแล้ว
                      </button>
                    )}

                    {selectedTaskAction.type === 'routine' && (
                      <button 
                        className="btn btn-ghost" 
                        style={{ padding: '16px', borderRadius: 16, fontSize: 16, background: 'var(--bg-surface)', color: '#fff' }}
                        onClick={() => {
                          navigate('/log', { state: { routine: selectedTaskAction.routine, dateStr: selectedTaskAction.dateStr } })
                        }}
                      >
                        ✏️ ใส่รายละเอียดแบบเต็ม
                      </button>
                    )}
                    
                    {selectedTaskAction.type === 'one_off' && (
                      <button 
                        className="btn btn-ghost" 
                        style={{ padding: '16px', borderRadius: 16, fontSize: 16, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                        onClick={async () => {
                          if (window.confirm('ลบงานนี้ถาวร?')) {
                            await deleteOneOffTask(selectedTaskAction.task.id)
                            loadData()
                            setSelectedTaskAction(null)
                          }
                        }}
                      >
                        🗑️ ลบงาน/กิจกรรมนี้ทิ้ง
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
