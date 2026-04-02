import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';

async function runLightpandaFetch(url: string, timeoutMs: number): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  const bin = process.env.LIGHTPANDA_BIN || 'lightpanda';
  const args = ['fetch', '--log-level', 'error', url];

  return await new Promise((resolve) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const effectiveTimeoutMs = Number.isFinite(timeoutMs) ? timeoutMs : Number(process.env.LIGHTPANDA_TIMEOUT_MS || 15000);
    const timeoutId = setTimeout(() => {
      child.kill('SIGKILL');
    }, effectiveTimeoutMs);

    child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));

    const finish = (result: { ok: true; content: string } | { ok: false; error: string }) => {
      clearTimeout(timeoutId);
      resolve(result);
    };

    child.on('error', (err) => {
      finish({ ok: false, error: err instanceof Error ? err.message : String(err) });
    });

    child.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
      const stderr = Buffer.concat(stderrChunks).toString('utf-8');
      if (code !== 0) {
        finish({ ok: false, error: (stderr || stdout || `Exit code ${code}`).trim() });
        return;
      }

      const raw = stdout.trim();
      if (!raw) {
        finish({ ok: false, error: 'Empty output from lightpanda' });
        return;
      }

      const htmlStart = raw.indexOf('<');
      const html = htmlStart >= 0 ? raw.slice(htmlStart) : raw;

      let text = html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '\n')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|section|article|header|footer|main|nav|aside|h[1-6]|pre|blockquote)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

      const maxChars = 120_000;
      if (text.length > maxChars) text = text.slice(0, maxChars);

      finish({ ok: true, content: text });
    });
  });
}

function clampTimeoutMs(raw: unknown, fallbackMs: number): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  if (!Number.isFinite(n)) return fallbackMs;
  return Math.max(5000, Math.min(60000, Math.trunc(n)));
}

async function fetchTextWithRetry(
  url: string,
  timeoutMs: number,
  attempts: number
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let lastError = '';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/plain, text/markdown;q=0.9, */*;q=0.8',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        lastError = text ? `Fetch failed: ${text}` : `Fetch failed: ${response.statusText}`;
      } else {
        const text = await response.text();
        return { ok: true, text };
      }
    } catch (error) {
      const anyError = error as { message?: unknown; cause?: unknown };
      const message = typeof anyError?.message === 'string' ? anyError.message : 'Unknown error';
      const cause = anyError?.cause as { code?: unknown } | undefined;
      const code = typeof cause?.code === 'string' ? cause.code : '';
      lastError = code ? `${message} (${code})` : message;
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  return { ok: false, error: lastError || 'Fetch failed' };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url') || '';
  const engine = (searchParams.get('engine') || 'auto').toLowerCase();
  const timeoutMs = clampTimeoutMs(searchParams.get('timeoutMs'), Number(process.env.READ_URL_TIMEOUT_MS || 30000));

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid url' });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ success: false, error: 'Unsupported protocol' });
  }

  if ((engine === 'auto' || engine === 'lightpanda') && process.env.LIGHTPANDA_BIN !== 'disabled') {
    const result = await runLightpandaFetch(parsed.toString(), timeoutMs);
    if (result.ok) {
      return NextResponse.json({ success: true, engine: 'lightpanda', content: result.content });
    }
    if (engine === 'lightpanda') {
      return NextResponse.json({ success: false, engine: 'lightpanda', error: result.error });
    }
  }

  const target = `https://r.jina.ai/${encodeURI(parsed.toString())}`;

  const result = await fetchTextWithRetry(target, timeoutMs, 2);
  if (!result.ok) {
    return NextResponse.json({ success: false, engine: 'jina', error: result.error });
  }

  try {
    const text = result.text;
    const maxChars = 120_000;
    const content = text.length > maxChars ? text.slice(0, maxChars) : text;

    return NextResponse.json({ success: true, engine: 'jina', content });
  } catch (error) {
    const anyError = error as { message?: unknown; cause?: unknown };
    const message = typeof anyError?.message === 'string' ? anyError.message : 'Unknown error';
    const cause = anyError?.cause as { code?: unknown } | undefined;
    const code = typeof cause?.code === 'string' ? cause.code : '';
    const extra = code ? ` (${code})` : '';
    return NextResponse.json({ success: false, engine: 'jina', error: `${message}${extra}` });
  }
}
