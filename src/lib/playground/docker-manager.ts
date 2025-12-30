/**
 * Docker Container Manager for Playground
 *
 * Manages isolated Docker containers for each playground session
 * with automatic cleanup and resource limits
 */

export interface ContainerSession {
  id: string;
  containerId: string;
  createdAt: Date;
  lastAccessed: Date;
  timeout: NodeJS.Timeout;
}

// Store active sessions (in production, use Redis)
const activeSessions = new Map<string, ContainerSession>();

// Configuration
const CONTAINER_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const CONTAINER_IMAGE = 'node:20-alpine';

/**
 * Create a new playground container
 */
export async function createContainer(sessionId: string): Promise<string> {
  try {
    // Check if Docker is available
    const { spawn } = await import('child_process');

    // Create container with resource limits
    const containerName = `servcraft-playground-${sessionId}`;

    const dockerArgs = [
      'run',
      '-d', // Detached
      '--name', containerName,
      '--rm', // Auto-remove when stopped
      '-m', '512m', // Memory limit
      '--cpus', '0.5', // CPU limit
      '--network', 'none', // No network access for security
      '-v', `/tmp/playground-${sessionId}:/workspace`, // Volume mount
      CONTAINER_IMAGE,
      'sleep', 'infinity' // Keep container running
    ];

    return new Promise((resolve, reject) => {
      const docker = spawn('docker', dockerArgs);

      let containerId = '';

      docker.stdout.on('data', (data) => {
        containerId += data.toString();
      });

      docker.stderr.on('data', (data) => {
        console.error('Docker error:', data.toString());
      });

      docker.on('close', (code) => {
        if (code === 0) {
          const cleanId = containerId.trim();

          // Setup auto-cleanup
          const timeout = setTimeout(() => {
            cleanupContainer(sessionId);
          }, CONTAINER_TIMEOUT);

          activeSessions.set(sessionId, {
            id: sessionId,
            containerId: cleanId,
            createdAt: new Date(),
            lastAccessed: new Date(),
            timeout,
          });

          resolve(cleanId);
        } else {
          reject(new Error(`Docker failed with code ${code}`));
        }
      });
    });
  } catch (error) {
    console.error('Failed to create container:', error);
    throw error;
  }
}

/**
 * Execute a command in the container
 */
export async function execInContainer(
  sessionId: string,
  command: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const session = activeSessions.get(sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  // Update last accessed time
  session.lastAccessed = new Date();

  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const docker = spawn('docker', [
      'exec',
      session.containerId,
      'sh',
      '-c',
      command,
    ]);

    let stdout = '';
    let stderr = '';

    docker.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    docker.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    docker.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode || 0 });
    });

    docker.on('error', reject);
  });
}

/**
 * Cleanup container and associated resources
 */
export async function cleanupContainer(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId);

  if (!session) {
    return;
  }

  try {
    // Clear timeout
    clearTimeout(session.timeout);

    // Stop container (will be auto-removed due to --rm flag)
    const { spawn } = await import('child_process');

    await new Promise<void>((resolve, reject) => {
      const docker = spawn('docker', ['stop', session.containerId]);

      docker.on('close', (code) => {
        if (code === 0 || code === 1) { // 1 = container already stopped
          resolve();
        } else {
          reject(new Error(`Failed to stop container: ${code}`));
        }
      });

      docker.on('error', reject);
    });

    // Remove session
    activeSessions.delete(sessionId);

    console.log(`Cleaned up container for session ${sessionId}`);
  } catch (error) {
    console.error('Failed to cleanup container:', error);
  }
}

/**
 * Get container status
 */
export function getContainerStatus(sessionId: string): ContainerSession | null {
  return activeSessions.get(sessionId) || null;
}

/**
 * Cleanup all containers on shutdown
 */
export async function cleanupAllContainers(): Promise<void> {
  const sessions = Array.from(activeSessions.keys());
  await Promise.all(sessions.map(cleanupContainer));
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('SIGINT', cleanupAllContainers);
  process.on('SIGTERM', cleanupAllContainers);
}
