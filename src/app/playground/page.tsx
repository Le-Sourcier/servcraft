"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import {
  Terminal,
  Play,
  Loader2,
  Sparkles,
  ChevronDown,
  Code2,
  ExternalLink,
  Folder,
  FolderOpen,
  X,
  Search,
  Layers,
  Package,
  Download,
  ChevronRight,
  Maximize2,
  Minimize2,
  Terminal as TerminalIcon,
  FileCode,
  FileJson,
  FileText,
  Database,
  Settings,
  Trash2,
  Edit3,
  Plus,
  Check,
  AlertTriangle,
  Palette,
  Globe,
  Braces,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import {
  initialProjectFiles,
  availablePackages,
  availableModules,
  fileIcons,
  getFileIconName,
  flattenFiles,
  type FileNode,
  type PackageDependency,
  type InstalledModule,
  type TerminalCommand
} from "@/lib/playground/project";
import { usePlaygroundPersistence } from "@/lib/playground/hooks/usePlaygroundPersistence";

// Activity bar items
const activityItems = [
  { id: "explorer", icon: Files, label: "Explorer", shortcut: "Ctrl+Shift+E" },
  { id: "search", icon: Search, label: "Search", shortcut: "Ctrl+Shift+F" },
  { id: "modules", icon: Layers, label: "Modules", shortcut: "Ctrl+Shift+M" },
  { id: "terminal", icon: TerminalIcon, label: "Terminal", shortcut: "Ctrl+`" },
];

function Files({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3 12 7.5l4.5 4.5-4.5 4.5L7.5 21 3 16.5V7.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12L7.5 16.5M12 12l4.5 4.5M12 12V7.5" />
    </svg>
  );
}

// Icon component that renders the correct Lucide icon with colors
function FileIcon({ name, className }: { name: string; className?: string }) {
  const iconProps = { size: 14 };

  switch (name) {
    case "folder":
      return <Folder {...iconProps} className={cn("text-yellow-400", className)} />;
    case "folder-open":
      return <FolderOpen {...iconProps} className={cn("text-yellow-400", className)} />;
    case "code":
      return <Code2 {...iconProps} className={cn("text-blue-400", className)} />;
    case "json":
      return <FileJson {...iconProps} className={cn("text-yellow-300", className)} />;
    case "file-text":
      return <FileText {...iconProps} className={cn("text-gray-400", className)} />;
    case "database":
      return <Database {...iconProps} className={cn("text-purple-400", className)} />;
    case "settings":
      return <Settings {...iconProps} className={cn("text-gray-400", className)} />;
    case "palette":
      return <Palette {...iconProps} className={cn("text-pink-400", className)} />;
    case "globe":
      return <Globe {...iconProps} className={cn("text-cyan-400", className)} />;
    case "file-code":
      return <FileCode {...iconProps} className={cn("text-blue-400", className)} />;
    default:
      return <FileCode {...iconProps} className={cn("text-blue-400", className)} />;
  }
}

// Get Lucide icon component for file
function getFileIconComponent(filename: string, isFolder = false, isExpanded = false) {
  const iconName = getFileIconName(filename, isFolder, isExpanded);
  return { iconName, IconComponent: () => <FileIcon name={iconName} /> };
}

// Available packages
const PACKAGES = availablePackages;

// Available modules
const MODULES = availableModules;

export default function PlaygroundPage() {
  // State for project
  const [files, setFiles] = useState<FileNode[]>(initialProjectFiles);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src", "src/routes"]));
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [openTabs, setOpenTabs] = useState<{ file: FileNode; id: string }[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // State for packages/modules
  const [installedPackages, setInstalledPackages] = useState<PackageDependency[]>(
    PACKAGES.map(p => ({ ...p, installed: p.name.includes('fastify') || p.name.includes('prisma') || p.name.includes('cors') }))
  );
  const [installedModules, setInstalledModules] = useState<InstalledModule[]>(
    MODULES.map(m => ({ ...m, installed: false }))
  );

  // State for terminal
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
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminalIdCounter, setTerminalIdCounter] = useState(1);

  // Persist playground state
  const { resetPlayground } = usePlaygroundPersistence(
    files,
    setFiles,
    installedPackages,
    setInstalledPackages,
    installedModules,
    setInstalledModules
  );

  // State for UI
  const [activeActivity, setActiveActivity] = useState("explorer");
  const [showPackages, setShowPackages] = useState(false);
  const [showModules, setShowModules] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(180);
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);

  // Find file by path
  const findFileByPath = useCallback((path: string): FileNode | null => {
    const allFiles = flattenFiles(files);
    return allFiles.find(f => {
      const filePath = getFilePath(f, files);
      return filePath === path;
    }) || null;
  }, [files]);

  // Get file path
  const getFilePath = useCallback((file: FileNode, allFiles: FileNode[]): string => {
    const findPath = (nodes: FileNode[], target: FileNode, currentPath = ""): string => {
      for (const node of nodes) {
        const newPath = currentPath ? `${currentPath}/${node.name}` : node.name;
        if (node.name === target.name && node.type === target.type) {
          // For files, also check content to make unique
          if (node.type === 'file' && target.type === 'file') {
            if (node.content === target.content) {
              return newPath;
            }
          } else {
            return newPath;
          }
        }
        if (node.children) {
          const found = findPath(node.children, target, newPath);
          if (found) return found;
        }
      }
      return "";
    };

    return findPath(allFiles, file);
  }, []);

  // Toggle folder expansion
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Open file in editor
  const openFile = (file: FileNode) => {
    const path = getFilePath(file, files);
    const existingTab = openTabs.find(tab => getFilePath(tab.file, files) === path);

    if (existingTab) {
      setActiveTabId(existingTab.id);
      setSelectedFile(existingTab.file);
    } else {
      const id = `${path}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setOpenTabs(prev => [...prev, { file, id }]);
      setActiveTabId(id);
      setSelectedFile(file);
    }
  };

  // Close tab
  const closeTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tabIndex = openTabs.findIndex(tab => tab.id === tabId);

    const newTabs = openTabs.filter(tab => tab.id !== tabId);

    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : 0;
        const newActive = newTabs[newActiveIndex];
        setActiveTabId(newActive.id);
        setSelectedFile(newActive.file);
      } else {
        setActiveTabId(null);
        setSelectedFile(null);
      }
    }

    setOpenTabs(newTabs);
  };

  // Update file content
  const updateFileContent = useCallback((path: string, content: string) => {
    setFiles(prev => {
      const updateNode = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          const nodePath = getFilePath(node, prev);
          if (nodePath === path && node.type === 'file') {
            return { ...node, content };
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      return updateNode(prev);
    });

    setOpenTabs(prev => prev.map(tab => {
      if (getFilePath(tab.file, files) === path) {
        return { ...tab, file: { ...tab.file, content } };
      }
      return tab;
    }));
  }, [files, getFilePath]);

  // Terminal auto-scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalCommands]);

  // Add terminal output
  const addTerminalOutput = (output: string[], type: TerminalCommand['type'] = 'output', command = "") => {
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
  };

  // Execute terminal command
  const executeCommand = async () => {
    const cmd = terminalInput.trim();
    if (!cmd) return;

    setTerminalInput("");
    addTerminalOutput([`$ ${cmd}`], 'command', cmd);

    // Simulate command execution
    const parts = cmd.split(" ");
    const commandName = parts[0];
    const args = parts.slice(1);

    switch (commandName) {
      case "help":
        addTerminalOutput([
          "Available commands:",
          "  npm install [package]  - Install a package",
          "  npm uninstall <package> - Remove a package",
          "  servcraft add <module> - Add a ServCraft module",
          "  servcraft remove <module> - Remove a module",
          "  servcraft dev          - Start development server",
          "  servcraft build        - Build the project",
          "  servcraft db push      - Push database schema",
          "  clear                  - Clear terminal",
          "  help                   - Show this message",
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
          const pkgName = args[1];
          if (!pkgName) {
            addTerminalOutput(["error: Missing package name"], 'error');
            return;
          }

          setIsInstalling(true);
          addTerminalOutput([`Installing ${pkgName}...`], 'output');

          await new Promise(resolve => setTimeout(resolve, 1500));

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
            addTerminalOutput([`npm ERR! 404 '${pkgName}' is not in the npm registry`], 'error');
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
          if (!moduleName) {
            addTerminalOutput(["error: Missing module name"], 'error');
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

            addTerminalOutput([
              `✓ Module '${moduleName}' installed successfully`,
              "",
              `Dependencies added:`,
              `  - @servcraft/${moduleName}@0.4.9`,
            ], 'output');
          } else {
            addTerminalOutput([`error: Unknown module '${moduleName}'`], 'error');
            addTerminalOutput(["Available modules: auth, users, email, cache, queue, websocket, oauth, mfa, search, logger"], 'output');
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
  };

  // Handle terminal keydown
  const handleTerminalKeydown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      executeCommand();
    }
  };

  // Install package
  const installPackage = async (pkg: PackageDependency) => {
    if (pkg.installed) return;

    setIsInstalling(true);
    addTerminalOutput([`$ npm install ${pkg.name}`], 'command');
    addTerminalOutput([`Installing ${pkg.name}...`], 'output');

    await new Promise(resolve => setTimeout(resolve, 1500));

    setInstalledPackages(prev => prev.map(p =>
      p.name === pkg.name ? { ...p, installed: true } : p
    ));

    addTerminalOutput([
      `added 1 package, and audited ${installedPackages.filter(p => p.installed).length + 1} packages`,
      `+ ${pkg.name}@${pkg.version}`
    ], 'output');

    setIsInstalling(false);
  };

  // Install module
  const installModule = async (mod: InstalledModule) => {
    if (mod.installed) return;

    setIsInstalling(true);
    addTerminalOutput([`$ servcraft add ${mod.name}`], 'command');
    addTerminalOutput([`Adding ${mod.name} module...`], 'output');

    await new Promise(resolve => setTimeout(resolve, 1500));
    addTerminalOutput([`⠋ Installing dependencies...`], 'output');

    await new Promise(resolve => setTimeout(resolve, 800));
    addTerminalOutput([`⠙ Generating module files...`], 'output');

    await new Promise(resolve => setTimeout(resolve, 700));

    setInstalledModules(prev => prev.map(m =>
      m.name === mod.name ? { ...m, installed: true } : m
    ));

    // Create module folder and files
    setFiles(prev => {
      const moduleFolder = prev.find(f => f.name === 'src');
      if (moduleFolder?.children) {
        const modulesFolder = moduleFolder.children.find(f => f.name === 'modules');
        if (modulesFolder && !modulesFolder.children?.find(f => f.name === mod.name)) {
          modulesFolder.children = modulesFolder.children || [];
          modulesFolder.children.push({
            name: mod.name,
            type: 'folder',
            children: [
              {
                name: 'index.ts',
                type: 'file',
                language: 'typescript',
                content: `// ${mod.name} module
export * from './${mod.name}.controller';
export * from './${mod.name}.service';
`,
              },
              {
                name: `${mod.name}.controller.ts`,
                type: 'file',
                language: 'typescript',
                content: `import { FastifyPluginAsync } from 'fastify';

const ${mod.name}Controller: FastifyPluginAsync = async (fastify) => {
  // ${mod.name} routes
  fastify.get('/', async () => {
    return { module: '${mod.name}', status: 'active' };
  });
};

export default ${mod.name}Controller;
`,
              },
            ],
          });
        }
      }
      return [...prev];
    });

    addTerminalOutput([
      `✓ Module '${mod.name}' installed successfully`,
      ``,
      `Files created:`,
      `  src/modules/${mod.name}/index.ts`,
      `  src/modules/${mod.name}/${mod.name}.controller.ts`,
      ``,
      `Dependencies: @servcraft/${mod.name}@0.4.9`,
    ], 'output');

    setIsInstalling(false);
  };

  // Terminal drag handlers
  const handleTerminalDragStart = () => setIsDraggingTerminal(true);
  const handleTerminalDragEnd = () => setIsDraggingTerminal(false);
  const handleTerminalDrag = (e: React.MouseEvent) => {
    if (!isDraggingTerminal) return;
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight > 100 && newHeight < 500) {
      setTerminalHeight(newHeight);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e2e] flex flex-col">
      {/* Top Bar */}
      <div className="h-10 bg-[#181825] border-b border-[#313244] flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold gradient-text">Playground</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
            <span className="px-1.5 py-0.5 rounded bg-[#313244]">Ctrl+Shift+E Explorer</span>
            <span className="px-1.5 py-0.5 rounded bg-[#313244]">Ctrl+` Terminal</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              addTerminalOutput([`$ servcraft dev`], 'command');
              addTerminalOutput([
                "> my-servcraft-api@1.0.0 dev",
                "> servcraft dev",
                "",
                "🔧 Starting development server...",
                "✓ Server started on http://localhost:3000",
              ], 'output');
            }}
            className="gap-1 h-7 text-xs px-2 sm:px-3 bg-green-500/10 text-green-400 hover:bg-green-500/20"
          >
            <Play className="w-3 h-3" />
            <span className="hidden xs:inline">Run</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm('Reset playground to initial state? This will clear all changes.')) {
                resetPlayground();
              }
            }}
            className="h-7 text-xs px-2 sm:px-3 text-muted-foreground hover:text-foreground"
            title="Reset playground"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline ml-1">Reset</span>
          </Button>
          <Link href="/docs">
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className="w-10 bg-[#181825] border-r border-[#313244] flex flex-col items-center py-2 gap-1">
          {activityItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveActivity(item.id)}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                activeActivity === item.id
                  ? "bg-[#313244] text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-[#313244]/50"
              )}
              title={item.label}
            >
              <item.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Sidebar / Activity Panel */}
        <div className="w-64 bg-[#1e1e2e] border-r border-[#313244] flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {activeActivity === "explorer" && (
              <motion.div
                key="explorer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col"
              >
                <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Explorer
                </div>
                <div className="flex-1 overflow-auto">
                  {/* Project Files */}
                  {files.map((file, idx) => (
                    <FileTreeItem
                      key={idx}
                      file={file}
                      files={files}
                      level={0}
                      expandedFolders={expandedFolders}
                      selectedFile={selectedFile}
                      onToggleFolder={toggleFolder}
                      onSelectFile={openFile}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {activeActivity === "modules" && (
              <motion.div
                key="modules"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Modules
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-2">
                  {installedModules.map((mod) => (
                    <ModuleItem
                      key={mod.name}
                      module={mod}
                      onInstall={() => installModule(mod)}
                      isInstalling={isInstalling}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {activeActivity === "search" && (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col"
              >
                <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Search
                </div>
                <div className="px-2">
                  <input
                    type="text"
                    placeholder="Search in files..."
                    className="w-full bg-[#313244] border-none rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </motion.div>
            )}

            {activeActivity === "terminal" && (
              <motion.div
                key="terminal"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col"
              >
                <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Terminal
                </div>
                <div className="flex-1 px-2 overflow-auto font-mono text-xs">
                  <div
                    ref={terminalRef}
                    className="space-y-1"
                  >
                    {terminalCommands.map((cmd) => (
                      <div key={cmd.id}>
                        {cmd.type === 'command' && (
                          <div className="text-green-400">
                            <span className="text-blue-400">$</span> {cmd.command}
                          </div>
                        )}
                        {cmd.type === 'output' && (
                          <div className="text-foreground pl-4 whitespace-pre-wrap">{cmd.output.join('\n')}</div>
                        )}
                        {cmd.type === 'error' && (
                          <div className="text-red-400 pl-4">{cmd.output.join('\n')}</div>
                        )}
                        {cmd.type === 'system' && (
                          <div className="text-muted-foreground pl-4">{cmd.output.join('\n')}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Packages Section */}
          {(activeActivity === "explorer" || activeActivity === "modules") && (
            <div className="border-t border-[#313244]">
              <button
                onClick={() => setShowPackages(!showPackages)}
                className="w-full px-3 py-2 flex items-center justify-between text-xs hover:bg-[#313244]/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Package className="w-3 h-3" />
                  npm Packages
                </span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", showPackages && "rotate-180")} />
              </button>
              <AnimatePresence>
                {showPackages && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 pb-2 space-y-1">
                      {installedPackages.map((pkg) => (
                        <PackageItem
                          key={pkg.name}
                          pkg={pkg}
                          onInstall={() => installPackage(pkg)}
                          isInstalling={isInstalling}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-[#1e1e2e]">
          {/* Tabs */}
          {openTabs.length > 0 && (
            <div className="flex items-center bg-[#181825] border-b border-[#313244] overflow-x-auto">
              {openTabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                const iconName = getFileIconName(tab.file.name || "");
                const TabIcon = () => <FileIcon name={iconName} />;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTabId(tab.id);
                      setSelectedFile(tab.file);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-xs border-r border-[#313244] min-w-0 max-w-40",
                      isActive
                        ? "bg-[#1e1e2e] text-foreground border-t-2 border-t-primary"
                        : "text-muted-foreground hover:bg-[#313244]/50"
                    )}
                  >
                    <TabIcon />
                    <span className="truncate">{tab.file.name}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(e, tab.id);
                      }}
                      className="ml-1 p-0.5 hover:bg-[#313244] rounded opacity-0 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 relative overflow-hidden">
            {selectedFile ? (
              <Editor
                height="100%"
                defaultLanguage={selectedFile.language || "typescript"}
                language={selectedFile.language || "typescript"}
                value={selectedFile.content || ""}
                onChange={(value) => {
                  const newContent = value || "";
                  const path = getFilePath(selectedFile, files);
                  updateFileContent(path, newContent);
                  if (selectedFile && activeTabId) {
                    setSelectedFile({ ...selectedFile, content: newContent });
                  }
                }}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  insertSpaces: true,
                  wordWrap: "off",
                  padding: { top: 16, bottom: 16 },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Code2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Select a file to edit</p>
                  <p className="text-xs mt-1 opacity-50">Or create a new file from the explorer</p>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Panel */}
          <div
            className="bg-[#181825] border-t border-[#313244] flex flex-col"
            style={{ height: terminalHeight }}
          >
            {/* Terminal header with drag handle */}
            <div
              className="flex items-center justify-between px-3 py-1 border-b border-[#313244] cursor-row-resize"
              onMouseDown={handleTerminalDragStart}
              onMouseUp={handleTerminalDragEnd}
              onMouseLeave={handleTerminalDragEnd}
              onMouseMove={handleTerminalDrag}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TerminalIcon className="w-3 h-3" />
                Terminal
                {isInstalling && (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Running...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTerminalHeight(prev => prev === 180 ? 300 : 180)}
                  className="p-1 hover:bg-[#313244] rounded"
                >
                  {terminalHeight > 200 ? (
                    <Minimize2 className="w-3 h-3" />
                  ) : (
                    <Maximize2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Terminal content */}
            <div
              ref={terminalRef}
              className="flex-1 overflow-auto p-2 font-mono text-xs"
            >
              {terminalCommands.map((cmd) => (
                <div key={cmd.id} className="mb-1">
                  {cmd.type === 'command' && (
                    <div className="text-green-400 flex items-center gap-2">
                      <span className="text-blue-400">$</span>
                      <span>{cmd.command}</span>
                    </div>
                  )}
                  {cmd.type === 'output' && (
                    <div className="text-foreground pl-4 whitespace-pre-wrap">{cmd.output.join('\n')}</div>
                  )}
                  {cmd.type === 'error' && (
                    <div className="text-red-400 pl-4">{cmd.output.join('\n')}</div>
                  )}
                  {cmd.type === 'system' && (
                    <div className="text-muted-foreground pl-4">{cmd.output.join('\n')}</div>
                  )}
                </div>
              ))}

              {/* Terminal input */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-blue-400">$</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={handleTerminalKeydown}
                  placeholder="Enter command..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-foreground"
                  disabled={isInstalling}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// File Tree Item Component
function FileTreeItem({
  file,
  files,
  level,
  expandedFolders,
  selectedFile,
  onToggleFolder,
  onSelectFile,
}: {
  file: FileNode;
  files: FileNode[];
  level: number;
  expandedFolders: Set<string>;
  selectedFile: FileNode | null;
  onToggleFolder: (path: string) => void;
  onSelectFile: (file: FileNode) => void;
}) {
  const [filePath, setFilePath] = useState<string>("");

  useEffect(() => {
    const findPath = (nodes: FileNode[], target: FileNode, currentPath = ""): string => {
      for (const node of nodes) {
        const newPath = currentPath ? `${currentPath}/${node.name}` : node.name;
        if (node === target) return newPath;
        if (node.children) {
          const found = findPath(node.children, target, newPath);
          if (found) return found;
        }
      }
      return "";
    };
    setFilePath(findPath(files, file));
  }, [file, files]);

  const isExpanded = file.type === 'folder' && expandedFolders.has(filePath);
  const isSelected = selectedFile === file;
  const hasChildren = file.children && file.children.length > 0;
  const iconName = getFileIconName(file.name, file.type === 'folder', isExpanded);
  const IconComponent = () => <FileIcon name={iconName} />;

  return (
    <div>
      <button
        onClick={() => {
          if (file.type === 'folder') {
            onToggleFolder(filePath);
          } else {
            onSelectFile(file);
          }
        }}
        className={cn(
          "w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#313244]/50 transition-colors text-left",
          isSelected && "bg-[#313244] text-foreground",
          file.type === 'folder' && "font-medium"
        )}
        style={{ paddingLeft: `${8 + level * 12}px` }}
      >
        {hasChildren && (
          <ChevronRight
            className={cn(
              "w-3 h-3 text-muted-foreground transition-transform",
              isExpanded && "rotate-90"
            )}
          />
        )}
        {!hasChildren && <span className="w-3.5 h-3.5" />}
        <IconComponent />
        <span className="truncate">{file.name}</span>
      </button>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && file.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {file.children.map((child, idx) => (
              <FileTreeItem
                key={idx}
                file={child}
                files={files}
                level={level + 1}
                expandedFolders={expandedFolders}
                selectedFile={selectedFile}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Package Item Component
function PackageItem({
  pkg,
  onInstall,
  isInstalling,
}: {
  pkg: PackageDependency;
  onInstall: () => void;
  isInstalling: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-[#313244]/50 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <span className="truncate">{pkg.name}</span>
        <span className="text-muted-foreground text-[10px] flex-shrink-0">{pkg.version}</span>
      </div>
      {pkg.installed ? (
        <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
      ) : (
        <button
          onClick={onInstall}
          disabled={isInstalling}
          className="p-0.5 hover:bg-[#313244] rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <Download className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Module Item Component
function ModuleItem({
  module,
  onInstall,
  isInstalling,
}: {
  module: InstalledModule;
  onInstall: () => void;
  isInstalling: boolean;
}) {
  return (
    <div className={cn(
      "p-2 rounded border transition-colors",
      module.installed
        ? "bg-green-500/5 border-green-500/20"
        : "bg-[#313244]/20 border-[#313244] hover:border-primary/50"
    )}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Layers className={cn("w-4 h-4", module.installed ? "text-green-400" : "text-primary")} />
          <span className="font-medium text-sm">{module.name}</span>
        </div>
        {module.installed ? (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Installed
          </span>
        ) : (
          <button
            onClick={onInstall}
            disabled={isInstalling}
            className="flex items-center gap-1 px-2 py-0.5 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="w-3 h-3" />
            Install
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {module.name === 'auth' && "JWT authentication, OAuth, MFA support"}
        {module.name === 'users' && "Complete user CRUD with roles & permissions"}
        {module.name === 'email' && "SMTP email sending with templates"}
        {module.name === 'cache' && "Redis caching with TTL support"}
        {module.name === 'queue' && "BullMQ background job processing"}
        {module.name === 'websocket' && "Real-time Socket.io communication"}
        {module.name === 'oauth' && "Social login (Google, GitHub, etc.)"}
        {module.name === 'mfa' && "Two-factor authentication (TOTP)"}
        {module.name === 'search' && "Elasticsearch integration"}
        {module.name === 'logger' && "Structured logging with Pino"}
      </p>
    </div>
  );
}
