import { useState, useCallback, useRef, useEffect } from 'react';
import type { TerminalCommand, PackageDependency, InstalledModule, FileNode } from '../project';

/**
 * Get description for a module
 */
function getModuleDescription(moduleName: string): string {
  const descriptions: Record<string, string> = {
    auth: 'JWT authentication, OAuth, MFA support',
    users: 'Complete user CRUD with roles & permissions',
    email: 'SMTP email sending with templates',
    cache: 'Redis caching with TTL support',
    queue: 'BullMQ background job processing',
    websocket: 'Real-time Socket.io communication',
    oauth: 'Social login (Google, GitHub, etc.)',
    mfa: 'Two-factor authentication (TOTP)',
    search: 'Elasticsearch integration',
    logger: 'Structured logging with Pino',
  };
  return descriptions[moduleName] || 'ServCraft module';
}

interface UseTerminalProps {
  installedPackages: PackageDependency[];
  setInstalledPackages: React.Dispatch<React.SetStateAction<PackageDependency[]>>;
  installedModules: InstalledModule[];
  setInstalledModules: React.Dispatch<React.SetStateAction<InstalledModule[]>>;
  setFiles: React.Dispatch<React.SetStateAction<FileNode[]>>;
  containerSession?: {
    isReady: boolean;
    installPackage: (packageName: string) => Promise<{ success: boolean; output: string }>;
    executeCode: (code: string, filename?: string) => Promise<{ success: boolean; output: string; error?: string }>;
    syncFiles: (files: FileNode[]) => Promise<void>;
  };
}

export function useTerminal({
  installedPackages,
  setInstalledPackages,
  installedModules,
  setInstalledModules,
  setFiles,
  containerSession,
}: UseTerminalProps) {
  const [terminalCommands, setTerminalCommands] = useState<TerminalCommand[]>([
    {
      id: "init-0",
      command: "",
      output: ["Welcome to ServCraft Playground v0.4.9", "Type 'help' to see available commands."],
      timestamp: new Date(),
      type: "system"
    }
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalIdCounter, setTerminalIdCounter] = useState(1);
  const [isInstalling, setIsInstalling] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalCommands]);

  // Add terminal output
  const addTerminalOutput = useCallback((output: string[], type: TerminalCommand['type'] = 'output', command = "") => {
    setTerminalIdCounter(prev => {
      const newId = prev;
      setTerminalCommands(cmds => [...cmds, {
        id: `cmd-${newId}`,
        command,
        output,
        timestamp: new Date(),
        type
      }]);
      return prev + 1;
    });
  }, []);

  // Execute terminal command
  const executeCommand = useCallback(async () => {
    const cmd = terminalInput.trim();
    if (!cmd) return;

    setTerminalInput("");
    addTerminalOutput([`$ ${cmd}`], 'command', cmd);

    const parts = cmd.split(" ");
    const commandName = parts[0];
    const args = parts.slice(1);

    switch (commandName) {
      case "help":
        addTerminalOutput([
          "Available commands:",
          "",
          "Package Management:",
          "  npm install [package]     - Install a package",
          "  npm uninstall <package>   - Remove a package",
          "",
          "Module Management:",
          "  servcraft add --list      - List available modules",
          "  servcraft add <module>    - Add a ServCraft module",
          "  servcraft remove <module> - Remove a module",
          "",
          "Development:",
          "  servcraft dev             - Start development server",
          "  servcraft build           - Build the project",
          "",
          "Database:",
          "  servcraft db push         - Push database schema",
          "",
          "Other:",
          "  clear                     - Clear terminal",
          "  help                      - Show this message",
        ], 'system');
        break;

      case "clear":
        setTerminalIdCounter(prev => {
          setTerminalCommands([{
            id: `init-${prev}`,
            command: "",
            output: ["Terminal cleared. Type 'help' for commands."],
            timestamp: new Date(),
            type: "system"
          }]);
          return prev + 1;
        });
        break;

      case "npm":
        if (args[0] === "install" || args[0] === "i") {
          // Filter out flags like -g, --save-dev, etc.
          const pkgName = args.find(arg => !arg.startsWith('-'));
          if (!pkgName) {
            addTerminalOutput(["error: Missing package name"], 'error');
            return;
          }

          setIsInstalling(true);
          addTerminalOutput([`Installing ${pkgName}...`], 'output');

          // Use real container if available
          if (containerSession?.isReady) {
            try {
              const res = await containerSession.installPackage(pkgName);
              addTerminalOutput([res.output], res.success ? 'output' : 'error');
            } catch (err) {
              addTerminalOutput([`Failed to contact execution server: ${err}`], 'error');
            }
          } else {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }

          const pkgIndex = installedPackages.findIndex(p =>
            p.name === pkgName || p.name.endsWith("/" + pkgName)
          );

          if (pkgIndex >= 0) {
            const newPackages = [...installedPackages];
            newPackages[pkgIndex] = { ...newPackages[pkgIndex], installed: true };
            setInstalledPackages(newPackages);

            addTerminalOutput([
              `added 1 package, and audited ${newPackages.filter(p => p.installed).length} packages`,
              "",
              `+ ${pkgName}@${installedPackages[pkgIndex].version}`
            ], 'output');
          } else {
            // Allow installing packages not in the list (simulation only)
            const defaultVersion = 'latest';
            const newPackage: PackageDependency = {
              name: pkgName,
              version: defaultVersion,
              installed: true,
            };
            setInstalledPackages(prev => [...prev, newPackage]);

            addTerminalOutput([
              `added 1 package, and audited ${installedPackages.filter(p => p.installed).length + 1} packages`,
              "",
              `+ ${pkgName}@${defaultVersion}`,
              "",
              "⚠ Note: This is a simulated installation for playground purposes"
            ], 'output');
          }

          setIsInstalling(false);
        } else if (args[0] === "uninstall" || args[0] === "remove" || args[0] === "rm") {
          const pkgName = args[1];
          const pkgIndex = installedPackages.findIndex(p => p.name === pkgName);

          if (pkgIndex >= 0 && installedPackages[pkgIndex].installed) {
            const newPackages = [...installedPackages];
            newPackages[pkgIndex] = { ...newPackages[pkgIndex], installed: false };
            setInstalledPackages(newPackages);
            addTerminalOutput([`removed 1 package`], 'output');
          } else {
            addTerminalOutput([`npm ERR! '${pkgName}' is not installed`], 'error');
          }
        } else {
          addTerminalOutput([`npm: '${args[0]}' is not a recognized command`], 'error');
        }
        break;

      case "servcraft":
      case "sc":
        if (args[0] === "add") {
          const moduleName = args[1];

          // Handle --list or -l flag
          if (moduleName === '--list' || moduleName === '-l') {
            addTerminalOutput([
              "Available ServCraft modules:",
              "",
              ...installedModules.map(m => {
                const status = m.installed ? '✓ installed' : '  available';
                const desc = getModuleDescription(m.name);
                return `  ${status}  ${m.name.padEnd(12)} - ${desc}`;
              }),
              "",
              "Install a module with: servcraft add <module-name>",
            ], 'output');
            return;
          }

          if (!moduleName) {
            addTerminalOutput(["error: Missing module name", "Use 'servcraft add --list' to see available modules"], 'error');
            return;
          }

          setIsInstalling(true);
          addTerminalOutput([`Adding ${moduleName} module...`], 'output');
          await new Promise(resolve => setTimeout(resolve, 2000));

          const modIndex = installedModules.findIndex(m => m.name === moduleName);
          if (modIndex >= 0) {
            const newModules = [...installedModules];
            newModules[modIndex] = { ...newModules[modIndex], installed: true };
            setInstalledModules(newModules);

            // Create module folder and files
            setFiles(prev => {
              const moduleFolder = prev.find(f => f.name === 'src');
              if (moduleFolder?.children) {
                const modulesFolder = moduleFolder.children.find(f => f.name === 'modules');
                if (modulesFolder && !modulesFolder.children?.find(f => f.name === moduleName)) {
                  modulesFolder.children = modulesFolder.children || [];
                  modulesFolder.children.push({
                    name: moduleName,
                    type: 'folder',
                    children: [
                      {
                        name: 'index.ts',
                        type: 'file',
                        language: 'typescript',
                        content: `// ${moduleName} module
export * from './${moduleName}.controller';
export * from './${moduleName}.service';
`,
                      },
                      {
                        name: `${moduleName}.controller.ts`,
                        type: 'file',
                        language: 'typescript',
                        content: `import { FastifyPluginAsync } from 'fastify';

const ${moduleName}Controller: FastifyPluginAsync = async (fastify) => {
  // ${moduleName} routes
  fastify.get('/', async () => {
    return { module: '${moduleName}', status: 'active' };
  });
};

export default ${moduleName}Controller;
`,
                      },
                    ],
                  });
                }
              }
              return [...prev];
            });

            addTerminalOutput([
              `✓ Module '${moduleName}' installed successfully`,
              ``,
              `Files created:`,
              `  src/modules/${moduleName}/index.ts`,
              `  src/modules/${moduleName}/${moduleName}.controller.ts`,
              ``,
              `Dependencies: @servcraft/${moduleName}@0.4.9`,
            ], 'output');
          } else {
            addTerminalOutput([`error: Unknown module '${moduleName}'`], 'error');
            addTerminalOutput(["Use 'servcraft add --list' to see available modules"], 'output');
          }

          setIsInstalling(false);
        } else if (args[0] === "remove" || args[0] === "rm") {
          const moduleName = args[1];
          const modIndex = installedModules.findIndex(m => m.name === moduleName);

          if (modIndex >= 0 && installedModules[modIndex].installed) {
            const newModules = [...installedModules];
            newModules[modIndex] = { ...newModules[modIndex], installed: false };
            setInstalledModules(newModules);
            addTerminalOutput([`Removed module '${moduleName}'`], 'output');
          } else {
            addTerminalOutput([`error: Module '${moduleName}' is not installed`], 'error');
          }
        } else if (args[0] === "dev") {
          addTerminalOutput([
            "> my-servcraft-api@1.0.0 dev",
            "> servcraft dev",
            "",
            "🔧 Starting development server...",
            "✓ Server started on http://localhost:3000",
            "✓ API ready at /api",
            "✓ Database connected",
          ], 'output');
        } else if (args[0] === "build") {
          addTerminalOutput([
            "> my-servcraft-api@1.0.0 build",
            "> servcraft build",
            "",
            "🔧 Building project...",
            "✓ TypeScript compiled",
            "✓ Routes generated",
            "✓ Prisma client generated",
            "✓ Build complete!",
          ], 'output');
        } else if (args[0] === "db" && args[1] === "push") {
          addTerminalOutput([
            "> servcraft db push",
            "",
            "🔧 Pushing database schema...",
            "✓ Database schema synced",
            "✓ 3 migrations applied",
          ], 'output');
        } else {
          addTerminalOutput([`servcraft: '${args[0]}' is not a recognized command`], 'error');
        }
        break;

      default:
        addTerminalOutput([`command not found: ${commandName}`], 'error');
    }
  }, [terminalInput, installedPackages, installedModules, setInstalledPackages, setInstalledModules, setFiles, addTerminalOutput]);

  // Handle terminal keydown
  const handleTerminalKeydown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      executeCommand();
    }
  }, [executeCommand]);

  return {
    terminalCommands,
    terminalInput,
    setTerminalInput,
    isInstalling,
    terminalRef,
    addTerminalOutput,
    executeCommand,
    handleTerminalKeydown,
  };
}
