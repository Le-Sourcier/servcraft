import { NextRequest, NextResponse } from 'next/server';
import { writeFileInContainer } from '@/lib/playground/docker-manager';
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

    // Recursively sync files to container
    async function syncFilesRecursive(fileNodes: FileNode[], currentPath = '') {
      for (const node of fileNodes) {
        const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;

        if (node.type === 'folder' && node.children) {
          await syncFilesRecursive(node.children, nodePath);
        } else if (node.type === 'file' && node.content !== undefined) {
          await writeFileInContainer(sessionId, nodePath, node.content);
        }
      }
    }

    await syncFilesRecursive(files);

    return NextResponse.json({
      success: true,
      message: 'Files synchronized successfully to Docker volume',
    });
  } catch (error) {
    console.error('File sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync files', details: String(error) },
      { status: 500 }
    );
  }
}
