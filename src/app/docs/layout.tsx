"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  ArrowLeft,
  Terminal,
  FileCode,
  Database,
  Shield,
  Layers,
  BookOpen,
  Cpu,
  Globe,
  Box,
  Home,
  Sparkles,
  Settings,
  Zap,
  X,
  Command,
  ArrowUp,
  ArrowDown,
  CornerDownLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";

const sidebarSections = [
  {
    title: "Getting Started",
    items: [
      { href: "/docs", label: "Introduction", icon: BookOpen },
      { href: "/docs/getting-started", label: "Installation", icon: Sparkles },
      { href: "/quickstart", label: "Quick Start", icon: Zap },
      { href: "/playground", label: "Playground", icon: Zap, highlight: true },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { href: "/docs/structure", label: "Project Structure", icon: Box },
      { href: "/docs/architecture", label: "Architecture", icon: Layers },
      { href: "/docs/configuration", label: "Configuration", icon: Settings },
    ],
  },
  {
    title: "Features",
    items: [
      { href: "/docs/auth", label: "Authentication", icon: Shield },
      { href: "/docs/database", label: "Database", icon: Database },
      { href: "/docs/cli", label: "CLI Reference", icon: Terminal },
      { href: "/docs/api", label: "API Reference", icon: Cpu },
    ],
  },
  {
    title: "Modules",
    items: [
      { href: "/modules", label: "All Modules", icon: Globe },
    ],
  },
];

const searchContents = [
  { category: "Getting Started", items: [
    { title: "Installation", href: "/docs/getting-started", desc: "How to install ServCraft CLI" },
    { title: "Quick Start", href: "/quickstart", desc: "Create your first project in 5 minutes" },
    { title: "Playground", href: "/playground", desc: "Test ServCraft online in your browser" },
  ]},
  { category: "Core Concepts", items: [
    { title: "Project Structure", href: "/docs/structure", desc: "Understand the generated codebase" },
    { title: "Architecture", href: "/docs/architecture", desc: "Learn about the modular architecture" },
    { title: "Configuration", href: "/docs/configuration", desc: "Configure your project settings" },
  ]},
  { category: "Features", items: [
    { title: "Authentication", href: "/docs/auth", desc: "JWT, OAuth, MFA, and RBAC" },
    { title: "Database", href: "/docs/database", desc: "Prisma ORM and migrations" },
    { title: "CLI Reference", href: "/docs/cli", desc: "Complete command reference" },
    { title: "API Reference", href: "/docs/api", desc: "All available services and methods" },
  ]},
  { category: "Modules", items: [
    { title: "Browse Modules", href: "/modules", desc: "Explore all available modules" },
  ]},
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get all searchable items as flat list for navigation
  const allItems = searchContents.flatMap(section =>
    section.items.map(item => ({ ...item, category: section.category }))
  );

  const filteredResults = searchQuery
    ? searchContents.map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.desc.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.items.length > 0)
    : searchContents;

  const totalResults = searchQuery
    ? filteredResults.flatMap(s => s.items).length
    : allItems.length;

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  // Keyboard shortcut to open search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleSearchShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener("keydown", handleSearchShortcut);
    return () => document.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  // Keyboard navigation inside search modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isSearchOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setIsSearchOpen(false);
      setSearchQuery("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalResults);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalResults) % totalResults);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const items = searchQuery
        ? filteredResults.flatMap(s => s.items)
        : allItems;
      if (items[selectedIndex]) {
        window.location.href = items[selectedIndex].href;
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    }
  }, [isSearchOpen, searchQuery, filteredResults, selectedIndex, totalResults]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(true)}
            className="gap-2"
          >
            <Menu className="w-5 h-5" />
            <span className="font-semibold">Docs</span>
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
            className="gap-2"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery("");
              }}
            />

            {/* Modal - Fullscreen on mobile, centered on desktop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 lg:top-[10%] lg:bottom-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-xl lg:max-h-[60vh] lg:rounded-xl z-50
                bg-card border border-border
                lg:shadow-2xl
                flex flex-col
                m-0 lg:m-4
                h-screen lg:h-auto"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 lg:py-4 border-b border-border bg-card">
                <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search documentation..."
                  className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  {searchQuery && (
                    <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-mono bg-secondary rounded border border-border text-muted-foreground">
                      ESC
                    </kbd>
                  )}
                  <button
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="lg:hidden p-1 hover:bg-secondary rounded transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto">
                {searchQuery ? (
                  filteredResults.length > 0 ? (
                    <div className="py-2">
                      {filteredResults.map((section) => (
                        <div key={section.category}>
                          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {section.category}
                          </div>
                          {section.items.map((item, idx) => {
                            // Calculate global index for selection
                            const globalIdx = searchQuery
                              ? filteredResults.flatMap(s => s.items).findIndex(i => i.href === item.href)
                              : allItems.findIndex(i => i.href === item.href);
                            const isSelected = globalIdx === selectedIndex;

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  setSearchQuery("");
                                }}
                                className={cn(
                                  "flex items-start gap-3 px-4 py-3 transition-all duration-150",
                                  isSelected
                                    ? "bg-primary/20 border-l-2 border-primary"
                                    : "hover:bg-secondary/50 border-l-2 border-transparent"
                                )}
                              >
                                <div className="mt-0.5">
                                  <FileCode className={cn(
                                    "w-4 h-4",
                                    isSelected ? "text-primary" : "text-muted-foreground"
                                  )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={cn(
                                    "font-medium truncate",
                                    isSelected ? "text-primary" : "text-foreground"
                                  )}>
                                    {item.title}
                                  </div>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {item.desc}
                                  </div>
                                </div>
                                {isSelected && (
                                  <CornerDownLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                      <p className="text-sm text-muted-foreground/60 mt-1">Try a different search term</p>
                    </div>
                  )
                ) : (
                  <div className="py-2">
                    {searchContents.map((section, sectionIdx) => {
                      const sectionStartIdx = allItems
                        .slice(0, allItems.findIndex(i => i.category === section.category))
                        .length;
                      return (
                        <div key={section.category}>
                          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {section.category}
                          </div>
                          {section.items.map((item) => {
                            const globalIdx = allItems.findIndex(i => i.href === item.href);
                            const isSelected = globalIdx === selectedIndex;

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  setSearchQuery("");
                                }}
                                className={cn(
                                  "flex items-start gap-3 px-4 py-3 transition-all duration-150",
                                  isSelected
                                    ? "bg-primary/20 border-l-2 border-primary"
                                    : "hover:bg-secondary/50 border-l-2 border-transparent"
                                )}
                              >
                                <div className="mt-0.5">
                                  <FileCode className={cn(
                                    "w-4 h-4",
                                    isSelected ? "text-primary" : "text-muted-foreground"
                                  )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={cn(
                                    "font-medium truncate",
                                    isSelected ? "text-primary" : "text-foreground"
                                  )}>
                                    {item.title}
                                  </div>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {item.desc}
                                  </div>
                                </div>
                                {isSelected && (
                                  <CornerDownLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer with shortcuts */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20 text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <kbd className="px-1.5 py-0.5 font-mono bg-secondary rounded border border-border text-foreground">↵</kbd>
                    <span>Select</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <kbd className="px-1.5 py-0.5 font-mono bg-secondary rounded border border-border text-foreground">
                      <ArrowUp className="w-3 h-3 inline" />
                      <ArrowDown className="w-3 h-3 inline -ml-1" />
                    </kbd>
                    <span>Navigate</span>
                  </span>
                  <span className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
                    <kbd className="px-1.5 py-0.5 font-mono bg-secondary rounded border border-border text-foreground">ESC</kbd>
                    <span>Close</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Command className="w-3.5 h-3.5" />
                  <kbd className="px-1.5 py-0.5 font-mono bg-secondary rounded border border-border text-foreground">K</kbd>
                  <span className="hidden sm:inline">Search</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] bg-background border-r border-border z-50 overflow-y-auto"
            >
              <SidebarContent
                isCollapsed={false}
                pathname={pathname}
                onClose={() => setIsMobileOpen(false)}
                onSearchClick={() => {
                  setIsMobileOpen(false);
                  setIsSearchOpen(true);
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 transition-all duration-300 border-r border-border bg-background/50 backdrop-blur-lg",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                <Terminal className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold gradient-text">ServCraft</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("h-8 w-8 p-0", isCollapsed && "mx-auto")}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        <SidebarContent
          isCollapsed={isCollapsed}
          pathname={pathname}
          onSearchClick={() => setIsSearchOpen(true)}
        />
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "transition-all duration-300 pt-14 lg:pt-0",
          isCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({
  isCollapsed,
  pathname,
  onClose,
  onSearchClick,
}: {
  isCollapsed: boolean;
  pathname: string;
  onClose?: () => void;
  onSearchClick?: () => void;
}) {
  return (
    <div className="flex flex-col h-full py-4">
      {/* Search */}
      {!isCollapsed && (
        <div className="px-3 mb-4">
          <button
            onClick={onSearchClick}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border hover:border-primary/50 transition-colors text-left"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-sm text-muted-foreground">Search docs...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono bg-secondary rounded border border-border">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-6 overflow-y-auto">
        {sidebarSections.map((section) => (
          <div key={section.title}>
            {!isCollapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const isHighlighted = item.highlight;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : isHighlighted
                            ? "bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20 hover:border-primary/40"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                        isCollapsed && "justify-center"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary", isHighlighted && "text-primary")} />
                      {!isCollapsed && (
                        <span className={cn("truncate", isHighlighted && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium")}>
                          {item.label}
                        </span>
                      )}
                      {isActive && !isCollapsed && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      {!isCollapsed && (
        <div className="px-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
            <a
              href="https://github.com/Le-Sourcier/servcraft"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
