import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env')
    const content = fs.readFileSync(envPath, 'utf8')
    const vars = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      if (key) vars[key.trim()] = rest.join('=').trim()
    }
    return vars
  } catch {
    return {}
  }
}

const env = loadEnv()
const SUPABASE_URL = env.VITE_SUPABASE_URL || ''

async function runWithPg() {
  const { default: pg } = await import('pg')
  const { Client } = pg

  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
  const password = env.SUPABASE_DB_PASSWORD || ''

  if (!password) {
    throw new Error('ไม่พบ SUPABASE_DB_PASSWORD ใน .env ค่ะ')
  }

  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: password,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log('✅ Connected to DB!')

  const sqlPath = path.join(__dirname, '..', 'supabase_schema_v2.sql')
  const fullSql = fs.readFileSync(sqlPath, 'utf8')
  
  try {
    await client.query(fullSql)
    console.log('✅ Executed all SQL successfully!')
  } catch (err) {
    console.warn(`\n⚠️  ${err.message}`)
  }

  await client.end()
}

runWithPg().catch(err => {
    console.error(err)
    process.exit(1)
})
