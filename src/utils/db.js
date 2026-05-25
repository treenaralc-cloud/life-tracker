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
    
    // Auto-update exercise library (fire and forget)
    Promise.all(exercises.map(e => 
      upsertExerciseInLibrary(e.exercise_name, e.muscle_group, e.sets)
    )).catch(err => console.error('Failed to update exercise library', err))
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

// ──────────────────────────────────────────
// PHASE 2: ROUTINES & SCHEDULE
// ──────────────────────────────────────────

export const getRoutines = async () => {
  const { data, error } = await supabase
    .from('routines')
    .select('*, routine_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createRoutine = async (routinePayload, itemsPayload) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: routine, error } = await supabase
    .from('routines')
    .insert({ user_id: user.id, ...routinePayload })
    .select().single()
  
  if (error) throw error
  
  if (itemsPayload && itemsPayload.length > 0) {
    const items = itemsPayload.map((item, idx) => ({
      routine_id: routine.id,
      ...item,
      sort_order: idx
    }))
    const { error: itemsError } = await supabase.from('routine_items').insert(items)
    if (itemsError) throw itemsError
  }
  
  return routine
}

export const updateRoutine = async (id, routinePayload, itemsPayload) => {
  const { data: routine, error } = await supabase
    .from('routines')
    .update(routinePayload)
    .eq('id', id)
    .select().single()
  
  if (error) throw error

  // Simple approach for items: delete all and recreate
  await supabase.from('routine_items').delete().eq('routine_id', id)
  
  if (itemsPayload && itemsPayload.length > 0) {
    const items = itemsPayload.map((item, idx) => ({
      routine_id: id,
      ...item,
      sort_order: idx
    }))
    await supabase.from('routine_items').insert(items)
  }
  
  return routine
}

export const deleteRoutine = async (id) => {
  const { error } = await supabase.from('routines').delete().eq('id', id)
  if (error) throw error
}

export const getScheduleLogs = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('schedule_logs')
    .select('*, routines(*, routine_items(*))')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
  if (error) throw error
  return data
}

export const updateScheduleLogStatus = async (id, status, quick_note = null) => {
  const { error } = await supabase
    .from('schedule_logs')
    .update({ 
      status, 
      quick_note, 
      completed_at: status === 'done' ? new Date().toISOString() : null 
    })
    .eq('id', id)
  if (error) throw error
}

// ──────────────────────────────────────────
// PHASE 2: EXERCISE LIBRARY
// ──────────────────────────────────────────

export const searchExercises = async (query = '') => {
  let req = supabase.from('exercise_library').select('*')
  if (query) {
    req = req.ilike('exercise_name', `%${query}%`)
  }
  const { data, error } = await req.order('use_count', { ascending: false }).limit(20)
  if (error) throw error
  return data
}

export const upsertExerciseInLibrary = async (exercise_name, muscle_group, last_sets) => {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: existing } = await supabase
    .from('exercise_library')
    .select('id, use_count')
    .eq('user_id', user.id)
    .eq('exercise_name', exercise_name)
    .single()
    
  if (existing) {
    const { error } = await supabase
      .from('exercise_library')
      .update({
        muscle_group: muscle_group || null,
        last_sets,
        last_used: new Date().toISOString().split('T')[0],
        use_count: existing.use_count + 1
      })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('exercise_library')
      .insert({
        user_id: user.id,
        exercise_name,
        muscle_group: muscle_group || null,
        last_sets,
        last_used: new Date().toISOString().split('T')[0],
        use_count: 1
      })
    if (error) throw error
  }
}

// ──────────────────────────────────────────
// PHASE 3: ONE-OFF TASKS
// ──────────────────────────────────────────

export const addOneOffTask = async (task) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('one_off_tasks')
    .insert({ user_id: user.id, ...task })
    .select().single()
  if (error) throw error
  return data
}

export const getOneOffTasksByDateRange = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('one_off_tasks')
    .select('*')
    .gte('task_date', startDate)
    .lte('task_date', endDate)
    .order('task_time', { ascending: true })
  if (error) throw error
  return data
}

export const updateOneOffTaskStatus = async (id, status, quick_note = null) => {
  const { error } = await supabase
    .from('one_off_tasks')
    .update({ 
      status, 
      quick_note, 
      completed_at: status === 'done' ? new Date().toISOString() : null 
    })
    .eq('id', id)
  if (error) throw error
}

export const deleteOneOffTask = async (id) => {
  const { error } = await supabase
    .from('one_off_tasks')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ──────────────────────────────────────────
// PHASE 3: SETTINGS (iCal)
// ──────────────────────────────────────────

export const saveIcalUrl = async (url) => {
  const { error } = await supabase.auth.updateUser({
    data: { ical_url: url }
  })
  if (error) throw error
}

export const getIcalUrl = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.user_metadata?.ical_url || null
}

export const fetchCalendarEvents = async (url, startDate, endDate) => {
  if (!url) return []
  try {
    const res = await fetch(`/api/calendar?url=${encodeURIComponent(url)}&start=${startDate}&end=${endDate}`)
    if (!res.ok) throw new Error('Failed to fetch calendar')
    const data = await res.json()
    return data
  } catch (err) {
    console.error(err)
    return []
  }
}

// ──────────────────────────────────────────
// PHASE 3: GAMIFICATION (XP & LEVEL)
// ──────────────────────────────────────────

export const getGamificationStats = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('gamification_stats')
    .select('*')
    .eq('user_id', user.id)
    .single()
    
  if (error && error.code === 'PGRST116') {
    // Record not found, create one
    const newStats = { user_id: user.id, xp_points: 0, current_level: 1, current_streak: 0, longest_streak: 0 }
    await supabase.from('gamification_stats').insert(newStats)
    return newStats
  }
  return data
}

export const addXp = async (amount) => {
  const stats = await getGamificationStats()
  const newXp = (stats.xp_points || 0) + amount
  const newLevel = Math.floor(newXp / 100) + 1
  
  const { error } = await supabase
    .from('gamification_stats')
    .update({ xp_points: newXp, current_level: newLevel })
    .eq('id', stats.id)
    
  if (error) throw error
  return { newXp, newLevel, leveledUp: newLevel > stats.current_level }
}

// ──────────────────────────────────────────
// PHASE 3: PROGRESS PHOTOS
// ──────────────────────────────────────────

export const uploadProgressPhoto = async (file, notes) => {
  const { data: { user } } = await supabase.auth.getUser()
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Math.random()}.${fileExt}`
  const filePath = `${fileName}`
  
  const { error: uploadError } = await supabase.storage
    .from('progress_photos')
    .upload(filePath, file)
    
  if (uploadError) throw uploadError
  
  const { data: { publicUrl } } = supabase.storage
    .from('progress_photos')
    .getPublicUrl(filePath)
    
  const { error: dbError } = await supabase.from('progress_photos').insert({
    user_id: user.id,
    photo_url: publicUrl,
    notes,
    date: new Date().toISOString().split('T')[0]
  })
  if (dbError) throw dbError
}

export const getProgressPhotos = async () => {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const deleteProgressPhoto = async (id, photo_url) => {
  // Extract path from public URL
  const urlParts = photo_url.split('/')
  const fileName = urlParts[urlParts.length - 1]
  const userId = urlParts[urlParts.length - 2]
  const filePath = `${userId}/${fileName}`
  
  await supabase.storage.from('progress_photos').remove([filePath])
  await supabase.from('progress_photos').delete().eq('id', id)
}

// ──────────────────────────────────────────
// PHASE 3: GOAL SUBTASKS
// ──────────────────────────────────────────

export const getGoalSubtasks = async (goalId) => {
  const { data, error } = await supabase
    .from('goal_subtasks')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at')
  if (error) throw error
  return data
}

export const addGoalSubtask = async (goalId, title) => {
  const { error } = await supabase
    .from('goal_subtasks')
    .insert({ goal_id: goalId, title })
  if (error) throw error
}

export const updateGoalSubtaskStatus = async (id, status) => {
  const { error } = await supabase
    .from('goal_subtasks')
    .update({ status, completed_at: status === 'done' ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

export const deleteGoalSubtask = async (id) => {
  const { error } = await supabase
    .from('goal_subtasks')
    .delete()
    .eq('id', id)
  if (error) throw error
}
