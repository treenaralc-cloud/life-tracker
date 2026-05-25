import { useEffect, useState } from 'react'
import { getAllLogs } from '../utils/db'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'

const CAT_META = {
  workout: { icon: '🏋️', label: 'เวทเทรนนิ่ง', color: '#38bdf8' },
  cardio:  { icon: '🏃', label: 'คาร์ดิโอ',     color: '#f97316' },
  golf:    { icon: '⛳', label: 'กอล์ฟ',         color: '#22c55e' },
  study:   { icon: '📚', label: 'เรียน',         color: '#a855f7' },
  stretch: { icon: '🧘', label: 'ยืดเหยียด',    color: '#ec4899' },
  sleep:   { icon: '😴', label: 'การนอน',        color: '#6366f1' },
  body:    { icon: '⚖️', label: 'น้ำหนัก',       color: '#eab308' },
}

const ALL_TABS = ['ทั้งหมด', 'เวทเทรนนิ่ง', 'คาร์ดิโอ', 'กอล์ฟ', 'เรียน', 'ยืดเหยียด', 'การนอน', 'น้ำหนัก']
const TAB_TO_TYPE = { 'ทั้งหมด': null, 'เวทเทรนนิ่ง': 'workout', 'คาร์ดิโอ': 'cardio', 'กอล์ฟ': 'golf', 'เรียน': 'study', 'ยืดเหยียด': 'stretch', 'การนอน': 'sleep', 'น้ำหนัก': 'body' }

function getSummary(log) {
  switch (log._type) {
    case 'workout': {
      const exCount = log.workout_exercises?.length || 0
      return exCount > 0
        ? `${exCount} ท่า • ${log.workout_exercises.map(e => e.exercise_name).slice(0,3).join(', ')}${exCount > 3 ? '...' : ''}`
        : 'บันทึกเซสชันเวท'
    }
    case 'cardio':
      return `${log.type} • ${log.duration_minutes} นาที${log.distance_km ? ` • ${log.distance_km} km` : ''}${log.calories ? ` • ${log.calories} kcal` : ''}`
    case 'golf':
      return `${log.session_type}${log.location ? ` • ${log.location}` : ''}${log.duration_minutes ? ` • ${log.duration_minutes} นาที` : ''}`
    case 'study':
      return `${log.subject} • ${log.duration_minutes} นาที • ${log.source}`
    case 'stretch':
      return `${log.type} • ${log.duration_minutes} นาที${log.muscle_groups?.length ? ` • ${log.muscle_groups.join(', ')}` : ''}`
    case 'sleep':
      return `${log.duration_hours} ชม. • ${log.sleep_time?.slice(0,5)} → ${log.wake_time?.slice(0,5)}${log.quality ? ` • ${'⭐'.repeat(log.quality)}` : ''}`
    case 'body':
      return [log.weight_kg && `${log.weight_kg} kg`, log.body_fat_percent && `${log.body_fat_percent}%ไขมัน`, log.waist_cm && `เอว ${log.waist_cm} cm`].filter(Boolean).join(' • ')
    default: return ''
  }
}

export default function HistoryPage() {
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState('ทั้งหมด')

  useEffect(() => { loadLogs() }, [])

  async function loadLogs() {
    try {
      const data = await getAllLogs(100)
      setLogs(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const filtered = TAB_TO_TYPE[tab]
    ? logs.filter(l => l._type === TAB_TO_TYPE[tab])
    : logs

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">📋 ประวัติกิจกรรม</h1>
        <p className="page-subtitle">บันทึกทั้งหมด 100 รายการล่าสุด</p>
      </div>

      <div className="tabs" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {ALL_TABS.map(t => (
          <button key={t} id={`tab-${t}`} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ minWidth: 'fit-content' }}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">ยังไม่มีข้อมูลค่ะ</div>
          <div className="empty-body">เริ่มบันทึกกิจกรรมแรกได้เลยนะคะ!</div>
        </div>
      ) : (
        <div className="timeline">
          {filtered.map((log, i) => {
            const meta = CAT_META[log._type] || {}
            const summary = getSummary(log)
            return (
              <div key={log.id || i} id={`history-item-${i}`} className="timeline-item animate-in" style={{ '--cat-color': meta.color, animationDelay: `${i * 0.03}s` }}>
                <div className="timeline-icon">{meta.icon}</div>
                <div className="timeline-body">
                  <div className="timeline-title">{meta.label}</div>
                  {summary && (
                    <div className="timeline-meta">
                      <span>{summary}</span>
                    </div>
                  )}
                  {log.notes && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, fontStyle: 'italic' }}>"{log.notes}"</div>}
                </div>
                <div className="timeline-date">
                  {format(parseISO(log.date), 'd MMM', { locale: th })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
