import { NextRequest, NextResponse } from 'next/server';
import { readFilesFromContainer, getContainerStatus } from '@/lib/playground/docker-manager';

/**
 * GET /api/playground/files
 * Fetch current file structure from container
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
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const files = await readFilesFromContainer(sessionId);

    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error('File fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
