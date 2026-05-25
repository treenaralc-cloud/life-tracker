import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { addWorkoutSession, addCardioLog, addGolfLog, addStudyLog, addStretchingLog, addSleepLog, addBodyMeasurement, updateWorkoutSession, updateCardioLog, updateGolfLog, updateStudyLog, updateStretchingLog, updateSleepLog, updateBodyMeasurement } from '../utils/db'
import { format } from 'date-fns'
import ExerciseAutocomplete from '../components/ExerciseAutocomplete'

const CATEGORIES = [
  { id: 'workout', icon: '🏋️', label: 'เวทเทรนนิ่ง', color: '#38bdf8' },
  { id: 'cardio',  icon: '🏃', label: 'คาร์ดิโอ',     color: '#f97316' },
  { id: 'golf',    icon: '⛳', label: 'กอล์ฟ',         color: '#22c55e' },
  { id: 'study',   icon: '📚', label: 'เรียน',         color: '#a855f7' },
  { id: 'stretch', icon: '🧘', label: 'ยืดเหยียด',    color: '#ec4899' },
  { id: 'sleep',   icon: '😴', label: 'การนอน',        color: '#6366f1' },
  { id: 'body',    icon: '⚖️', label: 'น้ำหนัก/วัดตัว', color: '#eab308' },
]

const MUSCLE_GROUPS = ['อก','หลัง','ไหล่','แขน Bicep','แขน Tricep','ขา','สะโพก','แกนกลาง','ทั้งตัว']
const CARDIO_TYPES  = ['วิ่ง','จักรยาน','ว่ายน้ำ','เดินเร็ว','เชือกกระโดด','Elliptical','อื่นๆ']
const GOLF_TYPES    = ['Driving Range','สนามจริง (Course)','Short Game','Putting Green','ซ้อมรวม']
const STRETCH_TYPES = ['Static','Dynamic','Yoga','PNF','Pilates']
const STUDY_SOURCES = ['หนังสือ','YouTube','Coursera/Udemy','Podcast','บทความ','สอนตัวเอง','อื่นๆ']

// ──────────────── Workout Form ────────────────
function WorkoutForm({ onSuccess, initialState }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate]     = useState(initialState?.dateStr || today)
  const [notes, setNotes]   = useState(initialState?.notes || '')
  const [exercises, setEx]  = useState(initialState?.exercises || [newExercise()])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  function newExercise() {
    return { name: '', muscle: '', sets: [{ weight: '', reps: '' }] }
  }

  function addExercise() { setEx([...exercises, newExercise()]) }
  function removeExercise(i) { setEx(exercises.filter((_, idx) => idx !== i)) }
  function updateEx(i, field, val) {
    const copy = [...exercises]; copy[i] = { ...copy[i], [field]: val }; setEx(copy)
  }
  function addSet(ei) {
    const copy = [...exercises]
    copy[ei].sets.push({ weight: '', reps: '' })
    setEx(copy)
  }
  function removeSet(ei, si) {
    const copy = [...exercises]
    copy[ei].sets = copy[ei].sets.filter((_, i) => i !== si)
    setEx(copy)
  }
  function updateSet(ei, si, field, val) {
    const copy = [...exercises]
    copy[ei].sets[si] = { ...copy[ei].sets[si], [field]: val }
    setEx(copy)
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const exData = exercises.filter(e => e.name.trim()).map(e => ({
        exercise_name: e.name,
        muscle_group: e.muscle,
        sets: e.sets.filter(s => s.weight || s.reps).map(s => ({
          weight_kg: parseFloat(s.weight) || 0,
          reps: parseInt(s.reps) || 0,
        })),
      }))
      if (initialState?.id) await updateWorkoutSession(initialState.id, date, notes, exData)
      else await addWorkoutSession(date, notes, exData)
      onSuccess('บันทึกเวทเทรนนิ่งเรียบร้อยแล้วค่ะ! 💪')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-group">
        <label className="form-label">วันที่</label>
        <input id="workout-date" className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label className="form-label" style={{ margin: 0 }}>ท่าออกกำลังกาย</label>
          <button type="button" id="add-exercise-btn" className="btn btn-secondary btn-sm" onClick={addExercise}>+ เพิ่มท่า</button>
        </div>

        <div className="exercise-list">
          {exercises.map((ex, ei) => (
            <div key={ei} className="exercise-item">
              <div className="exercise-header">
                <ExerciseAutocomplete 
                  value={ex.name} 
                  onChange={(val) => updateEx(ei, 'name', val)}
                  onSelect={(selectedEx) => {
                    // Auto-fill muscle group and sets if available
                    if (selectedEx.muscle_group) {
                      updateEx(ei, 'muscle', selectedEx.muscle_group)
                    }
                    if (selectedEx.last_sets && selectedEx.last_sets.length > 0) {
                      const copy = [...exercises]
                      copy[ei].sets = selectedEx.last_sets.map(s => ({
                        weight: s.weight_kg ? String(s.weight_kg) : '',
                        reps: s.reps ? String(s.reps) : ''
                      }))
                      setEx(copy)
                    }
                  }}
                />
                <select id={`ex-muscle-${ei}`} className="form-select" value={ex.muscle} onChange={e => updateEx(ei, 'muscle', e.target.value)} style={{ width: 130, marginRight: 8 }}>
                  <option value="">กล้ามเนื้อ</option>
                  {MUSCLE_GROUPS.map(m => <option key={m}>{m}</option>)}
                </select>
                {exercises.length > 1 && (
                  <button type="button" id={`remove-ex-${ei}`} className="btn btn-danger btn-sm" onClick={() => removeExercise(ei)}>✕</button>
                )}
              </div>

              <div className="sets-list">
                {ex.sets.map((s, si) => (
                  <div key={si} className="set-row">
                    <span className="set-num">S{si+1}</span>
                    <input id={`weight-${ei}-${si}`} className="form-input set-input" type="number" min="0" step="0.5" placeholder="kg" value={s.weight} onChange={e => updateSet(ei, si, 'weight', e.target.value)} />
                    <span className="set-sep">×</span>
                    <input id={`reps-${ei}-${si}`} className="form-input set-input" type="number" min="0" placeholder="ครั้ง" value={s.reps} onChange={e => updateSet(ei, si, 'reps', e.target.value)} />
                    {ex.sets.length > 1 && <button type="button" onClick={() => removeSet(ei, si)} style={{ color: 'var(--text-3)', fontSize: 16, padding: '0 4px' }}>✕</button>}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => addSet(ei)}>+ เพิ่มเซ็ท</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">โน้ต</label>
        <textarea id="workout-notes" className="form-textarea" placeholder="รู้สึกยังไงวันนี้? หรือสิ่งที่อยากจำ..." value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <button id="submit-workout" className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
        {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึกเวทเทรนนิ่ง'}
      </button>
    </form>
  )
}

// ──────────────── Cardio Form ────────────────
function CardioForm({ onSuccess, initialState }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [f, setF] = useState(initialState || { date: today, type: 'วิ่ง', duration_minutes: '', distance_km: '', calories: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const payload = {
        date: f.date,
        notes: f.notes, date: f.date, type: f.type, duration_minutes: parseInt(f.duration_minutes), distance_km: f.distance_km ? parseFloat(f.distance_km) : null, calories: f.calories ? parseInt(f.calories) : null, notes: f.notes };
      if (initialState?.id) await updateCardioLog(initialState.id, payload);
      else await addCardioLog(payload);
      onSuccess('บันทึกคาร์ดิโอเรียบร้อยค่ะ! 🏃')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">วันที่</label>
          <input id="cardio-date" className="form-input" type="date" value={f.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">ประเภท</label>
          <select id="cardio-type" className="form-select" value={f.type} onChange={e => set('type', e.target.value)}>
            {CARDIO_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">เวลา (นาที)</label>
          <input id="cardio-duration" className="form-input" type="number" min="1" placeholder="30" value={f.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">ระยะทาง (km)</label>
          <input id="cardio-distance" className="form-input" type="number" min="0" step="0.1" placeholder="5.0" value={f.distance_km} onChange={e => set('distance_km', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">แคลอรี่</label>
          <input id="cardio-calories" className="form-input" type="number" min="0" placeholder="300" value={f.calories} onChange={e => set('calories', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">โน้ต</label>
        <textarea id="cardio-notes" className="form-textarea" placeholder="เส้นทาง / ความรู้สึก..." value={f.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <button id="submit-cardio" className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ '--accent': '#f97316', '--accent-2': '#ea580c' }}>
        {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึกคาร์ดิโอ'}
      </button>
    </form>
  )
}

// ──────────────── Golf Form ────────────────
function GolfForm({ onSuccess, initialState }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [f, setF] = useState(initialState || { date: today, location: '', session_type: 'Driving Range', duration_minutes: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const payload = { date: f.date, location: f.location, session_type: f.session_type, duration_minutes: f.duration_minutes ? parseInt(f.duration_minutes) : null, notes: f.notes };
      if (initialState?.id) await updateGolfLog(initialState.id, payload);
      else await addGolfLog(payload);
      onSuccess('บันทึกการซ้อมกอล์ฟเรียบร้อยค่ะ! ⛳')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">วันที่</label>
          <input id="golf-date" className="form-input" type="date" value={f.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">รูปแบบ</label>
          <select id="golf-type" className="form-select" value={f.session_type} onChange={e => set('session_type', e.target.value)}>
            {GOLF_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">สถานที่</label>
          <input id="golf-location" className="form-input" placeholder="ชื่อสนาม / สถานที่" value={f.location} onChange={e => set('location', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">เวลา (นาที)</label>
          <input id="golf-duration" className="form-input" type="number" min="0" placeholder="90" value={f.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">โน้ต (สิ่งที่ซ้อม / สิ่งที่ปรับ)</label>
        <textarea id="golf-notes" className="form-textarea" placeholder="วันนี้ซ้อมอะไร? Swing เป็นยังไง?" value={f.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <button id="submit-golf" className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ '--accent': '#22c55e', '--accent-2': '#16a34a' }}>
        {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึกซ้อมกอล์ฟ'}
      </button>
    </form>
  )
}

// ──────────────── Study Form ────────────────
function StudyForm({ onSuccess, initialState }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [f, setF] = useState({ date: today, subject: '', duration_minutes: '', source: 'YouTube', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const payload = { date: f.date, subject: f.subject, duration_minutes: parseInt(f.duration_minutes), source: f.source, notes: f.notes };
      if (initialState?.id) await updateStudyLog(initialState.id, payload);
      else await addStudyLog(payload);
      onSuccess('บันทึกการเรียนเรียบร้อยค่ะ! 📚')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">วันที่</label>
          <input id="study-date" className="form-input" type="date" value={f.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">แหล่งที่มา</label>
          <select id="study-source" className="form-select" value={f.source} onChange={e => set('source', e.target.value)}>
            {STUDY_SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">วิชา / หัวข้อ</label>
          <input id="study-subject" className="form-input" placeholder="เช่น JavaScript, Business, ภาษาญี่ปุ่น" value={f.subject} onChange={e => set('subject', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">เวลา (นาที)</label>
          <input id="study-duration" className="form-input" type="number" min="1" placeholder="60" value={f.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} required />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">สรุปสิ่งที่เรียน</label>
        <textarea id="study-notes" className="form-textarea" placeholder="เรียนอะไรวันนี้? จุดสำคัญที่ได้?" value={f.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <button id="submit-study" className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ '--accent': '#a855f7', '--accent-2': '#9333ea' }}>
        {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึกการเรียน'}
      </button>
    </form>
  )
}

// ──────────────── Stretch Form ────────────────
function StretchForm({ onSuccess, initialState }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [f, setF] = useState({ date: today, duration_minutes: '', type: 'Static', notes: '' })
  const [selectedMuscles, setMuscles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const toggleMuscle = (m) => setMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await addStretchingLog({ ...f, duration_minutes: parseInt(f.duration_minutes), muscle_groups: selectedMuscles })
      onSuccess('บันทึกการยืดเหยียดเรียบร้อยค่ะ! 🧘')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">วันที่</label>
          <input id="stretch-date" className="form-input" type="date" value={f.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">ประเภท</label>
          <select id="stretch-type" className="form-select" value={f.type} onChange={e => set('type', e.target.value)}>
            {STRETCH_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">เวลา (นาที)</label>
        <input id="stretch-duration" className="form-input" type="number" min="1" placeholder="15" value={f.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">กล้ามเนื้อที่ยืด (เลือกได้หลายอย่าง)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {MUSCLE_GROUPS.map(m => (
            <button key={m} type="button" id={`muscle-${m}`}
              onClick={() => toggleMuscle(m)}
              style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: `1px solid ${selectedMuscles.includes(m) ? '#ec4899' : 'var(--border-md)'}`,
                background: selectedMuscles.includes(m) ? 'rgba(236,72,153,0.15)' : 'var(--bg-card)',
                color: selectedMuscles.includes(m) ? '#ec4899' : 'var(--text-2)',
                transition: 'var(--transition)', cursor: 'pointer',
              }}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">โน้ต</label>
        <textarea id="stretch-notes" className="form-textarea" placeholder="รู้สึกยังไง? ส่วนไหนตึงมาก?" value={f.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <button id="submit-stretch" className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ '--accent': '#ec4899', '--accent-2': '#db2777' }}>
        {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึกการยืดเหยียด'}
      </button>
    </form>
  )
}

// ──────────────── Sleep Form ────────────────
function SleepForm({ onSuccess, initialState }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [f, setF] = useState({ date: today, sleep_time: '23:00', wake_time: '07:00', notes: '' })
  const [quality, setQuality] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  function calcHours(s, w) {
    const [sh, sm] = s.split(':').map(Number)
    const [wh, wm] = w.split(':').map(Number)
    let diff = (wh * 60 + wm) - (sh * 60 + sm)
    if (diff < 0) diff += 24 * 60
    return Math.round(diff / 60 * 10) / 10
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const duration_hours = calcHours(f.sleep_time, f.wake_time)
      await addSleepLog({ ...f, duration_hours, quality: quality || null })
      onSuccess('บันทึกการนอนเรียบร้อยค่ะ! 😴')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const hrs = calcHours(f.sleep_time, f.wake_time)

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-group">
        <label className="form-label">วันที่ (วันที่ตื่น)</label>
        <input id="sleep-date" className="form-input" type="date" value={f.date} onChange={e => set('date', e.target.value)} required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">เวลาเข้านอน</label>
          <input id="sleep-time" className="form-input" type="time" value={f.sleep_time} onChange={e => set('sleep_time', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">เวลาตื่น</label>
          <input id="wake-time" className="form-input" type="time" value={f.wake_time} onChange={e => set('wake_time', e.target.value)} required />
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '8px 0 16px', color: hrs >= 7 ? '#22c55e' : hrs >= 6 ? '#eab308' : '#ef4444', fontWeight: 700, fontSize: 18 }}>
        😴 นอน {hrs} ชั่วโมง {hrs >= 7 ? '✅' : hrs >= 6 ? '⚠️' : '❌'}
      </div>
      <div className="form-group">
        <label className="form-label">คุณภาพการนอน</label>
        <div className="star-rating">
          {[1,2,3,4,5].map(n => (
            <button key={n} type="button" id={`sleep-quality-${n}`} className={`star-btn ${quality >= n ? 'active' : ''}`} onClick={() => setQuality(n)}>
              {quality >= n ? '⭐' : '☆'}
            </button>
          ))}
          {quality > 0 && <span style={{ color: 'var(--text-2)', fontSize: 13, marginLeft: 8 }}>
            {['','แย่มาก','แย่','พอใช้','ดี','ดีมาก'][quality]}
          </span>}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">โน้ต</label>
        <textarea id="sleep-notes" className="form-textarea" placeholder="ฝันดีไหม? นอนหลับง่ายไหม?" value={f.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <button id="submit-sleep" className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ '--accent': '#6366f1', '--accent-2': '#4f46e5' }}>
        {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึกการนอน'}
      </button>
    </form>
  )
}

// ──────────────── Body Form ────────────────
function BodyForm({ onSuccess, initialState }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [f, setF] = useState({ date: today, weight_kg: '', body_fat_percent: '', waist_cm: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await addBodyMeasurement({
        date: f.date,
        weight_kg: f.weight_kg ? parseFloat(f.weight_kg) : null,
        body_fat_percent: f.body_fat_percent ? parseFloat(f.body_fat_percent) : null,
        waist_cm: f.waist_cm ? parseFloat(f.waist_cm) : null,
        notes: f.notes,
      })
      onSuccess('บันทึกข้อมูลร่างกายเรียบร้อยค่ะ! ⚖️')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-group">
        <label className="form-label">วันที่</label>
        <input id="body-date" className="form-input" type="date" value={f.date} onChange={e => set('date', e.target.value)} required />
      </div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">น้ำหนัก (kg)</label>
          <input id="body-weight" className="form-input" type="number" min="0" step="0.1" placeholder="75.5" value={f.weight_kg} onChange={e => set('weight_kg', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">ไขมัน (%)</label>
          <input id="body-fat" className="form-input" type="number" min="0" max="100" step="0.1" placeholder="18.0" value={f.body_fat_percent} onChange={e => set('body_fat_percent', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">รอบเอว (cm)</label>
          <input id="body-waist" className="form-input" type="number" min="0" step="0.5" placeholder="80.0" value={f.waist_cm} onChange={e => set('waist_cm', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">โน้ต</label>
        <textarea id="body-notes" className="form-textarea" placeholder="ช่วง Bulk / Cut? สังเกตอะไร?" value={f.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <button id="submit-body" className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ '--accent': '#eab308', '--accent-2': '#ca8a04' }}>
        {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึกข้อมูลร่างกาย'}
      </button>
    </form>
  )
}

// ──────────────── Main Page ────────────────
const FORM_MAP = {
  workout: WorkoutForm,
  cardio:  CardioForm,
  golf:    GolfForm,
  study:   StudyForm,
  stretch: StretchForm,
  sleep:   SleepForm,
  body:    BodyForm,
}

export default function LogPage() {
  const location = useLocation()
  const isEditMode = !!location.state?.editLog
  const [selected, setSelected] = useState(location.state?.editType || location.state?.routine?.category || null)
  const [success, setSuccess]   = useState('')

  useEffect(() => {
    if (location.state?.editType) {
      setSelected(location.state.editType)
    } else if (location.state?.routine?.category) {
      setSelected(location.state.routine.category)
    }
  }, [location.state])

  function handleSuccess(msg) {
    setSuccess(msg)
    setSelected(null)
    setTimeout(() => setSuccess(''), 4000)
  }

  const FormComponent = selected ? FORM_MAP[selected] : null
  const cat = CATEGORIES.find(c => c.id === selected)
  
  // Format initial state for the form if coming from Schedule
  let formInitialState = null
  if (location.state?.editLog) {
    const editLog = location.state.editLog
    if (selected === 'workout') {
       formInitialState = {
         id: editLog.id,
         dateStr: editLog.date,
         exercises: editLog.workout_exercises?.map(e => ({
            name: e.exercise_name,
            muscle: e.muscle_group || '',
            sets: e.sets || [{weight: '', reps: ''}]
         })) || [{name: '', muscle: '', sets: [{weight: '', reps: ''}]}],
         notes: editLog.notes || ''
       }
    } else {
       formInitialState = { ...editLog }
       if (formInitialState.date) formInitialState.dateStr = formInitialState.date
       if (selected === 'sleep') formInitialState.quality = String(formInitialState.quality || '3')
       if (selected === 'body') {
          ['weight_kg', 'body_fat_percent', 'muscle_mass_kg', 'waist_cm'].forEach(k => {
             if (formInitialState[k] !== null && formInitialState[k] !== undefined) formInitialState[k] = String(formInitialState[k])
             else formInitialState[k] = ''
          })
       }
       if (selected === 'cardio') {
          ['duration_minutes', 'distance_km', 'calories'].forEach(k => {
             if (formInitialState[k] !== null && formInitialState[k] !== undefined) formInitialState[k] = String(formInitialState[k])
             else formInitialState[k] = ''
          })
       }
       if (selected === 'golf' || selected === 'study' || selected === 'stretch') {
          if (formInitialState.duration_minutes !== null && formInitialState.duration_minutes !== undefined) formInitialState.duration_minutes = String(formInitialState.duration_minutes)
          else formInitialState.duration_minutes = ''
       }
    }
  } else if (location.state?.routine && location.state.routine.category === selected) {
    const routine = location.state.routine
    if (routine.category === 'workout') {
      formInitialState = {
        dateStr: location.state.dateStr,
        exercises: routine.routine_items?.map(i => ({
          name: i.item_name,
          muscle: i.muscle_group || '',
          sets: i.default_sets?.length > 0 ? i.default_sets.map(s => ({ weight: s.weight_kg || '', reps: s.reps || '' })) : [{ weight: '', reps: '' }]
        })) || [{ name: '', muscle: '', sets: [{ weight: '', reps: '' }] }]
      }
    }
    // Note: Other categories can be pre-filled here if needed in the future
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">➕ บันทึกกิจกรรม</h1>
        <p className="page-subtitle">เลือกหมวดที่ต้องการบันทึกค่ะ</p>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      {!selected ? (
        <div className="cat-grid">
          {CATEGORIES.map(c => (
            <div key={c.id} id={`cat-${c.id}`} className="cat-card" style={{ '--cat-color': c.color }} onClick={() => setSelected(c.id)}>
              <div className="cat-card-icon">{c.icon}</div>
              <div className="cat-card-label">{c.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button id="back-to-cats" className="btn btn-secondary btn-sm" style={{ marginBottom: 20 }} onClick={() => {
              if (isEditMode) window.history.back()
              else setSelected(null)
            }}>
            {isEditMode ? '✕ ยกเลิกแก้ไข' : '← กลับ'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, padding: '12px 16px', background: `rgba(255,255,255,0.04)`, borderRadius: 'var(--radius)', borderLeft: `3px solid ${cat?.color}` }}>
            <span style={{ fontSize: 24 }}>{cat?.icon}</span>
            <span style={{ fontWeight: 700, color: cat?.color }}>{cat?.label}</span>
          </div>

          <FormComponent onSuccess={handleSuccess} initialState={formInitialState} />
        </div>
      )}
    </div>
  )
}
