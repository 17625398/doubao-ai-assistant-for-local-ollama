import { NextRequest, NextResponse } from 'next/server'
import { governanceService } from '@core/services/governance-service'

export async function GET() {
  try {
    const stats = governanceService.getCacheStats()
    return NextResponse.json({ success: true, ...stats })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const pattern = searchParams.get('pattern')
  try {
    const count = governanceService.invalidateCache(pattern || undefined)
    return NextResponse.json({ success: true, invalidated: count })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
