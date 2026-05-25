import { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addWeeks, subWeeks, addMonths, subMonths, isSameDay, isSameMonth } from 'date-fns'
import { th } from 'date-fns/locale'
import { getRoutines, getScheduleLogs } from '../utils/db'
import QuickLogModal from '../components/QuickLogModal'

const CATEGORIES = {
  workout: { icon: '🏋️', label: 'เวทเทรนนิ่ง' },
  cardio:  { icon: '🏃', label: 'คาร์ดิโอ' },
  golf:    { icon: '⛳', label: 'กอล์ฟ' },
  study:   { icon: '📚', label: 'เรียน' },
  stretch: { icon: '🧘', label: 'ยืดเหยียด' },
}

export default function SchedulePage() {
  const [view, setView] = useState('weekly') // 'weekly' or 'monthly'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [routines, setRoutines] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null) // For Modal

  useEffect(() => {
    fetchData()
  }, [currentDate, view])

  async function fetchData() {
    setLoading(true)
    try {
      const start = view === 'weekly' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfMonth(currentDate)
      const end = view === 'weekly' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : endOfMonth(currentDate)
      
      const [fetchedRoutines, fetchedLogs] = await Promise.all([
        getRoutines(),
        getScheduleLogs(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
      ])
      
      setRoutines(fetchedRoutines)
      setLogs(fetchedLogs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const navigatePrev = () => {
    setCurrentDate(prev => view === 'weekly' ? subWeeks(prev, 1) : subMonths(prev, 1))
  }
  
  const navigateNext = () => {
    setCurrentDate(prev => view === 'weekly' ? addWeeks(prev, 1) : addMonths(prev, 1))
  }

  // Get tasks for a specific date
  const getTasksForDate = (dateObj) => {
    const dayStr = format(dateObj, 'yyyy-MM-dd')
    const dayOfWeek = dateObj.getDay() // 0-6, 0=Sunday
    
    // 1. Find scheduled routines that match this day
    const scheduled = routines.filter(r => {
      if (!r.is_active) return false
      if (!r.days_of_week.includes(dayOfWeek)) return false
      
      // Check date range if exists
      if (r.date_start && dayStr < r.date_start) return false
      if (r.date_end && dayStr > r.date_end) return false
      
      return true
    })

    // 2. Map them with actual logs if they exist
    return scheduled.map(r => {
      const log = logs.find(l => l.routine_id === r.id && l.scheduled_date === dayStr)
      return {
        routine: r,
        log: log || null,
        dateStr: dayStr
      }
    })
  }

  const renderWeeklyView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 16 }}>
        {days.map((day, i) => {
          const isToday = isSameDay(day, new Date())
          const tasks = getTasksForDate(day)
          
          return (
            <div key={i} style={{ 
              background: 'var(--bg-surface)', 
              borderRadius: 'var(--radius)', 
              padding: 12,
              border: isToday ? '2px solid var(--accent)' : '1px solid var(--border-md)',
              minHeight: 400
            }}>
              <div style={{ textAlign: 'center', marginBottom: 12, borderBottom: '1px solid var(--border-md)', paddingBottom: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                  {format(day, 'EEEE', { locale: th })}
                </div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: isToday ? 'var(--accent)' : 'var(--text-1)' }}>
                  {format(day, 'd')}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 20 }}>ไม่มีรายการ</div>
                ) : tasks.map((task, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedTask(task)}
                    style={{
                      background: 'var(--bg-card)',
                      padding: 10,
                      borderRadius: 8,
                      borderLeft: `4px solid ${task.routine.color || 'blue'}`,
                      cursor: 'pointer',
                      opacity: task.log?.status === 'done' ? 0.6 : 1,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {CATEGORIES[task.routine.category]?.icon}
                      {task.routine.name}
                    </div>
                    {task.log?.status === 'done' && (
                      <div style={{ position: 'absolute', top: 6, right: 6, color: '#22c55e', fontSize: 16 }}>✓</div>
                    )}
                    {task.log?.status === 'skipped' && (
                      <div style={{ position: 'absolute', top: 6, right: 6, color: '#ef4444', fontSize: 16 }}>✕</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderMonthlyView = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })

    return (
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4, textAlign: 'center', fontWeight: 'bold', fontSize: 14 }}>
          {['จ','อ','พ','พฤ','ศ','ส','อา'].map(d => <div key={d} style={{ color: 'var(--text-3)' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {days.map((day, i) => {
            const isToday = isSameDay(day, new Date())
            const isCurrentMonth = isSameMonth(day, currentDate)
            const tasks = getTasksForDate(day)
            
            return (
              <div key={i} style={{ 
                background: isCurrentMonth ? 'var(--bg-surface)' : 'rgba(0,0,0,0.2)', 
                borderRadius: 8, 
                padding: '8px 4px',
                border: isToday ? '1px solid var(--accent)' : '1px solid var(--border-md)',
                minHeight: 80,
                opacity: isCurrentMonth ? 1 : 0.5
              }}>
                <div style={{ textAlign: 'center', fontSize: 14, fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'var(--accent)' : 'var(--text-2)' }}>
                  {format(day, 'd')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', marginTop: 4 }}>
                  {tasks.map((task, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setSelectedTask(task)}
                      title={task.routine.name}
                      style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: task.routine.color || 'blue',
                        cursor: 'pointer',
                        opacity: task.log?.status === 'done' ? 0.3 : 1
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const periodLabel = view === 'weekly' 
    ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: th })}`
    : format(currentDate, 'MMMM yyyy', { locale: th })

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">📅 ตารางกิจกรรม</h1>
          <p className="page-subtitle">ดูแผนและบันทึกกิจกรรมรายวัน</p>
        </div>
        
        <div style={{ display: 'flex', gap: 8, background: 'var(--bg-surface)', padding: 4, borderRadius: 'var(--radius)' }}>
          <button 
            className={`btn btn-sm ${view === 'weekly' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setView('weekly')}
          >รายสัปดาห์</button>
          <button 
            className={`btn btn-sm ${view === 'monthly' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setView('monthly')}
          >รายเดือน</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: 'var(--bg-surface)', padding: '12px 24px', borderRadius: 'var(--radius)' }}>
        <button className="btn btn-secondary" onClick={navigatePrev}>← ก่อนหน้า</button>
        <h2 style={{ margin: 0, fontSize: 18 }}>{periodLabel}</h2>
        <button className="btn btn-secondary" onClick={navigateNext}>ถัดไป →</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner"></div></div>
      ) : view === 'weekly' ? renderWeeklyView() : renderMonthlyView()}

      {selectedTask && (
        <QuickLogModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            fetchData()
            setSelectedTask(null)
          }}
        />
      )}
    </div>
  )
}
