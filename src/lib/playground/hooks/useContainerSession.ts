import { useState, useEffect, useCallback, useRef } from 'react';
import type { FileNode } from '../project';

interface UseContainerSessionResult {
  sessionId: string;
  containerId: string | null;
  isReady: boolean;
  isCreating: boolean;
  isExtended: boolean;
  projectType: 'js' | 'ts' | null;
  exposedPort: number | null;
  error: string | null;
  createSession: (projectType: 'js' | 'ts') => Promise<void>;
  extendSession: () => Promise<void>;
  refreshFiles: () => Promise<FileNode[]>;
  syncFiles: (files: FileNode[]) => Promise<void>;
  installPackage: (packageName: string) => Promise<{ success: boolean; output: string }>;
  executeCode: (code: string, filename?: string) => Promise<{ success: boolean; output: string; error?: string }>;
  executeShellCommand: (command: string, background?: boolean) => Promise<{ success: boolean; output: string; error: string; exitCode: number }>;
  destroySession: () => Promise<void>;
}

/**
 * Hook to manage Docker container session for playground
 */
export function useContainerSession(): UseContainerSessionResult {
  // Use a ref to keep sessionId stable and avoid regeneration on and during rerenders
  const sessionIdRef = useRef<string | null>(null);

  if (!sessionIdRef.current) {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('playground_session_id');
      if (saved) {
        sessionIdRef.current = saved;
      } else {
        const newId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('playground_session_id', newId);
        sessionIdRef.current = newId;
      }
    } else {
      sessionIdRef.current = 'ssr-session';
    }
  }

  const sessionId = sessionIdRef.current;
  const [containerId, setContainerId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isExtended, setIsExtended] = useState(false);
  const [projectType, setProjectType] = useState<'js' | 'ts' | null>(null);
  const [exposedPort, setExposedPort] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createdRef = useRef(false);

  // Auto-reconnect on mount if session exists
  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/playground/container?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            setContainerId(data.containerId);
            setProjectType(data.projectType || 'ts');
            setIsExtended(data.isExtended || false);
            setExposedPort(data.exposedPort || null);
            setIsReady(true);
          }
        } else if (response.status === 404) {
          // Session doesn't exist on server, clear it
          console.log('[useContainerSession] Session not found on server, clearing local state');
          setIsReady(false);
          setContainerId(null);
          setProjectType(null);
        }
      } catch (err) {
        console.error('[useContainerSession] Failed to check session status:', err);
      }
    };

    checkStatus();
  }, [sessionId]);

  // Create session
  const createSession = useCallback(async (selectedType: 'js' | 'ts') => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/playground/container', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, projectType: selectedType }),
      });

      const data = await response.json();

      if (data.success) {
        setContainerId(data.containerId);
        setProjectType(selectedType);
        setExposedPort(data.exposedPort || null);
        setIsReady(true);
      } else {
        setError(data.error || 'Failed to create container');
      }
    } catch (err) {
      setError('Network error: ' + String(err));
    } finally {
      setIsCreating(false);
    }
  }, [sessionId]);

  // Extend session
  const extendSession = useCallback(async () => {
    try {
      const response = await fetch('/api/playground/container', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      if (data.success) {
        setIsExtended(true);
      }
    } catch (err) {
      console.error('Failed to extend session:', err);
    }
  }, [sessionId]);

  // Cleanup on unmount (only if container was created)
  useEffect(() => {
    return () => {
      // In production we might want to keep it alive if they refresh,
      // but if they close the tab, it will eventually timeout.
    };
  }, []);

  // Refresh files from container
  const refreshFiles = useCallback(async (): Promise<FileNode[]> => {
    try {
      const response = await fetch(`/api/playground/container?sessionId=${sessionId}&action=getFiles`);
      const data = await response.json();
      if (data.success) {
        // Transform the flat list back to FileNode structure with content preserved
        const tree: FileNode[] = [];
        const map: Record<string, FileNode> = {};

        data.files.forEach((file: any) => {
          const parts = file.path.split('/');

          parts.forEach((part: string, index: number) => {
            const path = parts.slice(0, index + 1).join('/');
            if (!map[path]) {
              const isLastPart = index === parts.length - 1;
              const node: FileNode = {
                name: part,
                type: (isLastPart && file.type === 'file') ? 'file' : 'folder',
              };

              // Copy file content and language for files
              if (node.type === 'file' && isLastPart) {
                node.content = file.content || '';
                node.language = file.language || 'plaintext';
              }

              if (node.type === 'folder') node.children = [];
              map[path] = node;

              // Find parent to add to children
              if (index === 0) {
                tree.push(node);
              } else {
                const parentPath = parts.slice(0, index).join('/');
                if (map[parentPath] && map[parentPath].children) {
                  map[parentPath].children!.push(node);
                }
              }
            }
          });
        });

        return tree;
      }
      return [];
    } catch (err) {
      console.error('Failed to refresh files:', err);
      return [];
    }
  }, [sessionId]);

  // Sync files to container
  const syncFiles = useCallback(async (files: FileNode[]) => {
    if (!isReady) throw new Error('Container not ready');

    const response = await fetch('/api/playground/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, files }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to sync files');
  }, [sessionId, isReady]);

  // Install package
  const installPackage = useCallback(async (packageName: string) => {
    if (!isReady) throw new Error('Container not ready');

    const response = await fetch('/api/playground/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, packages: [packageName] }),
    });

    const data = await response.json();
    return {
      success: data.success,
      output: data.output || data.error || '',
    };
  }, [sessionId, isReady]);

  // Execute code
  const executeCode = useCallback(async (code: string, filename = 'index.js') => {
    if (!isReady) throw new Error('Container not ready');

    const response = await fetch('/api/playground/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, code, filename }),
    });

    const data = await response.json();
    return {
      success: data.success,
      output: data.output || '',
      error: data.error,
    };
  }, [sessionId, isReady]);

  // Execute shell command
  const executeShellCommand = useCallback(async (command: string, background = false) => {
    if (!isReady) throw new Error('Container not ready');

    const response = await fetch('/api/playground/shell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, command, background }),
    });

    const data = await response.json();
    return {
      success: data.success,
      output: data.output || '',
      error: data.error || '',
      exitCode: data.exitCode,
    };
  }, [sessionId, isReady]);

  // Destroy session
  const destroySession = useCallback(async () => {
    try {
      await fetch(`/api/playground/container?sessionId=${sessionId}`, {
        method: 'DELETE',
      });
      setIsReady(false);
      setContainerId(null);
      setProjectType(null);
    } catch (err) {
      console.error('Failed to destroy session:', err);
    }
  }, [sessionId]);

  return {
    sessionId,
    containerId,
    isReady,
    isCreating,
    isExtended,
    projectType,
    exposedPort,
    error,
    createSession,
    extendSession,
    refreshFiles,
    syncFiles,
    installPackage,
    executeCode,
    executeShellCommand,
    destroySession,
  };
}
