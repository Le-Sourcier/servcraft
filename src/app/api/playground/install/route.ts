import { NextRequest, NextResponse } from 'next/server';
import { execInContainer } from '@/lib/playground/docker-manager';

/**
 * POST /api/playground/install
 * Install npm packages in the container
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, packages } = body;

    if (!sessionId || !packages || !Array.isArray(packages)) {
      return NextResponse.json(
        { error: 'Invalid request. sessionId and packages array required' },
        { status: 400 }
      );
    }

    // Initialize project if needed
    await execInContainer(sessionId, 'cd /workspace && [ -f package.json ] || npm init -y');

    // Install packages
    const packagesToInstall = packages.join(' ');
    const result = await execInContainer(
      sessionId,
      `cd /workspace && npm install ${packagesToInstall}`
    );

    return NextResponse.json({
      success: result.exitCode === 0,
      output: result.stdout,
      error: result.stderr,
    });
  } catch (error) {
    console.error('Package installation error:', error);
    return NextResponse.json(
      { error: 'Failed to install packages', details: String(error) },
      { status: 500 }
    );
  }
}
