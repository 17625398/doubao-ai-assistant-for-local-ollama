import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import https from 'https';
import { Readable } from 'stream';
import { URL } from 'url';

type RouteContext = { params: Promise<{ path: string[] }> };

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

function getUpstreamBaseUrl(): string {
  // 默认连接到中间机，避免宿主机的Ollama反向代理CORS问题
  const raw = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://15.167.118.248:11434';
  const trimmed = String(raw).trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

type NodeHttpProxyResult =
  | { status: number; statusText: string; headers: Record<string, string>; body: Buffer }
  | { status: number; statusText: string; headers: Record<string, string>; bodyStream: Readable };

// 使用Node.js原生http模块代理请求，避免fetch自动添加的CORS头
async function proxyWithNodeHttp(
  method: string,
  upstreamUrl: string,
  headers: Record<string, string>,
  body: Buffer | null,
  signal?: AbortSignal
): Promise<NodeHttpProxyResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(upstreamUrl);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: headers,
    };

    let resolved = false;
    const req = client.request(options, (res) => {
      const responseHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(res.headers)) {
        if (typeof value === 'string') {
          responseHeaders[key] = value;
        } else if (Array.isArray(value)) {
          responseHeaders[key] = value.join(', ');
        }
      }

      const status = res.statusCode || 200;
      const statusText = res.statusMessage || 'OK';

      if (status >= 400) {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          if (resolved) return;
          resolved = true;
          resolve({
            status,
            statusText,
            headers: responseHeaders,
            body: Buffer.concat(chunks),
          });
        });
        res.on('error', (err) => {
          if (resolved) return;
          resolved = true;
          reject(err);
        });
        return;
      }

      if (resolved) return;
      resolved = true;
      resolve({
        status,
        statusText,
        headers: responseHeaders,
        bodyStream: res as unknown as Readable,
      });
    });

    req.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      reject(err);
    });

    if (signal) {
      if (signal.aborted) {
        req.destroy(new Error('Request aborted'));
        return;
      }
      const onAbort = () => {
        req.destroy(new Error('Request aborted'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      req.once('close', () => signal.removeEventListener('abort', onAbort));
    }

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function proxy(request: Request, pathParts: string[]): Promise<Response> {
  const upstreamBaseUrl = getUpstreamBaseUrl();
  const url = new URL(request.url);
  
  // pathParts 是 /api/ollama/[...path] 中的 [...path] 部分
  let upstreamPath: string;
  if (pathParts.length > 0 && pathParts[0] === 'api') {
    upstreamPath = `/${pathParts.map((p) => encodeURIComponent(p)).join('/')}`;
  } else {
    upstreamPath = `/api/${pathParts.map((p) => encodeURIComponent(p)).join('/')}`;
  }
  
  const upstreamUrl = joinUrl(upstreamBaseUrl, upstreamPath);

  // 构建最小化的请求头
  const requestHeaders: Record<string, string> = {};
  const upstreamParsed = new URL(upstreamUrl);
  requestHeaders.Host = upstreamParsed.host;
  requestHeaders['User-Agent'] = 'doubao-web-proxy';
  
  // 只保留必要的头
  const contentType = request.headers.get('content-type');
  if (contentType) {
    requestHeaders['Content-Type'] = contentType;
  }
  
  const accept = request.headers.get('accept');
  if (accept) {
    requestHeaders['Accept'] = accept;
  }
  
  const authorization = request.headers.get('authorization');
  if (authorization) {
    requestHeaders['Authorization'] = authorization;
  }

  // 读取请求体
  let body: Buffer | null = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength > 0) {
      body = Buffer.from(arrayBuffer);
      requestHeaders['Content-Length'] = String(body.length);
    }
  }

  try {
    const result = await proxyWithNodeHttp(
      request.method,
      upstreamUrl,
      requestHeaders,
      body,
      request.signal
    );

    if (result.status >= 400 && 'body' in result) {
      const detail = result.body ? result.body.toString('utf8') : '';
      const truncated = detail.length > 4096 ? `${detail.slice(0, 4096)}…(truncated)` : detail;
      return NextResponse.json(
        {
          success: false,
          status: result.status,
          statusText: result.statusText,
          upstream: upstreamBaseUrl,
          upstreamUrl,
          detail: truncated,
        },
        { status: result.status, headers: { 'x-doubao-ollama-proxy': '1' } }
      );
    }

    // 构建响应头
    const responseHeaders = new Headers();
    responseHeaders.set('x-doubao-ollama-proxy', '1');
    for (const [key, value] of Object.entries(result.headers)) {
      // 过滤掉 hop-by-hop 头
      const lower = key.toLowerCase();
      if (
        lower === 'connection' ||
        lower === 'content-length' ||
        lower === 'transfer-encoding' ||
        lower === 'upgrade'
      ) {
        continue;
      }
      responseHeaders.set(key, value);
    }

    if ('bodyStream' in result) {
      return new Response(Readable.toWeb(result.bodyStream) as unknown as BodyInit, {
        status: result.status,
        statusText: result.statusText,
        headers: responseHeaders,
      });
    }

    return new Response(result.body as unknown as BodyInit, {
      status: result.status,
      statusText: result.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const anyError = error as { message?: unknown };
    const message = typeof anyError?.message === 'string' ? anyError.message : 'Upstream fetch failed';
    return NextResponse.json({ success: false, error: message, upstream: upstreamBaseUrl }, { status: 502 });
  }
}

export async function GET(request: NextRequest, ctx: RouteContext): Promise<Response> {
  const params = await ctx.params;
  return proxy(request, params.path || []);
}

export async function POST(request: NextRequest, ctx: RouteContext): Promise<Response> {
  const params = await ctx.params;
  return proxy(request, params.path || []);
}

export async function PUT(request: NextRequest, ctx: RouteContext): Promise<Response> {
  const params = await ctx.params;
  return proxy(request, params.path || []);
}

export async function DELETE(request: NextRequest, ctx: RouteContext): Promise<Response> {
  const params = await ctx.params;
  return proxy(request, params.path || []);
}
