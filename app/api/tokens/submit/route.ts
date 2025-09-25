'use server'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/app/types/database'
import { isAddress } from 'ethers'

const supabaseAdmin = createClient(
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

    // Check if token already exists (contract address must be unique across all chains)
    const { data: existingTokens, error: searchError } = await supabaseAdmin
      .from('tokens_new')
      .select('id, name, chain')
      .eq('contract_address', contract_address.toLowerCase())

    if (searchError) {
      console.error('Error checking existing token:', searchError)
      return NextResponse.json(
        { error: `Error checking token existence: ${searchError.message}` },
        { status: 500 }
      )
    }

    if (existingTokens && existingTokens.length > 0) {
      const existingToken = existingTokens[0]
      return NextResponse.json(
        { 
          error: `Token with contract address ${contract_address} already exists as "${existingToken.name}" on ${existingToken.chain}`,
          tokenId: existingToken.id,
          existingName: existingToken.name,
          existingChain: existingToken.chain
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
