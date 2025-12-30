import { useEffect } from 'react';
import type { FileNode, PackageDependency, InstalledModule } from '../project';

const STORAGE_KEYS = {
  FILES: 'playground_files',
  PACKAGES: 'playground_packages',
  MODULES: 'playground_modules',
  VERSION: 'playground_version',
};

const CURRENT_VERSION = '1.0';

/**
 * Hook to persist playground state to localStorage
 */
export function usePlaygroundPersistence(
  files: FileNode[],
  setFiles: React.Dispatch<React.SetStateAction<FileNode[]>>,
  installedPackages: PackageDependency[],
  setInstalledPackages: React.Dispatch<React.SetStateAction<PackageDependency[]>>,
  installedModules: InstalledModule[],
  setInstalledModules: React.Dispatch<React.SetStateAction<InstalledModule[]>>
) {
  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);

      // Only load if version matches (prevents issues with schema changes)
      if (savedVersion === CURRENT_VERSION) {
        const savedFiles = localStorage.getItem(STORAGE_KEYS.FILES);
        const savedPackages = localStorage.getItem(STORAGE_KEYS.PACKAGES);
        const savedModules = localStorage.getItem(STORAGE_KEYS.MODULES);

        if (savedFiles) {
          setFiles(JSON.parse(savedFiles));
        }
        if (savedPackages) {
          setInstalledPackages(JSON.parse(savedPackages));
        }
        if (savedModules) {
          setInstalledModules(JSON.parse(savedModules));
        }
      }
    } catch (error) {
      console.error('Failed to load playground state:', error);
    }
  }, [setFiles, setInstalledPackages, setInstalledModules]);

  // Save state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_VERSION);
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
      localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(installedPackages));
      localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(installedModules));
    } catch (error) {
      console.error('Failed to save playground state:', error);
    }
  }, [files, installedPackages, installedModules]);

  // Return a reset function to clear storage
  const resetPlayground = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.VERSION);
      localStorage.removeItem(STORAGE_KEYS.FILES);
      localStorage.removeItem(STORAGE_KEYS.PACKAGES);
      localStorage.removeItem(STORAGE_KEYS.MODULES);
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset playground:', error);
    }
  };

  return { resetPlayground };
}
