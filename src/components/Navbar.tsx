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
      initial={{ y: 0, backgroundColor: "rgba(10, 10, 15, 0)" }}
      animate={{
        y: isVisible ? 0 : -100,
        backgroundColor: isScrolled
          ? "rgba(10, 10, 15, 0.8)"
          : "rgba(10, 10, 15, 0)",
        backdropFilter: isScrolled ? "blur(16px)" : "blur(0px)",
        borderBottomColor: isScrolled ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0)",
      }}
      transition={{
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1], // Custom cubic-bezier for professional feel
      }}
      className="fixed top-0 left-0 right-0 z-50 border-b"
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
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-accent p-[1px] shadow-lg shadow-primary/20">
                <div className="w-full h-full rounded-[11px] bg-[#0a0a0f] flex items-center justify-center overflow-hidden">
                  <Image
                    src="/logo.png"
                    alt="ServCraft"
                    width={28}
                    height={28}
                    className="w-7 h-7 object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-20 blur-lg group-hover:opacity-40 transition-opacity" />
            </motion.div>
            <span className="text-xl font-bold tracking-tight text-foreground hidden sm:block">
              Serv<span className="text-primary">Craft</span>
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
                  className="group flex items-center gap-2 px-4 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-300 text-sm font-medium"
                >
                  <BookOpen className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                  Documentation
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 transition-transform duration-300",
                      isDocDropdownOpen && "rotate-90 text-primary"
                    )}
                  />
                </button>
              </motion.div>

              {/* Mega Menu Dropdown */}
              <AnimatePresence>
                {isDocDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[800px] max-w-[90vw] bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] shadow-primary/5 overflow-hidden z-50"
                    onMouseLeave={() => setIsDocDropdownOpen(false)}
                  >
                    <div className="flex">
                      {/* Left Sidebar Info */}
                      <div className="w-1/3 bg-white/5 p-8 border-r border-white/5 flex flex-col justify-between">
                        <div>
                          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                            <BookOpen className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">Documentation</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Everything you need to build scalable and maintainable Node.js backends with ServCraft.
                          </p>
                        </div>
                        <Link
                          href="/docs"
                          onClick={() => setIsDocDropdownOpen(false)}
                          className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors group/all"
                        >
                          Explore all guides
                          <ChevronRight className="w-4 h-4 group-hover/all:translate-x-1 transition-transform" />
                        </Link>
                      </div>

                      {/* Right Grid Content */}
                      <div className="flex-1 p-6">
                        <div className="grid grid-cols-2 gap-2">
                          {docLinks.map((link, index) => (
                            <motion.div
                              key={link.href}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.02 }}
                            >
                              <Link
                                href={link.href as Route}
                                onClick={() => setIsDocDropdownOpen(false)}
                                className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-all duration-300 group/item border border-transparent hover:border-white/5"
                              >
                                <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/10 transition-colors shadow-inner">
                                  <link.icon className="w-5 h-5 text-muted-foreground group-hover/item:text-primary transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <span className="text-sm font-semibold text-foreground group-hover/item:text-primary transition-colors truncate">
                                      {link.title}
                                    </span>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover/item:opacity-100 group-hover/item:text-primary/50 transition-all" />
                                  </div>
                                  <span className="text-xs text-muted-foreground/80 line-clamp-1">
                                    {link.description}
                                  </span>
                                </div>
                              </Link>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Status/Search area */}
                    <div className="px-8 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/50">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          Stable v0.4.9
                        </div>
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/50">
                          <Github className="w-3 h-3" />
                          Open Source
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground/40">
                        <kbd className="px-1.5 py-0.5 font-mono bg-white/5 rounded border border-white/10 uppercase">Esc</kbd>
                        <span>to close</span>
                      </div>
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
                  className="group flex items-center gap-2 px-4 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-300 text-sm font-medium"
                >
                  <item.icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                  {item.label}
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
                  "hidden sm:flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all duration-300",
                  isScrolled
                    ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
                    : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10 hover:border-white/20 hover:-translate-y-0.5"
                )}
              >
                Get Started
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
