#!/usr/bin/env node
/**
 * Apply migration 091 via DATABASE_URL (direct Postgres connection).
 * Usage: DATABASE_URL=postgresql://... node scripts/apply-advisor-rag-migration.mjs
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sqlPath = join(__dirname, '../supabase/migrations/091_advisor_vector_index.sql')

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    console.error('Missing DATABASE_URL.')
    console.error('Get it from Supabase → Project Settings → Database → Connection string (URI).')
    console.error('Then run:')
    console.error('  DATABASE_URL="postgresql://..." node scripts/apply-advisor-rag-migration.mjs')
    console.error('')
    console.error(
      'Or paste supabase/migrations/091_advisor_vector_index.sql into Supabase SQL Editor.'
    )
    process.exit(1)
  }

  let pg
  try {
    pg = await import('pg')
  } catch {
    console.error('Install pg first: npm install --save-dev pg')
    process.exit(1)
  }

  const sql = readFileSync(sqlPath, 'utf8')
  const client = new pg.default.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    await client.query(sql)
    console.log('Migration 091 applied successfully.')
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
