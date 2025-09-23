const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixDuplicates() {
  console.log('🔍 Finding duplicate transaction hashes...')
  
  // Find all transaction hashes with duplicates
  const { data: duplicates, error: duplicateError } = await supabase
    .from('user_boosters')
    .select('transaction_hash, id, created_at, is_active')
    .not('transaction_hash', 'is', null)
    .order('transaction_hash')
    .order('created_at')

  if (duplicateError) {
    console.error('Error finding duplicates:', duplicateError)
    return
  }

  console.log(`Found ${duplicates.length} total records`)

  // Group by transaction_hash
  const grouped = duplicates.reduce((acc, record) => {
    const hash = record.transaction_hash
    if (!acc[hash]) acc[hash] = []
    acc[hash].push(record)
    return acc
  }, {})

  // Find hashes with duplicates
  const duplicateHashes = Object.keys(grouped).filter(hash => grouped[hash].length > 1)
  
  console.log(`Found ${duplicateHashes.length} transaction hashes with duplicates:`)
  duplicateHashes.forEach(hash => {
    console.log(`  ${hash}: ${grouped[hash].length} records`)
  })

  // Deactivate all but the first occurrence of each duplicate
  let totalDeactivated = 0
  for (const hash of duplicateHashes) {
    const records = grouped[hash].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    const toDeactivate = records.slice(1) // Keep first, deactivate rest
    
    console.log(`Deactivating ${toDeactivate.length} duplicate records for ${hash}`)
    
    for (const record of toDeactivate) {
      const { error } = await supabase
        .from('user_boosters')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id)
      
      if (error) {
        console.error(`Error deactivating record ${record.id}:`, error)
      } else {
        totalDeactivated++
        console.log(`  ✅ Deactivated record ${record.id}`)
      }
    }
  }

  console.log(`\n🎉 Successfully deactivated ${totalDeactivated} duplicate records`)
  console.log('Now you can apply the unique constraint!')
}

fixDuplicates().catch(console.error)
