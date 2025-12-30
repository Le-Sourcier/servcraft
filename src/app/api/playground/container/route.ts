import { NextRequest, NextResponse } from 'next/server';
import { createContainer, cleanupContainer, getContainerStatus } from '@/lib/playground/docker-manager';

/**
 * POST /api/playground/container
 * Creates a new Docker container for playground session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Check if session already exists
    const existingSession = getContainerStatus(sessionId);
    if (existingSession) {
      return NextResponse.json({
        success: true,
        containerId: existingSession.containerId,
        message: 'Container already exists',
        existing: true,
      });
    }

    // Create new container
    const containerId = await createContainer(sessionId);

    return NextResponse.json({
      success: true,
      containerId,
      message: 'Container created successfully',
      timeout: 30 * 60 * 1000, // 30 minutes
    });
  } catch (error) {
    console.error('Container creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create container', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/playground/container
 * Destroys a playground container
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    await cleanupContainer(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Container destroyed',
    });
  } catch (error) {
    console.error('Container destruction error:', error);
    return NextResponse.json(
      { error: 'Failed to destroy container', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/playground/container
 * Get container status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = getContainerStatus(sessionId);

    if (!session) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }

    return NextResponse.json({
      exists: true,
      containerId: session.containerId,
      createdAt: session.createdAt,
      lastAccessed: session.lastAccessed,
    });
  } catch (error) {
    console.error('Container status error:', error);
    return NextResponse.json(
      { error: 'Failed to get container status' },
      { status: 500 }
    );
  }
}
