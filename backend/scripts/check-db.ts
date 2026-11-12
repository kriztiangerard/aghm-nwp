import 'dotenv/config'
import { Client } from 'pg'

const requiredTables = [
  'vendor',
  'distributor',
  'device',
  'capability',
  'device_capability',
  'gateway_router_specifications',
  'switch_specifications',
  'ap_specifications',
  'firewall_specifications',
  'rack_specifications',
  'pricing_source',
  'pricing',
  'update_log',
]

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }

  console.log('✓ DATABASE_URL is configured')

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('✓ PostgreSQL connection successful')

    await client.query('SELECT 1')
    console.log('✓ Query execution successful')

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `)

    const existingTables = new Set(
      result.rows.map((row) => row.table_name)
    )

    const missingTables = requiredTables.filter(
      (table) => !existingTables.has(table)
    )

    if (missingTables.length > 0) {
      console.error('✗ Missing required tables:')
      missingTables.forEach((table) => {
        console.error(`  - ${table}`)
      })

      process.exitCode = 1
      return
    }

    requiredTables.forEach((table) => {
      console.log(`✓ ${table} table exists`)
    })

    console.log('\nDatabase connectivity and schema check passed.')
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('\n✗ Database connectivity check failed')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
