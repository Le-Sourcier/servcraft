import { useState, useEffect, useCallback, useRef } from 'react';
import type { FileNode } from '../project';

interface UseContainerSessionResult {
  sessionId: string;
  containerId: string | null;
  isReady: boolean;
  isCreating: boolean;
  error: string | null;
  syncFiles: (files: FileNode[]) => Promise<void>;
  installPackage: (packageName: string) => Promise<{ success: boolean; output: string }>;
  executeCode: (code: string, filename?: string) => Promise<{ success: boolean; output: string; error?: string }>;
  destroySession: () => Promise<void>;
}

/**
 * Hook to manage Docker container session for playground
 */
export function useContainerSession(): UseContainerSessionResult {
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createdRef = useRef(false);

  // Create container on mount
  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;

    const createContainer = async () => {
      setIsCreating(true);
      setError(null);

      try {
        const response = await fetch('/api/playground/container', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();

        if (data.success) {
          setContainerId(data.containerId);
          setIsReady(true);
        } else {
          setError(data.error || 'Failed to create container');
        }
      } catch (err) {
        setError('Network error: ' + String(err));
      } finally {
        setIsCreating(false);
      }
    };

    createContainer();

    // Cleanup on unmount
    return () => {
      if (containerId) {
        fetch(`/api/playground/container?sessionId=${sessionId}`, {
          method: 'DELETE',
        }).catch(console.error);
      }
    };
  }, [sessionId, containerId]);

  // Sync files to container
  const syncFiles = useCallback(async (files: FileNode[]) => {
    if (!isReady) {
      throw new Error('Container not ready');
    }

    const response = await fetch('/api/playground/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, files }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to sync files');
    }
  }, [sessionId, isReady]);

  // Install package
  const installPackage = useCallback(async (packageName: string) => {
    if (!isReady) {
      throw new Error('Container not ready');
    }

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
    if (!isReady) {
      throw new Error('Container not ready');
    }

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

  // Destroy session
  const destroySession = useCallback(async () => {
    try {
      await fetch(`/api/playground/container?sessionId=${sessionId}`, {
        method: 'DELETE',
      });
      setIsReady(false);
      setContainerId(null);
    } catch (err) {
      console.error('Failed to destroy session:', err);
    }
  }, [sessionId]);

  return {
    sessionId,
    containerId,
    isReady,
    isCreating,
    error,
    syncFiles,
    installPackage,
    executeCode,
    destroySession,
  };
}
