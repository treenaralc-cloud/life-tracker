import { useState, useEffect } from 'react'
import { getRoutines, createRoutine, updateRoutine, deleteRoutine } from '../utils/db'
import ExerciseAutocomplete from '../components/ExerciseAutocomplete'

const CATEGORIES = [
  { id: 'workout', icon: '🏋️', label: 'เวทเทรนนิ่ง' },
  { id: 'cardio',  icon: '🏃', label: 'คาร์ดิโอ' },
  { id: 'golf',    icon: '⛳', label: 'กอล์ฟ' },
  { id: 'study',   icon: '📚', label: 'เรียน' },
  { id: 'stretch', icon: '🧘', label: 'ยืดเหยียด' },
]

const DAYS = [
  { val: 1, label: 'จ' }, { val: 2, label: 'อ' }, { val: 3, label: 'พ' },
  { val: 4, label: 'พฤ' }, { val: 5, label: 'ศ' }, { val: 6, label: 'ส' }, { val: 0, label: 'อา' }
]

const COLORS = ['blue', 'red', 'green', 'yellow', 'purple', 'pink', 'indigo']

export default function RoutineManagerPage() {
  const [routines, setRoutines] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null = view list, object = edit/create
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadRoutines() }, [])

  async function loadRoutines() {
    setLoading(true)
    try {
      const data = await getRoutines()
      setRoutines(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  function handleCreateNew() {
    setEditing({
      isNew: true,
      name: '',
      category: 'workout',
      days_of_week: [],
      date_start: '',
      date_end: '',
      color: 'blue',
      is_active: true,
      items: []
    })
  }

  function handleEdit(r) {
    setEditing({
      id: r.id,
      name: r.name,
      category: r.category,
      days_of_week: r.days_of_week,
      date_start: r.date_start || '',
      date_end: r.date_end || '',
      color: r.color,
      is_active: r.is_active,
      items: (r.routine_items || []).map(i => ({
        id: i.id,
        item_name: i.item_name,
        muscle_group: i.muscle_group || '',
        default_sets: i.default_sets || []
      }))
    })
  }

  async function handleDelete(id) {
    if (!window.confirm('ลบกิจวัตรนี้แน่ใจไหมคะ?')) return
    try {
      await deleteRoutine(id)
      setRoutines(routines.filter(r => r.id !== id))
    } catch (err) { alert(err.message) }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const routinePayload = {
        name: editing.name,
        category: editing.category,
        days_of_week: editing.days_of_week,
        date_start: editing.date_start || null,
        date_end: editing.date_end || null,
        color: editing.color,
        is_active: editing.is_active
      }
      
      const itemsPayload = editing.items.map(i => ({
        item_name: i.item_name,
        muscle_group: i.muscle_group,
        default_sets: i.default_sets
      }))

      if (editing.isNew) {
        await createRoutine(routinePayload, itemsPayload)
      } else {
        await updateRoutine(editing.id, routinePayload, itemsPayload)
      }
      setEditing(null)
      loadRoutines()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  // Edit form helpers
  const toggleDay = (d) => {
    setEditing(prev => {
      const days = prev.days_of_week.includes(d) 
        ? prev.days_of_week.filter(x => x !== d) 
        : [...prev.days_of_week, d].sort()
      return { ...prev, days_of_week: days }
    })
  }

  const addItem = () => {
    setEditing(prev => ({
      ...prev,
      items: [...prev.items, { item_name: '', muscle_group: '', default_sets: [] }]
    }))
  }

  const updateItem = (index, field, value) => {
    setEditing(prev => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }
      return { ...prev, items: newItems }
    })
  }

  const removeItem = (index) => {
    setEditing(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">🔁 จัดการกิจวัตร (Routines)</h1>
          <p className="page-subtitle">ตั้งค่ากิจกรรมที่ทำเป็นประจำให้ระบบสร้างตารางอัตโนมัติ</p>
        </div>
        {!editing && (
          <button className="btn btn-primary" onClick={handleCreateNew}>+ สร้างใหม่</button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {editing ? (
        <form onSubmit={handleSave} style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius)', border: '1px solid var(--border-md)' }}>
          <h2 style={{ marginBottom: 20 }}>{editing.isNew ? 'สร้างกิจวัตรใหม่' : 'แก้ไขกิจวัตร'}</h2>
          
          <div className="form-group">
            <label className="form-label">ชื่อกิจวัตร</label>
            <input className="form-input" required placeholder="เช่น เล่นอก-แขน, ซ้อมวงสวิง" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">หมวดหมู่</label>
              <select className="form-select" value={editing.category} onChange={e => setEditing({...editing, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">สีป้ายกำกับ</label>
              <select className="form-select" value={editing.color} onChange={e => setEditing({...editing, color: e.target.value})}>
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">วันในสัปดาห์ (บังคับ)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {DAYS.map(d => (
                <button type="button" key={d.val} onClick={() => toggleDay(d.val)} style={{
                  width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: editing.days_of_week.includes(d.val) ? 'var(--accent)' : 'var(--bg-card)',
                  color: editing.days_of_week.includes(d.val) ? '#fff' : 'var(--text-2)',
                  fontWeight: 'bold', transition: '0.2s'
                }}>
                  {d.label}
                </button>
              ))}
            </div>
            {editing.days_of_week.length === 0 && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>กรุณาเลือกอย่างน้อย 1 วัน</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">เริ่มวันที่ (ถ้ามี)</label>
              <input className="form-input" type="date" value={editing.date_start} onChange={e => setEditing({...editing, date_start: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">สิ้นสุดวันที่ (ถ้ามี)</label>
              <input className="form-input" type="date" value={editing.date_end} onChange={e => setEditing({...editing, date_end: e.target.value})} />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={editing.is_active} onChange={e => setEditing({...editing, is_active: e.target.checked})} style={{ width: 18, height: 18 }} />
            <label style={{ margin: 0, fontWeight: 500 }}>เปิดใช้งานกิจวัตรนี้</label>
          </div>

          <hr style={{ borderColor: 'var(--border-md)', margin: '24px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>รายการกิจกรรมย่อย</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ เพิ่มรายการ</button>
          </div>

          {editing.items.map((item, index) => (
            <div key={index} style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 8, marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                {editing.category === 'workout' ? (
                  <ExerciseAutocomplete 
                    value={item.item_name}
                    onChange={(val) => updateItem(index, 'item_name', val)}
                    onSelect={(ex) => {
                      if (ex.muscle_group) updateItem(index, 'muscle_group', ex.muscle_group)
                    }}
                  />
                ) : (
                  <input className="form-input" placeholder="ชื่อกิจกรรม" value={item.item_name} onChange={e => updateItem(index, 'item_name', e.target.value)} required />
                )}
              </div>
              {editing.category === 'workout' && (
                <input className="form-input" style={{ width: 120 }} placeholder="ส่วนที่เล่น" value={item.muscle_group} onChange={e => updateItem(index, 'muscle_group', e.target.value)} />
              )}
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(index)}>✕</button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(null)}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving || editing.days_of_week.length === 0}>
              {saving ? 'กำลังบันทึก...' : '💾 บันทึกกิจวัตร'}
            </button>
          </div>
        </form>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner"></div></div>
      ) : routines.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-3)' }}>ยังไม่มีกิจวัตรค่ะ สร้างใหม่เพื่อประหยัดเวลาบันทึกนะคะ</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {routines.map(r => {
            const cat = CATEGORIES.find(c => c.id === r.category)
            return (
              <div key={r.id} className="card" style={{ borderLeft: `4px solid ${r.color || 'var(--accent)'}`, opacity: r.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px' }}>
                      {cat?.icon} {r.name}
                      {!r.is_active && <span style={{ fontSize: 12, background: 'var(--bg-base)', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>(ปิดใช้งาน)</span>}
                    </h3>
                    <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 8 }}>
                      ทุกวัน: {r.days_of_week.map(d => DAYS.find(x => x.val === d)?.label).join(', ')}
                    </div>
                    {r.routine_items?.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-3)', fontSize: 14 }}>
                        {r.routine_items.map(i => (
                          <li key={i.id}>{i.item_name} {i.muscle_group ? `(${i.muscle_group})` : ''}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(r)}>✏️ แก้ไข</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
