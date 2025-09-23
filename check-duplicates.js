const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate transaction hashes...')
  
  const { data: records, error } = await supabase
    .from('user_boosters')
    .select('transaction_hash, id, user_id, created_at, is_active')
    .not('transaction_hash', 'is', null)
    .order('transaction_hash')
    .order('created_at')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${records.length} total records with transaction hashes`)

  // Group by transaction_hash
  const grouped = records.reduce((acc, record) => {
    const hash = record.transaction_hash
    if (!acc[hash]) acc[hash] = []
    acc[hash].push(record)
    return acc
  }, {})

  // Find hashes with duplicates
  const duplicateHashes = Object.keys(grouped).filter(hash => grouped[hash].length > 1)
  
  if (duplicateHashes.length === 0) {
    console.log('✅ No duplicate transaction hashes found!')
    return
  }

  console.log(`\n❌ Found ${duplicateHashes.length} transaction hashes with duplicates:`)
  duplicateHashes.forEach(hash => {
    const records = grouped[hash]
    console.log(`\n📋 ${hash}:`)
    records.forEach((record, i) => {
      console.log(`  ${i + 1}. ID: ${record.id}, User: ${record.user_id}, Active: ${record.is_active}, Created: ${record.created_at}`)
    })
  })

  console.log('\n🔧 To fix this, you need to:')
  console.log('1. Deactivate all but the first occurrence of each duplicate')
  console.log('2. Then apply the unique constraint')
}

checkDuplicates().catch(console.error)
