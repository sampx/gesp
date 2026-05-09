import type { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const response = await fetch(
    `${BACKEND_URL}/api/assessment/${encodeURIComponent(token)}/stream`,
    {
      headers: {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
      signal: request.signal,
    },
  );

  const headers = new Headers();
  headers.set('Content-Type', response.headers.get('content-type') ?? 'text/event-stream');
  headers.set('Cache-Control', 'no-cache, no-transform');
  headers.set('Connection', 'keep-alive');
  headers.set('X-Accel-Buffering', 'no');

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
