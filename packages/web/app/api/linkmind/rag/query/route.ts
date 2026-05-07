import { NextRequest, NextResponse } from 'next/server'
import { ragService } from '@core/services/rag-service'
import type { RAGResult } from '@core/services/rag-service'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { collection, query, topK = 5, minScore = 0.2, rerank = false } = body

    if (!collection || !query) {
      return NextResponse.json(
        { success: false, error: 'Missing "collection" or "query"' },
        { status: 400 }
      )
    }

    const results = await ragService.query(query, collection, {
      topK,
      minScore,
      rerank,
    })

    const durationMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      results: results.map((r: RAGResult) => ({
        chunkId: r.chunk.id,
        text: r.chunk.text,
        score: r.score,
        rerankScore: r.rerankScore,
        highlightedText: r.highlightedText,
        source: r.chunk.metadata.source,
        metadata: r.chunk.metadata,
      })),
      query,
      durationMs,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    )
  }
}
