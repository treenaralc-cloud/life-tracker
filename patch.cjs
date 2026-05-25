const fs = require('fs');
let code = fs.readFileSync('src/pages/LogPage.jsx', 'utf8');

code = code.replace(
  "import { addWorkoutSession, addCardioLog, addGolfLog, addStudyLog, addStretchingLog, addSleepLog, addBodyMeasurement } from '../utils/db'",
  "import { addWorkoutSession, addCardioLog, addGolfLog, addStudyLog, addStretchingLog, addSleepLog, addBodyMeasurement, updateWorkoutSession, updateCardioLog, updateGolfLog, updateStudyLog, updateStretchingLog, updateSleepLog, updateBodyMeasurement } from '../utils/db'"
);

code = code.replace(
  "const [notes, setNotes]   = useState('')",
  "const [notes, setNotes]   = useState(initialState?.notes || '')"
);
code = code.replace(
  "await addWorkoutSession(date, notes, exData)",
  "if (initialState?.id) await updateWorkoutSession(initialState.id, date, notes, exData)\n      else await addWorkoutSession(date, notes, exData)"
);

code = code.replace(
  "function CardioForm({ onSuccess })",
  "function CardioForm({ onSuccess, initialState })"
);
code = code.replace(
  "const [f, setF] = useState({ date: today, type: 'วิ่ง', duration_minutes: '', distance_km: '', calories: '', notes: '' })",
  "const [f, setF] = useState(initialState || { date: today, type: 'วิ่ง', duration_minutes: '', distance_km: '', calories: '', notes: '' })"
);
code = code.replace(
  "await addCardioLog({ ...f, duration_minutes: parseInt(f.duration_minutes), distance_km: f.distance_km ? parseFloat(f.distance_km) : null, calories: f.calories ? parseInt(f.calories) : null })",
  "const payload = { date: f.date, type: f.type, duration_minutes: parseInt(f.duration_minutes), distance_km: f.distance_km ? parseFloat(f.distance_km) : null, calories: f.calories ? parseInt(f.calories) : null, notes: f.notes };\n      if (initialState?.id) await updateCardioLog(initialState.id, payload);\n      else await addCardioLog(payload);"
);

code = code.replace(
  "function GolfForm({ onSuccess })",
  "function GolfForm({ onSuccess, initialState })"
);
code = code.replace(
  "const [f, setF] = useState({ date: today, location: '', session_type: 'Driving Range', duration_minutes: '', notes: '' })",
  "const [f, setF] = useState(initialState || { date: today, location: '', session_type: 'Driving Range', duration_minutes: '', notes: '' })"
);
code = code.replace(
  "await addGolfLog({ ...f, duration_minutes: f.duration_minutes ? parseInt(f.duration_minutes) : null })",
  "const payload = { date: f.date, location: f.location, session_type: f.session_type, duration_minutes: f.duration_minutes ? parseInt(f.duration_minutes) : null, notes: f.notes };\n      if (initialState?.id) await updateGolfLog(initialState.id, payload);\n      else await addGolfLog(payload);"
);

code = code.replace(
  "function StudyForm({ onSuccess })",
  "function StudyForm({ onSuccess, initialState })"
);
code = code.replace(
  "const [f, setF] = useState({ date: today, subject: '', duration_minutes: '', source: 'หนังสือ', notes: '' })",
  "const [f, setF] = useState(initialState || { date: today, subject: '', duration_minutes: '', source: 'หนังสือ', notes: '' })"
);
code = code.replace(
  "await addStudyLog({ ...f, duration_minutes: parseInt(f.duration_minutes) })",
  "const payload = { date: f.date, subject: f.subject, duration_minutes: parseInt(f.duration_minutes), source: f.source, notes: f.notes };\n      if (initialState?.id) await updateStudyLog(initialState.id, payload);\n      else await addStudyLog(payload);"
);

code = code.replace(
  "function StretchForm({ onSuccess })",
  "function StretchForm({ onSuccess, initialState })"
);
code = code.replace(
  "const [f, setF] = useState({ date: today, duration_minutes: '', type: 'Static', muscle_groups: [], notes: '' })",
  "const [f, setF] = useState(initialState || { date: today, duration_minutes: '', type: 'Static', muscle_groups: [], notes: '' })"
);
code = code.replace(
  "await addStretchingLog({ ...f, duration_minutes: parseInt(f.duration_minutes) })",
  "const payload = { date: f.date, duration_minutes: parseInt(f.duration_minutes), type: f.type, muscle_groups: f.muscle_groups, notes: f.notes };\n      if (initialState?.id) await updateStretchingLog(initialState.id, payload);\n      else await addStretchingLog(payload);"
);

code = code.replace(
  "function SleepForm({ onSuccess })",
  "function SleepForm({ onSuccess, initialState })"
);
code = code.replace(
  "const [f, setF] = useState({ date: today, sleep_time: '', wake_time: '', quality: '3', notes: '' })",
  "const [f, setF] = useState(initialState || { date: today, sleep_time: '', wake_time: '', quality: '3', notes: '' })"
);
code = code.replace(
  /const payload = \{\s*\.\.\.f,\s*quality: parseInt\(f\.quality\),\s*duration_hours: parseFloat\(\(\(wake - sleep\) \/ 3600000\)\.toFixed\(2\)\)\s*\}/,
  "const payload = { date: f.date, sleep_time: f.sleep_time, wake_time: f.wake_time, notes: f.notes, quality: parseInt(f.quality), duration_hours: parseFloat(((wake - sleep) / 3600000).toFixed(2)) }"
);
code = code.replace(
  "await addSleepLog(payload)",
  "if (initialState?.id) await updateSleepLog(initialState.id, payload);\n      else await addSleepLog(payload);"
);

code = code.replace(
  "function BodyForm({ onSuccess })",
  "function BodyForm({ onSuccess, initialState })"
);
code = code.replace(
  "const [f, setF] = useState({ date: today, weight_kg: '', body_fat_percent: '', muscle_mass_kg: '', waist_cm: '', notes: '' })",
  "const [f, setF] = useState(initialState || { date: today, weight_kg: '', body_fat_percent: '', muscle_mass_kg: '', waist_cm: '', notes: '' })"
);
code = code.replace(
  "const payload = {",
  "const payload = {\n        date: f.date,\n        notes: f.notes,"
);
code = code.replace(
  "await addBodyMeasurement(payload)",
  "if (initialState?.id) await updateBodyMeasurement(initialState.id, payload);\n      else await addBodyMeasurement(payload);"
);

code = code.replace(
  "if (location.state?.routine && location.state.routine.category === selected) {",
  `if (location.state?.editLog) {
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
  } else if (location.state?.routine && location.state.routine.category === selected) {`
);

code = code.replace(
  "const location = useLocation()",
  "const location = useLocation()\n  const isEditMode = !!location.state?.editLog"
);
code = code.replace(
  "const [selected, setSelected] = useState(location.state?.routine?.category || null)",
  "const [selected, setSelected] = useState(location.state?.editType || location.state?.routine?.category || null)"
);
code = code.replace(
  "if (location.state?.routine?.category) {",
  "if (location.state?.editType) {\n      setSelected(location.state.editType)\n    } else if (location.state?.routine?.category) {"
);

// We should also replace the back button functionality so it says "ยกเลิก" if in edit mode
code = code.replace(
  "← กลับ",
  "{isEditMode ? '✕ ยกเลิกแก้ไข' : '← กลับ'}"
);
code = code.replace(
  "onClick={() => setSelected(null)}",
  "onClick={() => {\n              if (isEditMode) window.history.back()\n              else setSelected(null)\n            }}"
);

fs.writeFileSync('src/pages/LogPage.jsx', code);
console.log('Done!');
