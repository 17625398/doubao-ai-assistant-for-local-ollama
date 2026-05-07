import { NextRequest, NextResponse } from 'next/server'
import { governanceService } from '@core/services/governance-service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') as any || 'today'

  try {
    const stats = governanceService.getTokenStats(period)
    return NextResponse.json({ success: true, ...stats })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
