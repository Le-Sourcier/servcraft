import { NextRequest, NextResponse } from 'next/server';
import { getContainerStatus } from '@/lib/playground/docker-manager';

/**
 * GET /api/playground/preview/[sessionId]
 * Reverse proxy to the container's running server
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session info
    const session = getContainerStatus(sessionId);

    if (!session || !session.exposedPort) {
      return new NextResponse(
        `<html><body><h1>Session not found or not running</h1><p>The playground session may have expired or the server is not started yet.</p></body></html>`,
        {
          status: 404,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Proxy to the container's exposed port
    const targetUrl = `http://localhost:${session.exposedPort}${request.nextUrl.pathname.replace(`/api/playground/preview/${sessionId}`, '')}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const fullUrl = searchParams ? `${targetUrl}?${searchParams}` : targetUrl;

    try {
      const response = await fetch(fullUrl, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers),
          'Host': `localhost:${session.exposedPort}`,
        },
        // @ts-ignore - body can be passed for non-GET requests
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
      });

      // Create response with proxied content
      const responseBody = await response.arrayBuffer();

      return new NextResponse(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.error(`[Preview] Failed to proxy to container ${sessionId}:`, error);
      return new NextResponse(
        `<html><body><h1>Service not ready</h1><p>The server is starting up. Please wait a few seconds and refresh.</p><p>Error: ${String(error)}</p></body></html>`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }
  } catch (error) {
    console.error('Preview proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Handle all other HTTP methods (POST, PUT, DELETE, etc.)
 */
export async function POST(request: NextRequest, context: any) {
  return GET(request, context);
}

export async function PUT(request: NextRequest, context: any) {
  return GET(request, context);
}

export async function DELETE(request: NextRequest, context: any) {
  return GET(request, context);
}

export async function PATCH(request: NextRequest, context: any) {
  return GET(request, context);
}
