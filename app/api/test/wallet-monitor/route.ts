import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🧪 Testing wallet monitoring...')
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/monitor/wallet`)
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Wallet monitoring test completed',
      result: data
    })
  } catch (error) {
    console.error('Wallet monitoring test error:', error)
    return NextResponse.json(
      { error: 'Wallet monitoring test failed' },
      { status: 500 }
    )
  }
}
