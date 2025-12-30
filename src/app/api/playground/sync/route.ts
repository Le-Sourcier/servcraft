import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import type { FileNode } from '@/lib/playground/project';

/**
 * POST /api/playground/sync
 * Synchronize files to the container workspace
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, files } = body;

    if (!sessionId || !files) {
      return NextResponse.json(
        { error: 'sessionId and files required' },
        { status: 400 }
      );
    }

    const workspaceDir = `/tmp/playground-${sessionId}`;

    // Recursively write files
    async function writeFiles(fileNodes: FileNode[], basePath: string) {
      for (const node of fileNodes) {
        const nodePath = join(basePath, node.name);

        if (node.type === 'folder') {
          await mkdir(nodePath, { recursive: true });
          if (node.children) {
            await writeFiles(node.children, nodePath);
          }
        } else if (node.type === 'file' && node.content !== undefined) {
          await mkdir(dirname(nodePath), { recursive: true });
          await writeFile(nodePath, node.content, 'utf-8');
        }
      }
    }

    await mkdir(workspaceDir, { recursive: true });
    await writeFiles(files, workspaceDir);

    return NextResponse.json({
      success: true,
      message: 'Files synchronized',
      path: workspaceDir,
    });
  } catch (error) {
    console.error('File sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync files', details: String(error) },
      { status: 500 }
    );
  }
}
