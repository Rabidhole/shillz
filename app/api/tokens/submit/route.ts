'use server'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/app/types/database'
import { isAddress } from 'ethers'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, contract_address, chain, description, image_url } = body
    
    console.log('Received token submission:', {
      name,
      contract_address,
      chain,
      description: description || 'none',
      image_url: image_url || 'none'
    })

    // Validate contract address
    if (!contract_address || !isAddress(contract_address)) {
      return NextResponse.json(
        { error: 'Invalid contract address format' },
        { status: 400 }
      )
    }

    // Basic validation
    if (!name?.trim() || !chain?.trim()) {
      return NextResponse.json(
        { error: 'Name and chain are required' },
        { status: 400 }
      )
    }

    // Check if token already exists
    const { data: existingToken, error: searchError } = await supabaseAdmin
      .from('tokens_new')
      .select('id')
      .eq('contract_address', contract_address.toLowerCase())
      .single()

    if (searchError) {
      console.error('Error checking existing token:', searchError)
      return NextResponse.json(
        { error: `Error checking token existence: ${searchError.message}` },
        { status: 500 }
      )
    }

    if (existingToken) {
      return NextResponse.json(
        { 
          error: 'Token already exists',
          tokenId: existingToken.id
        },
        { status: 400 }
      )
    }

    // Insert new token
    const { data: newToken, error: insertError } = await supabaseAdmin
      .from('tokens_new')
      .insert({
        name,
        contract_address: contract_address.toLowerCase(),
        chain,
        description,
        image_url
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting token:', insertError)
      return NextResponse.json(
        { error: `Failed to insert token: ${insertError.message}` },
        { status: 400 }
      )
    }
    
    console.log('Successfully added token:', newToken)

    return NextResponse.json({
      success: true,
      token: newToken
    })

  } catch (error) {
    console.error('Error in submit token route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
