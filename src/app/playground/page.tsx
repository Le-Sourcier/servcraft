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
  X,
  Search,
  Layers,
  Package,
  Trash2,
  AlertTriangle,
  Timer,
  Info,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import {
  initialProjectFiles,
  availablePackages,
  availableModules,
  flattenFiles,
  type FileNode,
  type PackageDependency,
  type InstalledModule,
} from "@/lib/playground/project";

// Refactored Modules
import { FileIcon, getFileIconName } from "@/lib/playground/components/FileIcon";
import { useTerminal } from "@/lib/playground/hooks/useTerminal";
import { usePlaygroundPersistence } from "@/lib/playground/hooks/usePlaygroundPersistence";
import { useContainerSession } from "@/lib/playground/hooks/useContainerSession";

// Activity bar items
const activityItems = [
  { id: "explorer", icon: FolderIcon, label: "Explorer", shortcut: "Ctrl+Shift+E" },
  { id: "search", icon: Search, label: "Search", shortcut: "Ctrl+Shift+F" },
  { id: "modules", icon: Layers, label: "Modules", shortcut: "Ctrl+Shift+M" },
  { id: "terminal", icon: Terminal, label: "Terminal", shortcut: "Ctrl+`" },
];

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3 12 7.5l4.5 4.5-4.5 4.5L7.5 21 3 16.5V7.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12L7.5 16.5M12 12l4.5 4.5M12 12V7.5" />
    </svg>
  );
}

export default function PlaygroundPage() {
  // Docker Session Hook
  const containerSession = useContainerSession();

  // State for Docker status
  const [isSimulation, setIsSimulation] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(30 * 60);

  // Check simulation mode when session is ready
  useEffect(() => {
    if (containerSession.isReady && containerSession.containerId?.startsWith('sim-')) {
      setIsSimulation(true);
    }
  }, [containerSession.isReady, containerSession.containerId]);

  // Session timer logic
  useEffect(() => {
    if (!containerSession.isReady) return;

    const interval = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [containerSession.isReady]);

  // Reset timer when extended
  useEffect(() => {
    if (containerSession.isExtended) {
      setSessionTimeLeft(10 * 60); // Extension is 10 mins
    }
  }, [containerSession.isExtended]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // State for project
  const [files, setFiles] = useState<FileNode[]>(initialProjectFiles);

  // Sync real files from container once ready
  useEffect(() => {
    if (containerSession.isReady) {
      const fetchFiles = async () => {
        addTerminalOutput(['Synchronizing project structure...'], 'system');
        const realFiles = await containerSession.refreshFiles();
        if (realFiles.length > 0) {
          setFiles(realFiles);
          addTerminalOutput([`Project structure synchronized (${realFiles.length} items)`], 'system');
        } else {
          addTerminalOutput(['Warning: No files found in container, using fallback structure'], 'error');
        }
      };
      fetchFiles();
    }
  }, [containerSession.isReady]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src", "src/routes"]));
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(initialProjectFiles[0]);
  const [openTabs, setOpenTabs] = useState<{ file: FileNode; id: string }[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // State for packages/modules
  const [installedPackages, setInstalledPackages] = useState<PackageDependency[]>(
    availablePackages.map(p => ({ ...p, installed: p.installed }))
  );
  const [installedModules, setInstalledModules] = useState<InstalledModule[]>(
    availableModules.map(m => ({ ...m, installed: false }))
  );

  // Terminal hook
  const {
    terminalCommands,
    terminalInput,
    setTerminalInput,
    isInstalling: terminalIsInstalling,
    terminalRef,
    addTerminalOutput,
    handleTerminalKeydown,
  } = useTerminal({
    installedPackages,
    setInstalledPackages,
    installedModules,
    setInstalledModules,
    setFiles,
    containerSession,
  });

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
  const [terminalHeight, setTerminalHeight] = useState(180);
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Sync files to Docker whenever they change
  useEffect(() => {
    if (containerSession.isReady) {
      const timer = setTimeout(() => {
        containerSession.syncFiles(files).catch(console.error);
      }, 2000); // Debounce sync
      return () => clearTimeout(timer);
    }
  }, [files, containerSession]);

  // Get file path helper
  const getFilePath = useCallback((file: FileNode, allFiles: FileNode[]): string => {
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
    return findPath(allFiles, file);
  }, []);

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

  // Toggle folder expansion
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
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
      const id = `${path}-${Date.now()}`;
      setOpenTabs(prev => [...prev, { file, id }]);
      setActiveTabId(id);
      setSelectedFile(file);
    }
  };

  const closeTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tabIndex = openTabs.findIndex(tab => tab.id === tabId);
    const newTabs = openTabs.filter(tab => tab.id !== tabId);

    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const nextTab = newTabs[tabIndex > 0 ? tabIndex - 1 : 0];
        setActiveTabId(nextTab.id);
        setSelectedFile(nextTab.file);
      } else {
        setActiveTabId(null);
        setSelectedFile(null);
      }
    }
    setOpenTabs(newTabs);
  };

  // Run code in Docker
  const runCode = async () => {
    if (isRunning) {
      addTerminalOutput(['Stopping service...'], 'system');
      setIsRunning(false);
      setPreviewUrl(null);
      return;
    }

    if (!containerSession.isReady) return;

    setIsRunning(true);
    addTerminalOutput(['$ npm start'], 'command');
    addTerminalOutput(['Starting ServCraft service...'], 'system');

    try {
      // Generate short preview URL (extract the random suffix after last dash)
      const shortId = containerSession.sessionId.split('-').pop() || containerSession.sessionId.slice(-12);
      const previewPath = `/p/${shortId}`;
      const fullUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${previewPath}`
        : previewPath;

      const res = await containerSession.executeShellCommand('npm start', true);
      if (res.output) addTerminalOutput([res.output], 'output');
      if (res.error && !res.error.includes('nohup')) addTerminalOutput([res.error], 'error');

      addTerminalOutput(['Server started successfully!'], 'system');
      addTerminalOutput([`Preview URL: ${fullUrl}`], 'output');
      addTerminalOutput(['Note: Server may take a few seconds to start'], 'system');
      setPreviewUrl(fullUrl);
    } catch (err) {
      addTerminalOutput([`Execution error: ${err}`], 'error');
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e2e] flex flex-col text-slate-200">
      {/* Top Bar */}
      <div className="h-10 bg-[#181825] border-b border-[#313244] flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold gradient-text">Playground</span>
          </Link>
          <div className="hidden sm:flex items-center gap-3">
             {isSimulation ? (
               <div className="flex items-center gap-2 text-xs text-orange-400">
                 <AlertTriangle className="w-3 h-3" />
                 <span>Simulation Mode (Docker host not found)</span>
               </div>
             ) : !containerSession.isReady ? (
               <div className="flex items-center gap-2 text-xs text-yellow-400/80">
                 <Loader2 className="w-3 h-3 animate-spin" />
                 <span>Initializing project & installing dependencies...</span>
               </div>
             ) : (
               <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 text-xs text-green-400/80">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span>Sandbox Ready</span>
                 </div>
                 <div className="h-4 w-[1px] bg-[#313244]" />
                 <div className={cn(
                   "flex items-center gap-1.5 text-[10px] font-mono",
                   sessionTimeLeft < 300 ? "text-red-400 animate-pulse" : "text-slate-400"
                 )}>
                   <Timer className="w-3 h-3" />
                   <span>{formatTime(sessionTimeLeft)}</span>
                 </div>
               </div>
             )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {previewUrl && (
             <a
               href={previewUrl}
               target="_blank"
               rel="noopener noreferrer"
               className="flex items-center gap-1.5 px-3 h-7 rounded-md bg-primary/20 text-primary text-[10px] font-bold border border-primary/30 hover:bg-primary/30 transition-all animate-in fade-in zoom-in duration-300"
             >
               <ExternalLink className="w-3 h-3" />
               <span>Open Preview</span>
             </a>
          )}
          {containerSession.isReady && (
            <Button
              variant="ghost"
              size="sm"
              disabled={containerSession.isExtended}
              onClick={() => containerSession.extendSession()}
              className={cn(
                "h-7 text-[10px] px-2 gap-1.5 border border-[#313244] hover:bg-white/5",
                containerSession.isExtended && "opacity-50 text-slate-500"
              )}
            >
              <Sparkles className={cn("w-3 h-3", !containerSession.isExtended && "text-amber-400")} />
              <span>{containerSession.isExtended ? "Extended" : "Keep Alive (+10m)"}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={!containerSession.isReady}
            onClick={runCode}
            className={cn(
              "gap-1.5 h-7 text-[10px] px-3 transition-all",
              isRunning
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
            )}
          >
            {isRunning ? (
              <>
                <X className="w-3 h-3" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Run</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Clear all changes and reset session?')) {
                localStorage.removeItem('playground_session_id');
                window.location.reload();
              }
            }}
            className="h-7 text-xs px-2 text-muted-foreground hover:text-red-400"
            title="Reset session and clear localStorage"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Link href="/docs">
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        <AnimatePresence>
          {!containerSession.isReady && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-[#1e1e2e]/90 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <div className="max-w-2xl w-full bg-[#181825] border border-[#313244] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
                <div className="p-8 flex-1 border-b md:border-b-0 md:border-r border-[#313244]">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Terminal className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Initialize Sandbox</h2>
                  <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                    Choose your project environment. We will spin up a fresh Docker container and initialize a ServCraft project for you.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-blue-300/80">
                        Named volumes are used for persistence. Each session is isolated and automatically destroyed after 30 minutes of inactivity.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-8 flex-1 bg-[#1c1c2b] flex flex-col justify-center gap-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Select Environment</div>

                  <button
                    onClick={() => containerSession.createSession('ts')}
                    disabled={containerSession.isCreating}
                    className="group relative flex items-center gap-4 p-4 rounded-xl border border-[#313244] hover:border-primary/50 hover:bg-primary/5 transition-all text-left bg-[#181825] disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#007acc]/10 flex items-center justify-center group-hover:bg-[#007acc]/20 transition-colors">
                      <FileIcon name="code" className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">TypeScript</div>
                      <div className="text-[10px] text-slate-500">Modern experience with full typesafety</div>
                    </div>
                    {containerSession.isCreating && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  </button>

                  <button
                    onClick={() => containerSession.createSession('js')}
                    disabled={containerSession.isCreating}
                    className="group relative flex items-center gap-4 p-4 rounded-xl border border-[#313244] hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left bg-[#181825] disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#f7df1e]/10 flex items-center justify-center group-hover:bg-[#f7df1e]/20 transition-colors">
                      <FileIcon name="file-code" className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">JavaScript</div>
                      <div className="text-[10px] text-slate-500">Lightweight & familiar</div>
                    </div>
                    {containerSession.isCreating && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  </button>

                  {containerSession.isCreating && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <div className="w-full bg-[#181825] h-1 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 15, ease: "linear" }}
                          className="h-full bg-primary"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 animate-pulse">Provisioning container...</span>
                    </div>
                  )}

                  {containerSession.error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-[11px] text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{containerSession.error}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Activity Bar */}
        <div className="w-12 bg-[#181825] border-r border-[#313244] flex flex-col items-center py-4 gap-4">
          {activityItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveActivity(item.id)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                activeActivity === item.id
                  ? "bg-primary/20 text-primary shadow-lg shadow-primary/5"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </button>
          ))}
        </div>

        {/* Sidebar */}
        <div className="w-64 bg-[#1e1e2e] border-r border-[#313244] flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {activeActivity === "explorer" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                <div className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
                  Explorer
                  <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded">v0.4.9</span>
                </div>
                <div className="flex-1 overflow-auto py-2">
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
                      getFilePath={getFilePath}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {activeActivity === "modules" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col p-3 gap-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  ServCraft Modules
                </div>
                {installedModules.map(mod => (
                   <div key={mod.name} className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-200">{mod.name}</span>
                        {mod.installed ? <X className="w-3 h-3 text-slate-500 cursor-pointer" /> : <div className="w-3 h-3 rounded-full bg-primary/20" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">Official ServCraft {mod.name} module for rapid development.</p>
                      <Button size="sm" className="w-full text-xs h-7 py-0" disabled={mod.installed || !containerSession.isReady}>
                        {mod.installed ? 'Installed' : 'Add Module'}
                      </Button>
                   </div>
                ))}
              </motion.div>
            )}

            {activeActivity === "terminal" && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col p-3 gap-1 overflow-auto font-mono text-[11px]">
                  {terminalCommands.map(cmd => (
                    <div key={cmd.id} className="mb-2">
                       {cmd.type === 'command' && <div className="text-primary">$ {cmd.command}</div>}
                       <div className={cn(
                         "whitespace-pre-wrap",
                         cmd.type === 'error' ? 'text-red-400' :
                         cmd.type === 'system' ? 'text-slate-500 italic' : 'text-slate-300'
                       )}>
                         {cmd.output.join('\n')}
                       </div>
                    </div>
                  ))}
               </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e2e]">
          {/* Tabs */}
          <div className="flex items-center bg-[#181825] border-b border-[#313244] h-9 min-h-[36px] overflow-x-auto no-scrollbar">
            {openTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => { setActiveTabId(tab.id); setSelectedFile(tab.file); }}
                className={cn(
                  "flex items-center gap-2 px-3 h-full text-xs border-r border-[#313244] cursor-pointer transition-colors min-w-max",
                  activeTabId === tab.id ? "bg-[#1e1e2e] text-slate-100 border-t-2 border-t-primary" : "text-slate-400 hover:bg-[#1e1e2e]/50 hover:text-slate-200"
                )}
              >
                <FileIcon name={getFileIconName(tab.file.name)} />
                <span>{tab.file.name}</span>
                <X className="w-3 h-3 ml-1 hover:text-red-400" onClick={(e) => closeTab(e, tab.id)} />
              </div>
            ))}
          </div>

          <div className="flex-1 relative">
            {selectedFile ? (
              <Editor
                height="100%"
                language={selectedFile.language || "typescript"}
                value={selectedFile.content || ""}
                onChange={(v) => updateFileContent(getFilePath(selectedFile, files), v || "")}
                theme="vs-dark"
                beforeMount={(monaco) => {
                  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                     noSemanticValidation: true,
                     noSyntaxValidation: false,
                  });
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16 },
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  renderLineHighlight: "all",
                  cursorSmoothCaretAnimation: "on",
                  smoothScrolling: true,
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500 opacity-40">
                <Code2 className="w-16 h-16" />
                <p className="text-sm tracking-widest uppercase font-bold">ServCraft IDE</p>
              </div>
            )}
          </div>

          {/* Terminal Bottom */}
          <div className="bg-[#181825] border-t border-[#313244]" style={{ height: terminalHeight }}>
             <div className="h-8 flex items-center justify-between px-3 border-b border-[#313244] pointer-events-none group">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <Terminal className="w-3 h-3" />
                  Terminal
                </div>
                <div className="flex items-center gap-2">
                   {terminalIsInstalling && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                </div>
             </div>
             <div ref={terminalRef} className="h-[calc(100%-32px)] overflow-auto p-3 font-mono text-[11px] bg-[#0d1117] selection:bg-primary/30">
                {terminalCommands.map(cmd => (
                  <div key={cmd.id} className="mb-1 leading-relaxed">
                     {cmd.type === 'command' && <div className="text-blue-400 mb-0.5">$ {cmd.command}</div>}
                     <div className={cn(
                       "whitespace-pre-wrap",
                       cmd.type === 'error' ? 'text-red-400' :
                       cmd.type === 'system' ? 'text-slate-500' : 'text-slate-300'
                     )}>
                       {cmd.output.join('\n')}
                     </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2">
                   <span className="text-blue-400 font-bold">$</span>
                   <input
                     type="text"
                     value={terminalInput}
                     onChange={e => setTerminalInput(e.target.value)}
                     onKeyDown={handleTerminalKeydown}
                     className="flex-1 bg-transparent border-none outline-none text-slate-200"
                     spellCheck={false}
                   />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileTreeItem({ file, files, level, expandedFolders, selectedFile, onToggleFolder, onSelectFile, getFilePath }: any) {
  const filePath = getFilePath(file, files);
  const isExpanded = file.type === 'folder' && expandedFolders.has(filePath);
  const isSelected = selectedFile === file;
  const hasChildren = file.children && file.children.length > 0;

  return (
    <div>
      <div
        onClick={() => file.type === 'folder' ? onToggleFolder(filePath) : onSelectFile(file)}
        className={cn(
          "flex items-center gap-2 px-3 py-1 cursor-pointer transition-colors text-[12px]",
          isSelected ? "bg-primary/20 text-white border-l-2 border-primary" : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          <FileIcon name={getFileIconName(file.name, file.type === 'folder', isExpanded)} />
        </span>
        <span className="truncate">{file.name}</span>
      </div>
      {isExpanded && file.children && (
        <div>
          {file.children.map((child: any, i: number) => (
            <FileTreeItem key={i} file={child} files={files} level={level + 1} {...{ expandedFolders, selectedFile, onToggleFolder, onSelectFile, getFilePath }} />
          ))}
        </div>
      )}
    </div>
  );
}
