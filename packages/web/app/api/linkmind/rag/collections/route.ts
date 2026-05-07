import { NextRequest, NextResponse } from 'next/server'
import { ragService, type CollectionConfig } from '@core/services/rag-service'

export async function GET() {
  try {
    const collections = ragService.listCollections()
    return NextResponse.json({ success: true, collections })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, config } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing "name" field' }, { status: 400 })
    }

    await ragService.createCollection(name, config as Partial<CollectionConfig>)

    return NextResponse.json({ success: true, name })
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 })
    }
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    )
  }
}
