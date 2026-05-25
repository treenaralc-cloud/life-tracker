// scripts/setup-database.js
// รันครั้งเดียวเพื่อสร้างตารางฐานข้อมูลทั้งหมดบน Supabase อัตโนมัติค่ะบอส!
// คำสั่ง: node scripts/setup-database.js

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── อ่านค่าจาก .env ──
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
const SERVICE_KEY  = env.VITE_SUPABASE_SERVICE_KEY || ''

// ── อ่านไฟล์ SQL ──
const sqlPath = path.join(__dirname, '..', 'supabase_schema.sql')
const fullSql = fs.readFileSync(sqlPath, 'utf8')

// แยก SQL เป็น statement ย่อยๆ (แยกด้วย ; ที่ตามด้วย newline)
function splitStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
    .map(s => s.endsWith(';') ? s : s + ';')
}

// ── เรียก Supabase REST API ──
async function runSQL(sql) {
  const url = new URL('/rest/v1/rpc/exec_sql', SUPABASE_URL)
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ── เรียก Supabase direct SQL via pg ──
async function runWithPg(sql) {
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
  console.log('  ✅ เชื่อมต่อฐานข้อมูลสำเร็จค่ะ!')

  // รัน SQL ทีละ statement
  const statements = splitStatements(sql)
  let success = 0, skipped = 0

  for (const stmt of statements) {
    if (!stmt || stmt === ';') continue
    try {
      await client.query(stmt)
      success++
      process.stdout.write('.')
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        skipped++
        process.stdout.write('s')
      } else {
        console.warn(`\n  ⚠️  ${err.message.slice(0, 80)}`)
      }
    }
  }

  await client.end()
  console.log(`\n  ✅ รันสำเร็จ ${success} statements, ข้าม ${skipped} (มีอยู่แล้ว)`)
}

// ── Main ──
async function main() {
  console.log('\n╔════════════════════════════════════════╗')
  console.log('║  🔧 Life Tracker — Database Setup      ║')
  console.log('╚════════════════════════════════════════╝\n')

  if (!SUPABASE_URL) {
    console.error('❌ ไม่พบ VITE_SUPABASE_URL ใน .env ค่ะ')
    process.exit(1)
  }

  console.log(`📡 Project: ${SUPABASE_URL}`)
  console.log('📄 กำลังโหลด SQL Schema...')
  console.log(`   พบ ${splitStatements(fullSql).length} SQL statements\n`)

  try {
    console.log('🚀 กำลังสร้างตารางฐานข้อมูล...')
    await runWithPg(fullSql)

    console.log('\n╔════════════════════════════════════════╗')
    console.log('║  🎉 Setup เสร็จสมบูรณ์แล้วค่ะบอส!     ║')
    console.log('║  ตอนนี้บันทึกข้อมูลได้แล้วนะคะ 💪      ║')
    console.log('╚════════════════════════════════════════╝\n')
  } catch (err) {
    console.error('\n❌ เกิดข้อผิดพลาด:', err.message)
    console.log('\n💡 วิธีแก้: ตรวจสอบ SUPABASE_DB_PASSWORD ใน .env ค่ะ')
    process.exit(1)
  }
}

main()
