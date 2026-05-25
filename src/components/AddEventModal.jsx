import { useState } from 'react'
import { format } from 'date-fns'
import { addOneOffTask } from '../utils/db'

export default function AddEventModal({ selectedDate, onClose, onSuccess }) {
  const [title, setTitle] = useState('')
  const [taskDate, setTaskDate] = useState(format(selectedDate || new Date(), 'yyyy-MM-dd'))
  const [taskTime, setTaskTime] = useState('')
  const [isAllDay, setIsAllDay] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('กรุณาระบุชื่องาน')
      return
    }
    setError('')
    setLoading(true)
    try {
      await addOneOffTask({
        title: title.trim(),
        task_date: taskDate,
        task_time: isAllDay ? null : taskTime || null,
        status: 'pending'
      })
      onSuccess()
    } catch (err) {
      console.error(err)
      setError('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal animate-in" style={{ maxWidth: 400, width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>📝 เพิ่มนัดหมาย / งานใหม่</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">ชื่องาน / นัดหมาย *</label>
            <input 
              className="form-input" 
              placeholder="เช่น ไปฉีดวัคซีน, ประชุมทีม..." 
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">วันที่</label>
            <input 
              type="date"
              className="form-input" 
              value={taskDate}
              onChange={e => setTaskDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input 
              type="checkbox" 
              id="allday"
              checked={isAllDay}
              onChange={e => {
                setIsAllDay(e.target.checked)
                if (e.target.checked) setTaskTime('')
              }}
            />
            <label htmlFor="allday" style={{ fontSize: 14, color: 'var(--text-2)' }}>ตลอดทั้งวัน (All Day)</label>
          </div>

          {!isAllDay && (
            <div className="form-group">
              <label className="form-label">เวลา (ไม่บังคับ)</label>
              <input 
                type="time"
                className="form-input" 
                value={taskTime}
                onChange={e => setTaskTime(e.target.value)}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
