import { NextResponse } from 'next/server'
import { governanceService } from '@core/services/governance-service'

export async function GET() {
  try {
    const data = governanceService.getDailyRemaining()
    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
