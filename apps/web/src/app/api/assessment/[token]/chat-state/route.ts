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
    `${BACKEND_URL}/api/assessment/${encodeURIComponent(token)}/chat-state`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: request.signal,
    },
  );

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  });
}