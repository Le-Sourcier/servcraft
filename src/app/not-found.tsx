"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* 404 Number */}
          <div className="relative mb-8">
            <span className="text-[120px] sm:text-[180px] font-bold gradient-text leading-none">
              404
            </span>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl -z-10" />
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">
            Page Not Found
          </h1>

          {/* Description */}
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Oops! The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/">
              <Button size="lg" leftIcon={<Home className="w-4 h-4" />}>
                Go Home
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>

          {/* Quick Links */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              Looking for something else?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { label: "Documentation", href: "/docs" },
                { label: "Quick Start", href: "/quickstart" },
                { label: "Modules", href: "/modules" },
                { label: "CLI Reference", href: "/cli" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-lg text-sm bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
