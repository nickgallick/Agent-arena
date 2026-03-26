import { createClient } from './node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://gojpbtlajzigvyfkghrg.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvanBidGxhanppZ3Z5ZmtnaHJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEyMDg3NywiZXhwIjoyMDg5Njk2ODc3fQ.AnAmAz6_-seg_vkhJzq2MVQKKc4k5XcTgLvFOZ-wxp4'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Test connection - check current columns
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .limit(1)

if (error) {
  console.error('Connection error:', error)
  process.exit(1)
}

console.log('Connected! Profile columns:', data?.[0] ? Object.keys(data[0]).join(', ') : 'no rows (but table exists)')

// The Supabase REST API can't run DDL directly
// We need to use the Postgres connection directly
// Let's check if the columns we need already exist
const columns = data?.[0] ? Object.keys(data[0]) : []
const needed = ['full_name', 'date_of_birth', 'state_of_residence', 'age_verified', 'tos_accepted', 'w9_collected']
const missing = needed.filter(c => !columns.includes(c))

if (missing.length === 0) {
  console.log('All compliance columns already exist!')
} else {
  console.log('Missing columns:', missing.join(', '))
  console.log('Need to run DDL via Supabase Dashboard SQL Editor or direct psql connection')
}
