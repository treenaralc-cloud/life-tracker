import { useState, useEffect } from 'react'
import { getIcalUrl, saveIcalUrl } from '../utils/db'

export default function SettingsModal({ onClose, onSaved }) {
  const [icalUrl, setIcalUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    getIcalUrl().then(url => {
      setIcalUrl(url || '')
      setLoading(false)
    })
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      await saveIcalUrl(icalUrl.trim())
      setMsg('บันทึกสำเร็จ!')
      setTimeout(() => {
        onSaved()
      }, 1000)
    } catch (err) {
      console.error(err)
      setMsg('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal animate-in" style={{ maxWidth: 500, width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>⚙️ การตั้งค่า</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>

        {loading ? (
          <div className="spinner" style={{ margin: '20px auto' }}></div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 'bold', color: 'var(--accent)' }}>เชื่อมต่อ Google Calendar (iCal Link)</label>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, lineHeight: 1.4 }}>
                ไปที่ Google Calendar บนคอมพิวเตอร์ {'>'} การตั้งค่าปฏิทิน {'>'} เลื่อนลงมาที่ "ที่อยู่แบบลับในรูปแบบ iCal" {'>'} คัดลอกลิงก์มาวางที่นี่
              </p>
              <input 
                className="form-input" 
                placeholder="https://calendar.google.com/calendar/ical/.../basic.ics" 
                value={icalUrl}
                onChange={e => setIcalUrl(e.target.value)}
              />
            </div>

            {msg && <div style={{ fontSize: 14, color: msg.includes('สำเร็จ') ? '#22c55e' : '#ef4444', marginBottom: 12 }}>{msg}</div>}

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
