import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY // fallback for testing

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setup() {
  const { data, error } = await supabase.storage.createBucket('progress_photos', {
    public: false,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
  })
  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Bucket "progress_photos" already exists.')
    } else {
      console.error('❌ Error creating bucket:', error.message)
    }
  } else {
    console.log('✅ Created bucket "progress_photos"!')
  }
}
setup()
