"use client";

import type { Route } from 'next';
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Menu,
  X,
  Github,
  Package,
  ChevronRight,
  BookOpen,
  Layers,
  Zap,
  ArrowUpRight,
  Search,
  Play,
  Terminal as TerminalIcon,
  Server,
  Shield,
  Database,
  Cpu,
  Box,
  Settings,
  Code2
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const docLinks = [
  {
    title: "Getting Started",
    description: "Installation and quick setup",
    href: "/docs/getting-started",
    icon: TerminalIcon,
  },
  {
    title: "Quick Start",
    description: "Build your first API in 5 minutes",
    href: "/quickstart",
    icon: Zap,
  },
  {
    title: "Project Structure",
    description: "Understand the codebase layout",
    href: "/docs/structure",
    icon: Box,
  },
  {
    title: "Architecture",
    description: "Learn the modular architecture",
    href: "/docs/architecture",
    icon: Layers,
  },
  {
    title: "Configuration",
    description: "Configure your project",
    href: "/docs/configuration",
    icon: Settings,
  },
  {
    title: "Authentication",
    description: "JWT, OAuth, MFA setup",
    href: "/docs/auth",
    icon: Shield,
  },
  {
    title: "Database",
    description: "Prisma and migrations",
    href: "/docs/database",
    icon: Database,
  },
  {
    title: "CLI Reference",
    description: "All CLI commands",
    href: "/docs/cli",
    icon: Code2,
  },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDocDropdownOpen, setIsDocDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastScrollY = useRef(0);
  const [isVisible, setIsVisible] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 50;

      // Set scrolled state
      setIsScrolled(currentScrollY > scrollThreshold);

      // Hide/show on scroll direction
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    // Close dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDocDropdownOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="ServCraft Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl font-bold gradient-text hidden sm:block">
                ServCraft
              </span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{
        y: isVisible ? 0 : -100,
        backgroundColor: isScrolled
          ? "rgba(10, 10, 15, 0.85)"
          : "rgba(10, 10, 15, 0)",
      }}
      transition={{
        y: { duration: 0.35, ease: "easeInOut" },
        backgroundColor: { duration: 0.3 },
      }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        // Add blur and border when scrolled
        isScrolled && "backdrop-blur-xl border-b border-white/5"
      )}
    >
      {/* Gradient glow effect at bottom when scrolled */}
      <AnimatePresence>
        {isScrolled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-30 blur-xl" />
            </motion.div>
            <span className="text-xl font-bold gradient-text hidden sm:block">
              ServCraft
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Documentation with Dropdown */}
            <div ref={dropdownRef} className="relative">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <button
                  onMouseEnter={() => setIsDocDropdownOpen(true)}
                  onClick={() => setIsDocDropdownOpen(!isDocDropdownOpen)}
                  className="group flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200 text-sm font-medium"
                >
                  <BookOpen className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  Documentation
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 transition-transform duration-200",
                      isDocDropdownOpen && "rotate-90"
                    )}
                  />
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100" />
                </button>
              </motion.div>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isDocDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-80 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl shadow-primary/10 overflow-hidden"
                    onMouseLeave={() => setIsDocDropdownOpen(false)}
                  >
                    {/* Search hint */}
                    <div className="px-4 py-3 bg-secondary/30 border-b border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Quick search</span>
                        <div className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-secondary rounded border border-border">
                            ⌘K
                          </kbd>
                        </div>
                      </div>
                    </div>

                    {/* Links Grid */}
                    <div className="p-2 grid grid-cols-2 gap-1">
                      {docLinks.map((link, index) => (
                        <motion.div
                          key={link.href}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <Link
                            href={link.href as Route}
                            onClick={() => setIsDocDropdownOpen(false)}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                              <link.icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                                  {link.title}
                                </span>
                                <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </div>
                              <span className="text-xs text-muted-foreground truncate block">
                                {link.description}
                              </span>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 bg-secondary/20 border-t border-border">
                      <Link
                        href="/docs"
                        onClick={() => setIsDocDropdownOpen(false)}
                        className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View all documentation
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Other nav items */}
            {[
              { href: "/modules", label: "Modules", icon: Layers },
              { href: "/cli", label: "CLI", icon: TerminalIcon },
              { href: "/playground", label: "Playground", icon: Play },
            ].map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 + 0.25 }}
              >
                <Link
                  href={item.href as Route}
                  className="group flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200 text-sm font-medium"
                >
                  <item.icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  {item.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100" />
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <motion.a
                href="https://github.com/Le-Sourcier/servcraft"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
              >
                <Github className="w-5 h-5" />
              </motion.a>
              <motion.a
                href="https://npmjs.com/package/servcraft"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
              >
                <Package className="w-5 h-5" />
              </motion.a>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Link
                href="/docs"
                className={cn(
                  "hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200",
                  isScrolled
                    ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                    : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/10"
                )}
              >
                Get Started
                <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border"
          >
            <div className="px-4 py-4 space-y-1">
              {[
                { href: "/docs", label: "Documentation", icon: BookOpen },
                { href: "/modules", label: "Modules", icon: Layers },
                { href: "/cli", label: "CLI", icon: TerminalIcon },
                { href: "/playground", label: "Playground", icon: Play },
              ].map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={item.href as Route}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="pt-2 mt-2 border-t border-border"
              >
                <Link
                  href="/docs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
                >
                  Get Started
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
