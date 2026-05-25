import { useState, useEffect, useRef } from 'react'
import { searchExercises } from '../utils/db'

export default function ExerciseAutocomplete({ value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchDebounce = setTimeout(async () => {
      try {
        const data = await searchExercises(query)
        setResults(data)
      } catch (err) {
        console.error('Failed to fetch exercises:', err)
      }
    }, 300)
    return () => clearTimeout(fetchDebounce)
  }, [query])

  const handleInputChange = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    setShowDropdown(true)
  }

  const handleSelect = (exercise) => {
    setQuery(exercise.exercise_name)
    onChange(exercise.exercise_name)
    setShowDropdown(false)
    if (onSelect) onSelect(exercise)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1, marginRight: 8 }}>
      <input
        className="form-input exercise-name-input"
        placeholder="ชื่อท่า เช่น Bench Press"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        style={{ width: '100%' }}
      />
      {showDropdown && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-md)',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 50,
          maxHeight: 200,
          overflowY: 'auto',
          marginTop: 4
        }}>
          {results.map((ex) => (
            <div
              key={ex.id}
              onClick={() => handleSelect(ex)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{ex.exercise_name}</div>
                {ex.muscle_group && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{ex.muscle_group}</div>}
              </div>
              {ex.last_sets && ex.last_sets.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--accent)', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                  ล่าสุด: {ex.last_sets[0].weight_kg}kg
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
