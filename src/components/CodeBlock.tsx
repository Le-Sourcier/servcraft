"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({
  code,
  language = "bash",
  title,
  showLineNumbers = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const lines = code.split("\n");

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#0d0d14] my-6">
      {/* Header */}
      {(title || language) && (
        <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b border-border">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            {title && <span className="text-sm text-muted-foreground">{title}</span>}
            {!title && (
              <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground uppercase">
                {language}
              </span>
            )}
          </div>
          <button
            onClick={copyToClipboard}
            className={cn(
              "p-1.5 rounded-lg transition-all duration-200",
              copied
                ? "text-green-400 bg-green-400/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Code */}
      <div className="overflow-x-auto">
        <pre ref={codeRef} className="p-4 text-sm">
          {lines.map((line, i) => (
            <div key={i} className="flex">
              {showLineNumbers && (
                <span className="select-none text-muted-foreground/50 w-8 text-right pr-4 flex-shrink-0">
                  {i + 1}
                </span>
              )}
              <code className={cn("text-foreground", language === "bash" && "code-gradient font-mono")}>
                {line}
              </code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
