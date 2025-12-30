import { NextRequest, NextResponse } from 'next/server';
import { getContainerStatus } from '@/lib/playground/docker-manager';

/**
 * Catch-all route for proxying to container
 * Handles paths like /api/playground/preview/{sessionId}/api/users
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string; path: string[] } }
) {
  return handleProxyRequest(request, params.sessionId, params.path);
}

export async function POST(request: NextRequest, { params }: any) {
  return handleProxyRequest(request, params.sessionId, params.path);
}

export async function PUT(request: NextRequest, { params }: any) {
  return handleProxyRequest(request, params.sessionId, params.path);
}

export async function DELETE(request: NextRequest, { params }: any) {
  return handleProxyRequest(request, params.sessionId, params.path);
}

export async function PATCH(request: NextRequest, { params }: any) {
  return handleProxyRequest(request, params.sessionId, params.path);
}

async function handleProxyRequest(
  request: NextRequest,
  sessionId: string,
  path: string[]
) {
  try {
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session info
    const session = getContainerStatus(sessionId);

    if (!session || !session.exposedPort) {
      return new NextResponse(
        `<html><body><h1>Session not found</h1><p>Session may have expired.</p></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Build target URL
    const pathString = path ? '/' + path.join('/') : '';
    const targetUrl = `http://localhost:${session.exposedPort}${pathString}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const fullUrl = searchParams ? `${targetUrl}?${searchParams}` : targetUrl;

    console.log(`[Preview] Proxying ${request.method} ${fullUrl}`);

    try {
      const proxyResponse = await fetch(fullUrl, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers),
          'Host': `localhost:${session.exposedPort}`,
        },
        // @ts-ignore
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined,
      });

      const responseBody = await proxyResponse.arrayBuffer();

      return new NextResponse(responseBody, {
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        headers: proxyResponse.headers,
      });
    } catch (error) {
      console.error(`[Preview] Proxy error for ${sessionId}:`, error);
      return new NextResponse(
        `<html><body><h1>Service not ready</h1><p>Server is starting. Refresh in a few seconds.</p></body></html>`,
        { status: 503, headers: { 'Content-Type': 'text/html' } }
      );
    }
  } catch (error) {
    console.error('Preview proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy failed', details: String(error) },
      { status: 500 }
    );
  }
}
