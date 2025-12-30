import { spawn, execSync } from 'child_process';

export interface ContainerSession {
  id: string;
  containerId: string;
  createdAt: Date;
  lastAccessed: Date;
  timeout: NodeJS.Timeout;
}

// Configuration
const CONTAINER_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const EXTENSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes extension
const CONTAINER_IMAGE = 'node:20-alpine';

export interface ContainerSession {
  id: string;
  containerId: string;
  createdAt: Date;
  lastAccessed: Date;
  timeout: NodeJS.Timeout;
  isExtended: boolean;
  projectType: 'js' | 'ts';
  exposedPort?: number;
}

/**
 * Singleton pattern for development (persists across HMR reloads)
 */
const globalForPlayground = global as unknown as {
  activeSessions: Map<string, ContainerSession>;
  isDockerAvailable: boolean | null;
};

const activeSessions = globalForPlayground.activeSessions || new Map<string, ContainerSession>();
if (process.env.NODE_ENV !== 'production') {
  globalForPlayground.activeSessions = activeSessions;
}

let isDockerAvailable = globalForPlayground.isDockerAvailable !== undefined ? globalForPlayground.isDockerAvailable : null;
if (process.env.NODE_ENV !== 'production') {
  globalForPlayground.isDockerAvailable = isDockerAvailable;
}

/**
 * Check if Docker is available on the system
 */
async function checkDockerAvailability(): Promise<boolean> {
  if (isDockerAvailable === true) return true;

  try {
    // Check if daemon is responsive
    execSync('docker ps', { stdio: 'ignore', timeout: 2000 });
    isDockerAvailable = true;
    if (process.env.NODE_ENV !== 'production') {
      globalForPlayground.isDockerAvailable = true;
    }
    console.log('✅ [Playground] Docker daemon detected and accessible');

    // Cleanup orphaned containers from previous server instances
    cleanupOrphanedContainers();

    return true;
  } catch (error) {
    if (isDockerAvailable === null) {
      console.error('❌ [Playground] Docker daemon not responsive. Falling back to simulation.');
    }
    isDockerAvailable = false;
    if (process.env.NODE_ENV !== 'production') {
      globalForPlayground.isDockerAvailable = false;
    }
    return false;
  }
}

/**
 * Cleanup orphaned containers from previous server instances
 */
function cleanupOrphanedContainers() {
  try {
    // Get all playground containers with their creation time
    const result = execSync(
      'docker ps --filter "name=servcraft-playground-" --format "{{.Names}}\t{{.CreatedAt}}"',
      { encoding: 'utf-8', timeout: 5000 }
    );

    const containers = result.trim().split('\n').filter(Boolean);
    const now = Date.now();
    const maxAge = CONTAINER_TIMEOUT + EXTENSION_TIMEOUT; // 40 minutes max

    let cleanedCount = 0;

    containers.forEach(line => {
      const [containerName, createdAt] = line.split('\t');
      if (!containerName) return;

      try {
        // Parse creation time
        const createdDate = new Date(createdAt).getTime();
        const age = now - createdDate;

        // If container is older than max allowed age, remove it
        if (age > maxAge) {
          console.log(`🧹 [Playground] Removing expired container ${containerName} (age: ${Math.floor(age / 60000)}min)`);
          execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });

          const volumeName = containerName.replace('servcraft-playground-', 'servcraft-vol-');
          execSync(`docker volume rm ${volumeName}`, { stdio: 'ignore' });

          cleanedCount++;
        }
      } catch (err) {
        // Ignore errors
      }
    });

    if (cleanedCount > 0) {
      console.log(`✅ [Playground] Cleaned up ${cleanedCount} expired containers`);
    }
  } catch (error) {
    // Ignore errors if no containers found
  }
}

/**
 * Start periodic cleanup worker
 * Runs every 5 minutes to clean up expired containers
 */
function startCleanupWorker() {
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  const worker = setInterval(() => {
    console.log('[Playground] Running periodic cleanup check...');
    cleanupOrphanedContainers();
  }, CLEANUP_INTERVAL);

  // Don't prevent Node.js from exiting
  if (worker.unref) worker.unref();

  console.log('🔄 [Playground] Cleanup worker started (runs every 5 minutes)');
}

// Initialize cleanup worker on first import
if (process.env.NODE_ENV !== 'production' && !globalForPlayground.cleanupWorkerStarted) {
  startCleanupWorker();
  (globalForPlayground as any).cleanupWorkerStarted = true;
} else if (process.env.NODE_ENV === 'production') {
  startCleanupWorker();
}

/**
 * Create a new playground container
 */
export async function createContainer(sessionId: string, projectType: 'js' | 'ts' = 'ts'): Promise<string> {
  try {
    const hasDocker = await checkDockerAvailability();

    if (!hasDocker) {
      return createSimulationSession(sessionId, projectType);
    }

    const containerName = `servcraft-playground-${sessionId}`;
    const volumeName = `servcraft-vol-${sessionId}`;

    // Generate random port for this container (between 4000-5000)
    const exposedPort = 4000 + Math.floor(Math.random() * 1000);

    /**
     * CRITICAL: Setup session BEFORE spawning docker to avoid race conditions.
     */
    setupSession(sessionId, 'starting...', projectType, exposedPort);

    // Clean up any legacy resources
    try {
      execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
    } catch (e) {}

    const dockerArgs = [
      'run', '-d',
      '--name', containerName,
      '--rm',
      '-m', '512m',
      '--cpus', '0.5',
      '--network', 'bridge',
      '-p', `${exposedPort}:3000`, // Expose container port 3000 to host
      '-v', `${volumeName}:/workspace`,
      CONTAINER_IMAGE,
      'sleep', 'infinity'
    ];

    return new Promise((resolve) => {
      const docker = spawn('docker', dockerArgs);
      let containerId = '';

      docker.stdout.on('data', (data) => { containerId += data.toString(); });

      docker.on('close', async (code) => {
        if (code === 0) {
          const cleanId = containerId.trim();
          const existing = activeSessions.get(sessionId);
          if (existing) {
            existing.containerId = cleanId;
          } else {
            setupSession(sessionId, cleanId, projectType);
          }

          // IMPORTANT: Wait for project initialization to complete before resolving
          console.log(`[Playground] Container ${cleanId} created, starting project initialization...`);
          await initializeProject(sessionId, projectType);
          console.log(`[Playground] Project initialization complete, container ready`);

          resolve(cleanId);
        } else {
          console.error(`Docker creation failed: code ${code}`);
          resolve(createSimulationSession(sessionId, projectType));
        }
      });

      docker.on('error', (err) => {
        console.error('Docker spawn error:', err);
        resolve(createSimulationSession(sessionId, projectType));
      });
    });
  } catch (error) {
    console.error('Failed to create container:', error);
    return createSimulationSession(sessionId, projectType);
  }
}

/**
 * Initialize the project inside the container
 */
async function initializeProject(sessionId: string, projectType: 'js' | 'ts') {
  console.log(`🚀 [Playground] Initializing ${projectType} project for session ${sessionId}`);

  // Use -y flag to skip interactive prompts and provide the project name as argument
  const initCmd = projectType === 'ts'
    ? 'npx -y servcraft init playground-app -y --ts --db none && mv playground-app/* playground-app/.* . 2>/dev/null || true && rm -rf playground-app'
    : 'npx -y servcraft init playground-app -y --js --db none && mv playground-app/* playground-app/.* . 2>/dev/null || true && rm -rf playground-app';

  try {
    const result = await execInContainer(sessionId, `cd /workspace && ${initCmd}`);

    console.log(`[Playground] Init command exit code: ${result.exitCode}`);
    console.log(`[Playground] Init stdout:`, result.stdout.substring(0, 500));
    console.log(`[Playground] Init stderr:`, result.stderr.substring(0, 500));

    if (result.exitCode !== 0) {
      console.error(`❌ [Playground] Project init failed for ${sessionId}: ${result.stderr}`);
    } else {
      console.log(`✅ [Playground] Project initialized for session ${sessionId}`);

      // Verify files were created
      const verifyResult = await execInContainer(sessionId, 'cd /workspace && ls -la');
      console.log(`[Playground] Files after init:`, verifyResult.stdout);
    }
  } catch (err) {
    console.error(`❌ [Playground] Project init error for ${sessionId}:`, err);
  }
}

/**
 * Extend session timeout
 */
export async function extendSession(sessionId: string): Promise<boolean> {
  const session = activeSessions.get(sessionId);
  if (!session || session.isExtended) return false;

  clearTimeout(session.timeout);

  session.isExtended = true;
  session.timeout = setTimeout(() => {
    cleanupContainer(sessionId).catch(console.error);
  }, EXTENSION_TIMEOUT);

  console.log(`⏳ [Playground] Session ${sessionId} extended by 10 minutes`);
  return true;
}

/**
 * Helper to setup session metadata
 */
function setupSession(sessionId: string, containerId: string, projectType: 'js' | 'ts' = 'ts', exposedPort?: number) {
  const existing = activeSessions.get(sessionId);
  if (existing) {
    clearTimeout(existing.timeout);
  }

  const timeout = setTimeout(() => {
    cleanupContainer(sessionId).catch(console.error);
  }, CONTAINER_TIMEOUT);

  activeSessions.set(sessionId, {
    id: sessionId,
    containerId,
    createdAt: existing?.createdAt || new Date(),
    lastAccessed: new Date(),
    timeout,
    isExtended: existing?.isExtended || false,
    projectType,
    exposedPort: exposedPort || existing?.exposedPort,
  });
}

/**
 * Read the directory structure from the container with file contents
 */
export async function readFilesFromContainer(sessionId: string): Promise<any[]> {
  const session = activeSessions.get(sessionId);
  if (!session || session.containerId.startsWith('sim-')) {
    console.log('[readFilesFromContainer] Session not found or in simulation mode');
    return [];
  }

  console.log(`[readFilesFromContainer] Reading files for session ${sessionId}`);

  // Alpine Linux doesn't support -printf, so we use a simpler approach
  const command = `find . -maxdepth 4 -not -path '*/.*' -not -path '*/node_modules/*' -not -name 'node_modules' | sed 's|^./||'`;

  try {
    const result = await execInContainer(sessionId, `cd /workspace && ${command}`);

    console.log(`[readFilesFromContainer] Exit code: ${result.exitCode}`);
    console.log(`[readFilesFromContainer] Stdout length: ${result.stdout.length}`);

    if (result.exitCode !== 0) {
      console.error('[readFilesFromContainer] Command failed:', result.stderr);
      return [];
    }

    const lines = result.stdout
      .split('\n')
      .filter(l => l.trim() && l !== '.')
      .map(l => l.trim());

    console.log(`[readFilesFromContainer] Found ${lines.length} entries`);

    // Read content for each file
    const filesWithContent = await Promise.all(
      lines.map(async (line) => {
        const isFile = line.includes('.') && !line.endsWith('/');

        if (isFile) {
          try {
            const contentResult = await execInContainer(sessionId, `cd /workspace && cat "${line}"`);
            return {
              name: line.split('/').pop() || line,
              type: 'file' as const,
              path: line,
              content: contentResult.exitCode === 0 ? contentResult.stdout : '',
              language: getLanguageFromExtension(line)
            };
          } catch (err) {
            console.error(`[readFilesFromContainer] Failed to read ${line}:`, err);
            return {
              name: line.split('/').pop() || line,
              type: 'file' as const,
              path: line,
              content: '',
              language: getLanguageFromExtension(line)
            };
          }
        } else {
          return {
            name: line.split('/').pop() || line,
            type: 'folder' as const,
            path: line
          };
        }
      })
    );

    console.log(`[readFilesFromContainer] Read content for ${filesWithContent.filter(f => f.type === 'file').length} files`);
    return filesWithContent;
  } catch (err) {
    console.error('[readFilesFromContainer] Error:', err);
    return [];
  }
}

/**
 * Helper to determine language from file extension
 */
function getLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'json': 'json',
    'md': 'markdown',
    'yml': 'yaml',
    'yaml': 'yaml',
    'env': 'plaintext',
    'txt': 'plaintext',
    'sh': 'shell',
    'dockerfile': 'dockerfile'
  };
  return languageMap[ext || ''] || 'plaintext';
}

/**
 * Write a file directly into the container
 */
export async function writeFileInContainer(
  sessionId: string,
  filePath: string,
  content: string
): Promise<void> {
  // Retry mechanism to wait for session registration
  let session = activeSessions.get(sessionId);
  if (!session) {
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500));
      session = activeSessions.get(sessionId);
      if (session) break;
    }
  }

  if (!session) throw new Error(`Session ${sessionId} not found`);

  // Wait for container to be fully created
  if (session.containerId === 'starting...') {
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (session.containerId !== 'starting...') break;
    }
  }

  if (session.containerId.startsWith('sim-')) return;

  const base64Content = Buffer.from(content).toString('base64');
  const dirPath = filePath.split('/').slice(0, -1).join('/');

  const command = dirPath
    ? `mkdir -p "/workspace/${dirPath}" && echo "${base64Content}" | base64 -d > "/workspace/${filePath}"`
    : `echo "${base64Content}" | base64 -d > "/workspace/${filePath}"`;

  return new Promise((resolve, reject) => {
    const dockerShell = spawn('docker', ['exec', session.containerId, 'sh', '-c', command]);
    dockerShell.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Write failed: ${code}`)));
    dockerShell.on('error', reject);
  });
}

/**
 * Execute a command in the container
 */
export async function execInContainer(
  sessionId: string,
  command: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  let session = activeSessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  session.lastAccessed = new Date();

  if (session.containerId.startsWith('sim-')) {
    return {
      stdout: `[Simulation Mode] Executed: ${command}`,
      stderr: '',
      exitCode: 0,
    };
  }

  return new Promise((resolve, reject) => {
    const dockerExec = spawn('docker', ['exec', session.containerId, 'sh', '-c', command]);
    let stdout = '';
    let stderr = '';

    dockerExec.stdout.on('data', (d) => { stdout += d; });
    dockerExec.stderr.on('data', (d) => { stderr += d; });
    dockerExec.on('close', (c) => resolve({ stdout, stderr, exitCode: c || 0 }));
    dockerExec.on('error', reject);
  });
}

/**
 * Cleanup container and volume
 */
export async function cleanupContainer(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  try {
    clearTimeout(session.timeout);

    if (!session.containerId.startsWith('sim-')) {
      const containerName = `servcraft-playground-${sessionId}`;
      const volumeName = `servcraft-vol-${sessionId}`;

      await new Promise<void>((resolve) => {
        const stop = spawn('docker', ['stop', containerName]);
        stop.on('close', () => resolve());
      });

      await new Promise<void>((resolve) => {
        const rmv = spawn('docker', ['volume', 'rm', volumeName]);
        rmv.on('close', () => resolve());
      });
    }

    activeSessions.delete(sessionId);
    console.log(`🧹 [Playground] Cleaned up session ${sessionId}`);
  } catch (error) {
    console.error('Failed to cleanup container:', error);
  }
}

export function getContainerStatus(sessionId: string): ContainerSession | null {
  return activeSessions.get(sessionId) || null;
}

export async function cleanupAllContainers(): Promise<void> {
  const sessions = Array.from(activeSessions.keys());
  await Promise.all(sessions.map(cleanupContainer));
}

if (typeof process !== 'undefined') {
  process.on('SIGINT', cleanupAllContainers);
  process.on('SIGTERM', cleanupAllContainers);
}
