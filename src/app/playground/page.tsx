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

  // State for project
  const [files, setFiles] = useState<FileNode[]>(initialProjectFiles);
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
    if (!selectedFile || !containerSession.isReady) return;

    addTerminalOutput([`$ node ${selectedFile.name}`], 'command');
    addTerminalOutput(['Running code...'], 'system');

    try {
      const res = await containerSession.executeCode(selectedFile.content || "", selectedFile.name);
      if (res.output) addTerminalOutput([res.output], 'output');
      if (res.error) addTerminalOutput([res.error], 'error');
      if (!res.output && !res.error) addTerminalOutput(['(No output)'], 'system');
    } catch (err) {
      addTerminalOutput([`Execution error: ${err}`], 'error');
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
             {!containerSession.isReady ? (
               <div className="flex items-center gap-2 text-xs text-yellow-400/80">
                 <Loader2 className="w-3 h-3 animate-spin" />
                 <span>Initializing Docker Sandbox...</span>
               </div>
             ) : (
               <div className="flex items-center gap-2 text-xs text-green-400/80">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 <span>Sandbox Ready</span>
               </div>
             )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!containerSession.isReady || !selectedFile}
            onClick={runCode}
            className="gap-1 h-7 text-xs px-3 bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            <span>Run</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => confirm('Clear all changes and reset?') && resetPlayground()}
            className="h-7 text-xs px-2 text-muted-foreground hover:text-red-400"
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
      <div className="flex-1 flex overflow-hidden">
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
