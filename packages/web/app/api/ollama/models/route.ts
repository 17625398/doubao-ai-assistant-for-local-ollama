/**
 * Ollama 模型管理 API
 * 提供模型列表获取、模型信息查询等功能
 */

import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import https from 'https';

function getUpstreamBaseUrl(request?: Request): string {
  const clientUpstream = request?.headers.get('x-doubao-ollama-upstream')?.trim();
  if (clientUpstream) {
    try {
      const url = new URL(clientUpstream);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return clientUpstream.endsWith('/') ? clientUpstream.slice(0, -1) : clientUpstream;
      }
    } catch {
      // 忽略无效 URL
    }
  }
  const envUrl = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';
  return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
}

async function makeOllamaRequest(
  path: string,
  method: string = 'GET',
  body?: object
): Promise<{ status: number; statusText: string; body: string }> {
  const upstreamBaseUrl = getUpstreamBaseUrl();
  const upstreamUrl = `${upstreamBaseUrl}${path}`;

  return new Promise((resolve, reject) => {
    const url = new URL(upstreamUrl);
    const client = url.protocol === 'https:' ? https : http;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (body) {
      headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body)).toString();
    }

    const req = client.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers,
        timeout: 30000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 200,
            statusText: res.statusMessage || 'OK',
            body: Buffer.concat(chunks).toString('utf-8'),
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// GET /api/ollama/models - 获取模型列表
export async function GET(request: NextRequest) {
  try {
    const response = await makeOllamaRequest('/api/tags');

    if (response.status !== 200) {
      return NextResponse.json(
        { error: `Ollama API error: ${response.status} ${response.statusText}`, details: response.body },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(response.body);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse Ollama response', raw: response.body },
        { status: 500 }
      );
    }

    // 返回模型列表
    return NextResponse.json({
      success: true,
      models: data.models || [],
      count: data.models?.length || 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Ollama Models API] Error:', message);

    return NextResponse.json(
      { success: false, error: `Failed to fetch models: ${message}` },
      { status: 500 }
    );
  }
}
