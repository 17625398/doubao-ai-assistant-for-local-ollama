import { NextRequest, NextResponse } from 'next/server'
import { governanceService } from '@core/services/governance-service'

export async function GET() {
  try {
    const rules = governanceService.getFilterRules()
    return NextResponse.json({ success: true, rules })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = governanceService.addFilterRule(body)
    return NextResponse.json({ success: true, id })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })

  try {
    const ok = governanceService.removeFilterRule(id)
    return NextResponse.json({ success: ok })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
