import { NextRequest, NextResponse } from 'next/server';
import { execInContainer, getContainerStatus, writeFileInContainer } from '@/lib/playground/docker-manager';

/**
 * POST /api/playground/execute
 * Execute code in the Docker container
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, code, filename = 'index.js' } = body;

    if (!sessionId || !code) {
      return NextResponse.json(
        { error: 'sessionId and code required' },
        { status: 400 }
      );
    }

    // Check if container session exists
    const session = getContainerStatus(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    // Write file directly into container
    await writeFileInContainer(sessionId, filename, code);

    // Execute in container
    const result = await execInContainer(
      sessionId,
      `cd /workspace && node ${filename}`
    );

    return NextResponse.json({
      success: result.exitCode === 0,
      output: result.stdout,
      error: result.stderr,
    });
  } catch (error) {
    console.error('Execution error:', error);
    return NextResponse.json(
      { error: 'Execution failed', details: String(error) },
      { status: 500 }
    );
  }
}
