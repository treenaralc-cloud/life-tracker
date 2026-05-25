import { useState, useEffect, useRef } from 'react'
import { getProgressPhotos, uploadProgressPhoto, deleteProgressPhoto } from '../utils/db'
import { format } from 'date-fns'

export default function ProgressGalleryPage() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadPhotos()
  }, [])

  async function loadPhotos() {
    try {
      const data = await getProgressPhotos()
      setPhotos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      await uploadProgressPhoto(file, '')
      await loadPhotos()
    } catch (err) {
      console.error(err)
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (id, photo_url) => {
    if (!window.confirm('ต้องการลบรูปภาพนี้ใช่ไหม?')) return
    try {
      await deleteProgressPhoto(id, photo_url)
      setPhotos(photos.filter(p => p.id !== id))
    } catch (err) {
      console.error(err)
      alert('Delete failed')
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">📸 คลังภาพพัฒนาการ</h1>
          <p className="page-subtitle">บันทึกและดูการเปลี่ยนแปลงของร่างกาย</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'กำลังอัปโหลด...' : '+ อัปโหลดรูป'}
        </button>
        <input 
          type="file" 
          accept="image/*" 
          style={{ display: 'none' }} 
          ref={fileInputRef}
          onChange={handleUpload}
        />
      </div>

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
          <h3>ยังไม่มีรูปภาพ</h3>
          <p>ถ่ายรูปวันนี้เพื่อบันทึกการเริ่มต้นเลยค่ะบอส!</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
          gap: 16,
          marginTop: 20
        }}>
          {photos.map(p => (
            <div key={p.id} style={{ 
              position: 'relative', 
              aspectRatio: '3/4', 
              borderRadius: 'var(--radius)', 
              overflow: 'hidden',
              background: '#000',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <img 
                src={p.photo_url} 
                alt="Progress" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                padding: '24px 12px 12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'
              }}>
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>
                  {format(new Date(p.date), 'd MMM yyyy')}
                </span>
                <button 
                  onClick={() => handleDelete(p.id, p.photo_url)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
