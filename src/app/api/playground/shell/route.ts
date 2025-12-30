import { NextRequest, NextResponse } from 'next/server';
import { execInContainer } from '@/lib/playground/docker-manager';

/**
 * POST /api/playground/shell
 * Execute a shell command in the container
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, command, background = false } = body;

    if (!sessionId || !command) {
      return NextResponse.json(
        { error: 'Session ID and command required' },
        { status: 400 }
      );
    }

    // For long-running commands, run in background with nohup
    const fullCommand = background
      ? `cd /workspace && nohup ${command} > /tmp/server.log 2>&1 & echo "Process started in background (PID: $!)"`
      : `cd /workspace && ${command}`;

    const result = await execInContainer(sessionId, fullCommand);

    return NextResponse.json({
      success: result.exitCode === 0,
      output: result.stdout,
      error: result.stderr,
      exitCode: result.exitCode,
      background,
    });
  } catch (error) {
    console.error('Shell execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute command', details: String(error) },
      { status: 500 }
    );
  }
}
