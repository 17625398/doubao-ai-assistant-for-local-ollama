import { NextRequest, NextResponse } from 'next/server'
import { ragService } from '@core/services/rag-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { collection, documents } = body

    if (!collection || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing "collection" or "documents"' },
        { status: 400 }
      )
    }

    const result = await ragService.addDocuments(documents, collection)

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      chunksAdded: result.chunksAdded,
      errors: result.errors,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const collection = searchParams.get('collection')
    const source = searchParams.get('source')

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Missing "collection" param' },
        { status: 400 }
      )
    }

    let count: number
    if (source) {
      count = await ragService.deleteDocuments(collection, source)
    } else {
      const dropped = await ragService.dropCollection(collection)
      count = dropped ? -1 : 0
    }

    return NextResponse.json({ success: true, deletedCount: count })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    )
  }
}
