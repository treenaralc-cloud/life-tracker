import { supabase } from './supabase'
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns'

// ──────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────
export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getUser = () => supabase.auth.getUser()

// ──────────────────────────────────────────
// WORKOUT
// ──────────────────────────────────────────
export const addWorkoutSession = async (date, notes, exercises) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: session, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: user.id, date, notes })
    .select().single()
  if (error) throw error

  if (exercises.length > 0) {
    const rows = exercises.map(e => ({ session_id: session.id, ...e }))
    const { error: exErr } = await supabase.from('workout_exercises').insert(rows)
    if (exErr) throw exErr
  }
  return session
}

export const getWorkoutSessions = async (limit = 50) => {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*, workout_exercises(*)')
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ──────────────────────────────────────────
// CARDIO
// ──────────────────────────────────────────
export const addCardioLog = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('cardio_logs')
    .insert({ user_id: user.id, ...payload })
    .select().single()
  if (error) throw error
  return data
}

export const getCardioLogs = async (limit = 50) => {
  const { data, error } = await supabase
    .from('cardio_logs')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ──────────────────────────────────────────
// GOLF
// ──────────────────────────────────────────
export const addGolfLog = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('golf_logs')
    .insert({ user_id: user.id, ...payload })
    .select().single()
  if (error) throw error
  return data
}

export const getGolfLogs = async (limit = 50) => {
  const { data, error } = await supabase
    .from('golf_logs')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ──────────────────────────────────────────
// STUDY
// ──────────────────────────────────────────
export const addStudyLog = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('study_logs')
    .insert({ user_id: user.id, ...payload })
    .select().single()
  if (error) throw error
  return data
}

export const getStudyLogs = async (limit = 50) => {
  const { data, error } = await supabase
    .from('study_logs')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ──────────────────────────────────────────
// STRETCHING
// ──────────────────────────────────────────
export const addStretchingLog = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('stretching_logs')
    .insert({ user_id: user.id, ...payload })
    .select().single()
  if (error) throw error
  return data
}

export const getStretchingLogs = async (limit = 50) => {
  const { data, error } = await supabase
    .from('stretching_logs')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ──────────────────────────────────────────
// SLEEP
// ──────────────────────────────────────────
export const addSleepLog = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('sleep_logs')
    .insert({ user_id: user.id, ...payload })
    .select().single()
  if (error) throw error
  return data
}

export const getSleepLogs = async (limit = 50) => {
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ──────────────────────────────────────────
// BODY MEASUREMENTS
// ──────────────────────────────────────────
export const addBodyMeasurement = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('body_measurements')
    .insert({ user_id: user.id, ...payload })
    .select().single()
  if (error) throw error
  return data
}

export const getBodyMeasurements = async (limit = 50) => {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ──────────────────────────────────────────
// ANALYTICS HELPERS
// ──────────────────────────────────────────
export const getWeeklyStats = async () => {
  const now = new Date()
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [workouts, cardio, golf, study, stretch] = await Promise.all([
    supabase.from('workout_sessions').select('date').gte('date', weekStart).lte('date', weekEnd),
    supabase.from('cardio_logs').select('date,duration_minutes').gte('date', weekStart).lte('date', weekEnd),
    supabase.from('golf_logs').select('date').gte('date', weekStart).lte('date', weekEnd),
    supabase.from('study_logs').select('date,duration_minutes').gte('date', weekStart).lte('date', weekEnd),
    supabase.from('stretching_logs').select('date').gte('date', weekStart).lte('date', weekEnd),
  ])

  return {
    workout_days: new Set(workouts.data?.map(r => r.date)).size,
    cardio_sessions: cardio.data?.length || 0,
    cardio_minutes: cardio.data?.reduce((s, r) => s + (r.duration_minutes || 0), 0) || 0,
    golf_sessions: golf.data?.length || 0,
    study_hours: Math.round((study.data?.reduce((s, r) => s + (r.duration_minutes || 0), 0) || 0) / 60 * 10) / 10,
    stretch_days: new Set(stretch.data?.map(r => r.date)).size,
  }
}

export const getStreak = async () => {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('date')
    .order('date', { ascending: false })
    .limit(100)
  if (error || !data?.length) return 0

  const dates = [...new Set(data.map(r => r.date))].sort().reverse()
  let streak = 0
  let check = new Date()
  check.setHours(0, 0, 0, 0)

  for (const d of dates) {
    const day = new Date(d)
    day.setHours(0, 0, 0, 0)
    const diff = Math.round((check - day) / 86400000)
    if (diff === 0 || diff === 1) {
      streak++
      check = day
    } else break
  }
  return streak
}

// ──────────────────────────────────────────
// GOALS
// ──────────────────────────────────────────
export const getOrCreateWeeklyGoal = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  let { data, error } = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single()

  if (!data) {
    const { data: created, error: ce } = await supabase
      .from('weekly_goals')
      .insert({ user_id: user.id, week_start: weekStart })
      .select().single()
    data = created
  }
  return data
}

export const updateWeeklyGoal = async (id, payload) => {
  const { data, error } = await supabase
    .from('weekly_goals')
    .update(payload)
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

// All logs combined (for history page)
export const getAllLogs = async (limit = 30) => {
  const [workouts, cardio, golf, study, stretch, sleep, body] = await Promise.all([
    supabase.from('workout_sessions').select('*, workout_exercises(*)').order('date', { ascending: false }).limit(limit),
    supabase.from('cardio_logs').select('*').order('date', { ascending: false }).limit(limit),
    supabase.from('golf_logs').select('*').order('date', { ascending: false }).limit(limit),
    supabase.from('study_logs').select('*').order('date', { ascending: false }).limit(limit),
    supabase.from('stretching_logs').select('*').order('date', { ascending: false }).limit(limit),
    supabase.from('sleep_logs').select('*').order('date', { ascending: false }).limit(limit),
    supabase.from('body_measurements').select('*').order('date', { ascending: false }).limit(limit),
  ])

  const combine = (arr, type) => (arr.data || []).map(r => ({ ...r, _type: type }))
  return [
    ...combine(workouts, 'workout'),
    ...combine(cardio, 'cardio'),
    ...combine(golf, 'golf'),
    ...combine(study, 'study'),
    ...combine(stretch, 'stretch'),
    ...combine(sleep, 'sleep'),
    ...combine(body, 'body'),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))
}

