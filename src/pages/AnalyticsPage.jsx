import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { supabase } from '../utils/supabase'
import { format, subDays, subMonths, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns'
import { th } from 'date-fns/locale'
import { GoogleGenerativeAI } from '@google/generative-ai'
import ReactMarkdown from 'react-markdown'

const RANGES = [
  { label: '1 สัปดาห์', days: 7 },
  { label: '1 เดือน',   days: 30 },
  { label: '3 เดือน',   days: 90 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', minWidth: 120 }}>
      <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{p.name}</span><span>{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [range, setRange]       = useState(30)
  const [bodyData, setBodyData] = useState([])
  const [sleepData, setSleepData] = useState([])
  const [activityData, setActivityData] = useState([])
  const [studyData, setStudyData] = useState([])
  const [loading, setLoading]   = useState(true)
  const [totals, setTotals]     = useState({})

  const [aiLoading, setAiLoading] = useState(false)
  const [aiAdvice, setAiAdvice] = useState('')
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '')

  useEffect(() => { loadData() }, [range])

  async function loadData() {
    setLoading(true)
    const since = format(subDays(new Date(), range), 'yyyy-MM-dd')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [body, sleep, workouts, cardio, golf, study, stretch] = await Promise.all([
      supabase.from('body_measurements').select('date,weight_kg,body_fat_percent').eq('user_id', user.id).gte('date', since).order('date'),
      supabase.from('sleep_logs').select('date,duration_hours,quality').eq('user_id', user.id).gte('date', since).order('date'),
      supabase.from('workout_sessions').select('date').eq('user_id', user.id).gte('date', since),
      supabase.from('cardio_logs').select('date,duration_minutes').eq('user_id', user.id).gte('date', since),
      supabase.from('golf_logs').select('date').eq('user_id', user.id).gte('date', since),
      supabase.from('study_logs').select('date,duration_minutes').eq('user_id', user.id).gte('date', since),
      supabase.from('stretching_logs').select('date').eq('user_id', user.id).gte('date', since),
    ])

    setBodyData(body.data?.map(r => ({ ...r, date: format(new Date(r.date), 'd MMM', { locale: th }) })) || [])
    setSleepData(sleep.data?.map(r => ({ ...r, date: format(new Date(r.date), 'd MMM', { locale: th }) })) || [])

    // Build weekly activity chart
    const weeks = eachWeekOfInterval({ start: subDays(new Date(), range), end: new Date() }, { weekStartsOn: 1 })
    const weekly = weeks.map(weekStart => {
      const we = endOfWeek(weekStart, { weekStartsOn: 1 })
      const ws = format(weekStart, 'yyyy-MM-dd')
      const weStr = format(we, 'yyyy-MM-dd')
      const label = format(weekStart, 'd MMM', { locale: th })
      const inRange = (arr) => (arr.data || []).filter(r => r.date >= ws && r.date <= weStr)
      return {
        week: label,
        เวท: new Set(inRange(workouts).map(r => r.date)).size,
        คาร์ดิโอ: inRange(cardio).length,
        กอล์ฟ: inRange(golf).length,
        เรียน: Math.round(inRange(study).reduce((s, r) => s + (r.duration_minutes || 0), 0) / 60 * 10) / 10,
        ยืด: new Set(inRange(stretch).map(r => r.date)).size,
      }
    })
    setActivityData(weekly)

    // Study hours by subject
    const subjectMap = {}
    for (const r of study.data || []) {
      // group by week
    }

    setTotals({
      workoutDays: new Set((workouts.data || []).map(r => r.date)).size,
      cardioMin:   (cardio.data || []).reduce((s, r) => s + (r.duration_minutes || 0), 0),
      golfSessions: golf.data?.length || 0,
      studyHours:  Math.round((study.data || []).reduce((s, r) => s + (r.duration_minutes || 0), 0) / 60 * 10) / 10,
      stretchDays: new Set((stretch.data || []).map(r => r.date)).size,
    })
    setLoading(false)
  }

  const askAI = async () => {
    if (!apiKey) {
      alert('กรุณาระบุ Gemini API Key ก่อนค่ะ')
      return
    }
    setAiLoading(true)
    setAiAdvice('')
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const prompt = `ในฐานะโค้ชส่วนตัว (AI Weekly Coach) ชื่อน้องน้ำเพชร ที่มีความกระตือรือร้นและน่ารัก กรุณาวิเคราะห์ข้อมูลสุขภาพและการทำกิจกรรมของฉันในช่วง ${range} วันที่ผ่านมา และให้คำแนะนำที่นำไปใช้ได้จริง สั้นๆ กระชับ และเป็นข้อๆ

ข้อมูลสรุป ${range} วันที่ผ่านมา:
- วันที่ออกกำลังกาย (เวทเทรนนิ่ง): ${totals.workoutDays} วัน
- เวลาคาร์ดิโอรวม: ${totals.cardioMin} นาที
- ซ้อมกอล์ฟ: ${totals.golfSessions} ครั้ง
- เวลาเรียน/พัฒนาตัวเองรวม: ${totals.studyHours} ชม.
- วันที่ยืดเหยียด: ${totals.stretchDays} วัน

วิเคราะห์จุดแข็ง จุดที่ต้องระวัง และให้เป้าหมายในสัปดาห์ถัดไปแบบน่ารักๆ ค่ะ`

      const result = await model.generateContent(prompt)
      setAiAdvice(result.response.text())
    } catch (err) {
      console.error(err)
      setAiAdvice('ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI (ตรวจสอบ API Key หรือลองใหม่อีกครั้ง)')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">📊 วิเคราะห์ข้อมูล</h1>
        <p className="page-subtitle">ดูความคืบหน้าและแนวโน้มของบอสค่ะ</p>
      </div>

      {/* Range selector */}
      <div className="tabs" style={{ maxWidth: 360, marginBottom: 24 }}>
        {RANGES.map(r => (
          <button key={r.days} id={`range-${r.days}`} className={`tab ${range === r.days ? 'active' : ''}`} onClick={() => setRange(r.days)}>
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* AI Weekly Coach */}
          <div className="chart-card" style={{ marginBottom: 24, background: 'var(--bg-card)', border: '1px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 32 }}>🤖</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#6366f1' }}>AI Weekly Coach (น้องน้ำเพชร)</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>ให้ AI ช่วยวิเคราะห์ผลลัพธ์และให้คำแนะนำ</p>
              </div>
            </div>

            {!apiKey && (
              <div style={{ marginBottom: 16 }}>
                <input 
                  type="password"
                  className="form-input" 
                  placeholder="ใส่ Gemini API Key ที่นี่ (ถ้าไม่มีใน .env)" 
                  value={apiKey} 
                  onChange={e => setApiKey(e.target.value)} 
                />
              </div>
            )}

            {!aiAdvice && !aiLoading && (
              <button className="btn btn-primary btn-full" onClick={askAI}>
                ✨ ขอคำแนะนำจาก AI
              </button>
            )}

            {aiLoading && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <div style={{ color: 'var(--text-3)', fontSize: 14 }}>น้องน้ำเพชรกำลังวิเคราะห์ข้อมูล...</div>
              </div>
            )}

            {aiAdvice && !aiLoading && (
              <div style={{ 
                background: 'rgba(99, 102, 241, 0.1)', 
                padding: 16, 
                borderRadius: 'var(--radius)',
                fontSize: 14,
                lineHeight: 1.6
              }}>
                <ReactMarkdown>{aiAdvice}</ReactMarkdown>
                <button className="btn btn-secondary btn-full" style={{ marginTop: 16 }} onClick={askAI}>
                  🔄 วิเคราะห์ใหม่
                </button>
              </div>
            )}
          </div>

          {/* Summary totals */}
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            {[
              { icon: '🏋️', label: `วันที่ออกกำลัง`, value: totals.workoutDays, unit: 'วัน', color: '#38bdf8' },
              { icon: '🏃', label: 'คาร์ดิโอรวม',    value: Math.round(totals.cardioMin/60*10)/10, unit: 'ชม.', color: '#f97316' },
              { icon: '⛳', label: 'ซ้อมกอล์ฟ',       value: totals.golfSessions, unit: 'ครั้ง', color: '#22c55e' },
              { icon: '📚', label: 'เรียนรวม',         value: totals.studyHours, unit: 'ชม.', color: '#a855f7' },
              { icon: '🧘', label: 'ยืดเหยียด',        value: totals.stretchDays, unit: 'วัน', color: '#ec4899' },
            ].map(c => (
              <div key={c.label} className="stat-card" style={{ '--cat-color': c.color }}>
                <div className="stat-icon">{c.icon}</div>
                <div className="stat-value">{c.value}</div>
                <div className="stat-label">{c.label} • {c.unit}</div>
              </div>
            ))}
          </div>

          {/* Weekly activity */}
          <div className="chart-card">
            <div className="chart-title">📅 กิจกรรมรายสัปดาห์</div>
            {activityData.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-body">ยังไม่มีข้อมูลในช่วงนี้ค่ะ</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={activityData} barSize={10} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="เวท"    fill="#38bdf8" radius={3} />
                  <Bar dataKey="คาร์ดิโอ" fill="#f97316" radius={3} />
                  <Bar dataKey="กอล์ฟ"  fill="#22c55e" radius={3} />
                  <Bar dataKey="เรียน"  fill="#a855f7" radius={3} />
                  <Bar dataKey="ยืด"   fill="#ec4899" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Body weight */}
          {bodyData.length > 0 && (
            <div className="chart-card">
              <div className="chart-title">⚖️ น้ำหนักร่างกาย</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bodyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={36} domain={['auto','auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="weight_kg" name="น้ำหนัก (kg)" stroke="#eab308" strokeWidth={2.5} dot={{ fill: '#eab308', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sleep quality */}
          {sleepData.length > 0 && (
            <div className="chart-card">
              <div className="chart-title">😴 การนอนหลับ</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={sleepData}>
                  <defs>
                    <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={28} domain={[0, 10]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="duration_hours" name="ชม.นอน" stroke="#6366f1" fill="url(#sleepGrad)" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <span style={{ color: 'var(--text-3)', fontSize: 12 }}>เส้นประ 7 ชม. = เป้าหมาย</span>
              </div>
            </div>
          )}

          {bodyData.length === 0 && sleepData.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📈</div>
              <div className="empty-title">ยังไม่มีข้อมูลกราฟค่ะ</div>
              <div className="empty-body">บันทึกน้ำหนักและการนอนเพิ่มเพื่อดูกราฟค่ะ!</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
