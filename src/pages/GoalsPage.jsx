import { useEffect, useState } from 'react'
import { getOrCreateWeeklyGoal, updateWeeklyGoal, getWeeklyStats } from '../utils/db'
import { format, startOfWeek } from 'date-fns'
import { th } from 'date-fns/locale'

const GOAL_ITEMS = [
  { key: 'workout_days_target',    icon: '🏋️', label: 'เวทเทรนนิ่ง', unit: 'วัน/สัปดาห์', statKey: 'workout_days',    color: '#38bdf8', max: 7 },
  { key: 'cardio_sessions_target', icon: '🏃', label: 'คาร์ดิโอ',     unit: 'ครั้ง/สัปดาห์', statKey: 'cardio_sessions', color: '#f97316', max: 14 },
  { key: 'golf_sessions_target',   icon: '⛳', label: 'กอล์ฟ',         unit: 'ครั้ง/สัปดาห์', statKey: 'golf_sessions',   color: '#22c55e', max: 7 },
  { key: 'study_hours_target',     icon: '📚', label: 'เรียน',         unit: 'ชม./สัปดาห์', statKey: 'study_hours',     color: '#a855f7', max: 40 },
  { key: 'stretch_days_target',    icon: '🧘', label: 'ยืดเหยียด',    unit: 'วัน/สัปดาห์', statKey: 'stretch_days',    color: '#ec4899', max: 7 },
]

export default function GoalsPage() {
  const [goal, setGoal]   = useState(null)
  const [stats, setStats] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'd MMM', { locale: th })
  const weekEnd   = format(new Date(startOfWeek(new Date(), { weekStartsOn: 1 }).getTime() + 6 * 86400000), 'd MMM yyyy', { locale: th })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [g, s] = await Promise.all([getOrCreateWeeklyGoal(), getWeeklyStats()])
      setGoal(g); setStats(s); setDraft({ ...g })
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await updateWeeklyGoal(goal.id, {
        workout_days_target:    parseInt(draft.workout_days_target) || 4,
        cardio_sessions_target: parseInt(draft.cardio_sessions_target) || 3,
        golf_sessions_target:   parseInt(draft.golf_sessions_target) || 2,
        study_hours_target:     parseFloat(draft.study_hours_target) || 5,
        stretch_days_target:    parseInt(draft.stretch_days_target) || 5,
      })
      setGoal(updated); setEditing(false)
      setSuccess('บันทึกเป้าหมายเรียบร้อยค่ะ! 🎯')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  function getProgress(item) {
    const current = stats?.[item.statKey] ?? 0
    const target  = goal?.[item.key] ?? 1
    return { current, target, pct: Math.min(100, Math.round(current / target * 100)) }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">🎯 เป้าหมายสัปดาห์นี้</h1>
        <p className="page-subtitle">{weekStart} — {weekEnd}</p>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        {!editing ? (
          <button id="edit-goals-btn" className="btn btn-secondary" onClick={() => { setEditing(true); setDraft({ ...goal }) }}>
            ✏️ แก้ไขเป้าหมาย
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button id="cancel-edit-btn" className="btn btn-secondary" onClick={() => setEditing(false)}>ยกเลิก</button>
            <button id="save-goals-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ บันทึก...' : '💾 บันทึกเป้าหมาย'}
            </button>
          </div>
        )}
      </div>

      {GOAL_ITEMS.map(item => {
        const { current, target, pct } = getProgress(item)
        const done = pct >= 100
        return (
          <div key={item.key} className="goal-card" style={{ '--cat-color': item.color }}>
            <div className="goal-header">
              <div className="goal-title">
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ color: item.color }}>{item.label}</span>
                {done && <span style={{ fontSize: 16 }}>✅</span>}
              </div>
              {editing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-3)' }}>เป้า:</label>
                  <input
                    id={`goal-input-${item.key}`}
                    className="form-input"
                    type="number"
                    min="0"
                    max={item.max}
                    step={item.key === 'study_hours_target' ? 0.5 : 1}
                    value={draft[item.key] ?? ''}
                    onChange={e => setDraft(p => ({ ...p, [item.key]: e.target.value }))}
                    style={{ width: 70, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{item.unit}</span>
                </div>
              ) : (
                <div className="goal-numbers">
                  <span style={{ color: item.color, fontWeight: 700, fontSize: 18 }}>{current}</span>
                  <span style={{ color: 'var(--text-3)' }}> / {target} {item.unit}</span>
                </div>
              )}
            </div>
            {!editing && (
              <>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, '--cat-color': item.color }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
                  <span>{pct}% สำเร็จ</span>
                  <span>{done ? '🎉 ครบเป้าแล้ว!' : `เหลืออีก ${Math.max(0, target - current)} ${item.unit}`}</span>
                </div>
              </>
            )}
          </div>
        )
      })}

      {/* Achievement */}
      {!editing && stats && (
        <div className="card" style={{ marginTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 12, fontWeight: 600 }}>🏆 สัปดาห์นี้</div>
          <div style={{ fontSize: 36 }}>
            {GOAL_ITEMS.filter(item => getProgress(item).pct >= 100).length === GOAL_ITEMS.length
              ? '🎖️'
              : GOAL_ITEMS.filter(item => getProgress(item).pct >= 100).length >= 3
              ? '🥈'
              : '💪'}
          </div>
          <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 8 }}>
            ทำสำเร็จ {GOAL_ITEMS.filter(item => getProgress(item).pct >= 100).length} / {GOAL_ITEMS.length} เป้าหมาย
          </div>
        </div>
      )}
    </div>
  )
}
