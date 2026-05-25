import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [tab, setTab]         = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const { signIn, signUp }    = useAuth()
  const navigate              = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (tab === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
        navigate('/')
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setSuccess('สมัครสมาชิกสำเร็จค่ะ! กรุณาตรวจสอบอีเมลเพื่อยืนยันค่ะ')
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่ค่ะ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box animate-in">
        <div className="login-logo">
          <div className="login-logo-icon">💪</div>
          <div className="login-logo-title">Life Tracker</div>
          <div className="login-logo-sub">บันทึกทุกก้าวของชีวิต</div>
        </div>

        <div className="login-tabs">
          <button className={`login-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); setSuccess('') }}>
            เข้าสู่ระบบ
          </button>
          <button className={`login-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => { setTab('signup'); setError(''); setSuccess('') }}>
            สมัครสมาชิก
          </button>
        </div>

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">อีเมล</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="boss@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">รหัสผ่าน</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button id="submit-auth" className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? '⏳ กำลังดำเนินการ...' : tab === 'login' ? '🚀 เข้าสู่ระบบ' : '✨ สมัครสมาชิก'}
          </button>
        </form>
      </div>
    </div>
  )
}
