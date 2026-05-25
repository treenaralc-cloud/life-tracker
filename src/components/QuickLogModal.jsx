import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateScheduleLogStatus } from '../utils/db'

export default function QuickLogModal({ task, onClose, onUpdate }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState(task.log?.quick_note || '')

  const handleUpdateStatus = async (status) => {
    setLoading(true)
    try {
      // If no log exists for this date, the backend RPC or a check would insert it.
      // Wait, updateScheduleLogStatus expects an ID! If there's no log, we need to create it!
      // Let's create an upsert function in db.js or handle it here.
      
      // Let's handle it by importing supabase and doing an upsert here for simplicity,
      // or we can adjust updateScheduleLogStatus.
      
      const { supabase } = await import('../utils/supabase')
      const { data: { user } } = await supabase.auth.getUser()
      
      const { addXp } = await import('../utils/db')
      
      if (task.log?.id) {
        await updateScheduleLogStatus(task.log.id, status, note)
        if (task.log.status === 'done' && status !== 'done') {
          await addXp(-50)
        } else if (task.log.status !== 'done' && status === 'done') {
          const { leveledUp, newLevel } = await addXp(50)
          if (leveledUp) alert(`🎉 ยินดีด้วยบอส! เลเวลอัปเป็นระดับ ${newLevel} แล้ว!`)
        }
      } else {
        await supabase.from('schedule_logs').insert({
          user_id: user.id,
          routine_id: task.routine.id,
          scheduled_date: task.dateStr,
          status,
          quick_note: note,
          completed_at: status === 'done' ? new Date().toISOString() : null
        })
        if (status === 'done') {
          const { leveledUp, newLevel } = await addXp(50)
          if (leveledUp) alert(`🎉 ยินดีด้วยบอส! เลเวลอัปเป็นระดับ ${newLevel} แล้ว!`)
        }
      }
      
      onUpdate()
    } catch (err) {
      console.error(err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLog = async () => {
    if (!task.log?.id) return
    if (!window.confirm('ยกเลิกบันทึกกิจกรรมนี้ใช่ไหม?')) return
    setLoading(true)
    try {
      const { deleteScheduleLog, addXp } = await import('../utils/db')
      await deleteScheduleLog(task.log.id)
      if (task.log.status === 'done') {
        await addXp(-50)
      }
      onUpdate()
    } catch (err) {
      console.error(err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFullLog = () => {
    // Navigate to LogPage with pre-filled state
    navigate('/log', { state: { routine: task.routine, dateStr: task.dateStr } })
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        background: 'var(--bg-surface)', padding: 24, borderRadius: 'var(--radius)',
        width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{task.routine.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 24, cursor: 'pointer' }}>✕</button>
        </div>
        
        <p style={{ color: 'var(--text-2)', marginBottom: 20 }}>
          วันที่: {task.dateStr}
        </p>

        <div className="form-group">
          <label className="form-label">โน้ตย่อ (ถ้ามี)</label>
          <input className="form-input" placeholder="เช่น รู้สึกเหนื่อย, วันนี้ฟอร์มดี" value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, background: '#22c55e' }}
            onClick={() => handleUpdateStatus('done')}
            disabled={loading}
          >
            ✅ ทำแล้ว (ติ๊กเร็ว)
          </button>
          <button 
            className="btn btn-danger" 
            style={{ flex: 1 }}
            onClick={() => handleUpdateStatus('skipped')}
            disabled={loading}
          >
            ⏭️ ข้าม
          </button>
        </div>

        <hr style={{ borderColor: 'var(--border-md)', margin: '16px 0' }} />

          <button 
            className="btn btn-secondary btn-full"
            onClick={handleFullLog}
            style={{ marginBottom: 8 }}
          >
            📄 กรอกแบบละเอียด (บันทึกข้อมูล)
          </button>

          {task.log?.id && (
            <button 
              className="btn btn-ghost btn-full"
              style={{ color: '#ef4444' }}
              onClick={handleDeleteLog}
              disabled={loading}
            >
              🗑️ ยกเลิกบันทึก (รีเซ็ต)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
