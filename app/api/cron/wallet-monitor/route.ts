import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('⏰ Running scheduled wallet monitoring...')
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/monitor/wallet`)
    const data = await response.json()
    
    console.log('✅ Wallet monitoring completed:', data)
    
    return NextResponse.json({
      success: true,
      message: 'Scheduled wallet monitoring completed',
      result: data
    })
  } catch (error) {
    console.error('Scheduled wallet monitoring error:', error)
    return NextResponse.json(
      { error: 'Scheduled wallet monitoring failed' },
      { status: 500 }
    )
  }
}
