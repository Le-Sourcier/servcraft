"use client";

import type { Route } from 'next';
import Link from "next/link";
import { Github, Package, Heart } from "lucide-react";

const footerLinks = {
  product: [
    { label: "Features", href: "/#features" },
    { label: "Modules", href: "/modules" },
    { label: "CLI Commands", href: "/cli" },
    { label: "Quick Start", href: "/quickstart" },
  ],
  documentation: [
    { label: "Getting Started", href: "/docs/getting-started" },
    { label: "Project Structure", href: "/docs/structure" },
    { label: "Architecture", href: "/docs/architecture" },
    { label: "Database", href: "/docs/database" },
  ],
  community: [
    { label: "GitHub", href: "https://github.com/Le-Sourcier/servcraft", icon: Github },
    { label: "NPM", href: "https://npmjs.com/package/servcraft", icon: Package },
    { label: "Issues", href: "https://github.com/Le-Sourcier/servcraft/issues", icon: Github },
  ],
  resources: [
    { label: "CLI Reference", href: "/docs/cli" },
    { label: "API Reference", href: "/docs/api" },
    { label: "Authentication", href: "/docs/auth" },
    { label: "Changelog", href: "https://github.com/Le-Sourcier/servcraft/releases" },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold gradient-text">ServCraft</span>
            </Link>
            <p className="text-muted-foreground text-sm mb-4">
              A modular, production-ready Node.js backend framework built with
              TypeScript, Fastify, and Prisma.
            </p>
            <div className="flex items-center gap-3">
              {footerLinks.community.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
                  aria-label={item.label}
                >
                  <item.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href as Route}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Documentation */}
          <div>
            <h3 className="font-semibold mb-4">Documentation</h3>
            <ul className="space-y-3">
              {footerLinks.documentation.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href as Route}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            &copy; {currentYear} ServCraft. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 animate-pulse" />
            <span>for developers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
