"use client";

import { useMemo } from "react";

// Simple syntax highlighting for TypeScript/JavaScript
export function SyntaxHighlighter({
  code,
  language = "typescript"
}: {
  code: string;
  language?: string;
}) {
  const highlightedCode = useMemo(() => {
    if (!code) return "";

    // Escape HTML
    let escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Token patterns
    const patterns: [RegExp, string][] = [
      // Comments
      [/\/\/.*$/gm, "text-muted-foreground"],
      [/\/\*[\s\S]*?\*\//g, "text-muted-foreground"],

      // Strings
      [/"[^"]*"/g, "text-green-400"],
      [/'[^']*'/g, "text-green-400"],
      [/`[^`]*`/g, "text-green-400"],

      // Keywords
      [/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|import|export|from|async|await|try|catch|throw|new|class|extends|typeof|instanceof)\b/g, "text-primary"],

      // TypeScript types
      [/\b(string|number|boolean|void|null|undefined|any|never|unknown|interface|type|enum)\b/g, "text-cyan-400"],

      // Built-in objects
      [/\b(console|require|module|process|Buffer|setTimeout|setInterval|Promise|Map|Set|Array|Object|String|Number|Boolean|Date|Error)\b/g, "text-yellow-400"],

      // Numbers
      [/\b\d+\b/g, "text-orange-400"],

      // Function calls
      [/\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\()/g, "text-yellow-300"],
    ];

    // Apply patterns (simple approach - in production use a proper library)
    // This is a simplified version that just preserves the structure

    return escaped;
  }, [code]);

  return (
    <pre className="font-mono text-sm whitespace-pre-wrap leading-6">
      <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
    </pre>
  );
}

// More advanced syntax highlighter using tokens
export function HighlightedCode({
  code,
  language = "typescript"
}: {
  code: string;
  language?: string;
}) {
  const tokens = useMemo(() => {
    if (!code) return [];

    const lines = code.split("\n");
    const result: { line: number; tokens: { text: string; className: string }[] }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTokens: { text: string; className: string }[] = [];
      let remaining = line;

      // Simple tokenizer
      const patterns: [RegExp, string][] = [
        [/\/\/.*$/, "comment"], // Single line comment
        [/".*?"/, "string"], // Double quoted string
        [/'.*?'/, "string"], // Single quoted string
        [/`.*?`/, "template"], // Template string
        [/\b\d+\.?\d*\b/, "number"], // Numbers
        [/\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\()/g, "function"], // Function calls
        [/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|import|export|from|async|await|try|catch|throw|new|class|extends|typeof|instanceof|this|static|public|private|protected|readonly)\b/g, "keyword"],
        [/\b(string|number|boolean|void|null|undefined|any|never|unknown|interface|type|enum|true|false)\b/g, "type"],
        [/\b[ \t]+/g, "whitespace"],
      ];

      while (remaining.length > 0) {
        let matched = false;

        for (const [regex, className] of patterns) {
          const match = remaining.match(regex);
          if (match && match.index === 0) {
            if (className !== "whitespace") {
              lineTokens.push({ text: match[0], className });
            }
            remaining = remaining.slice(match[0].length);
            matched = true;
            break;
          }
        }

        if (!matched) {
          // Add remaining as plain text
          lineTokens.push({ text: remaining[0], className: "" });
          remaining = remaining.slice(1);
        }
      }

      result.push({ line: i + 1, tokens: lineTokens });
    }

    return result;
  }, [code]);

  return (
    <div className="font-mono text-sm leading-6">
      {tokens.map(({ line, tokens }) => (
        <div key={line} className="flex">
          <span className="text-muted-foreground select-none w-8 text-right pr-2 border-r border-[#313244] mr-2">
            {line}
          </span>
          <span className="flex-1">
            {tokens.map((token, idx) => (
              <span key={idx} className={getTokenClassName(token.className)}>
                {token.text}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function getTokenClassName(type: string): string {
  switch (type) {
    case "comment":
      return "text-muted-foreground";
    case "string":
      return "text-green-400";
    case "template":
      return "text-green-400";
    case "number":
      return "text-orange-400";
    case "function":
      return "text-yellow-300";
    case "keyword":
      return "text-primary font-semibold";
    case "type":
      return "text-cyan-400";
    default:
      return "text-foreground";
  }
}

// Export token colors as CSS
export const syntaxStyles = `
  .syntax-keyword { color: #c084fc; font-weight: 600; }
  .syntax-string { color: #4ade80; }
  .syntax-comment { color: #6b7280; font-style: italic; }
  .syntax-number { color: #fb923c; }
  .syntax-function { color: #fde047; }
  .syntax-type { color: #22d3ee; }
  .syntax-keyword { color: #c084fc; font-weight: 600; }
  .syntax-string { color: #4ade80; }
  .syntax-comment { color: #6b7280; font-style: italic; }
  .syntax-number { color: #fb923c; }
  .syntax-function { color: #fde047; }
  .syntax-type { color: #22d3ee; }
`;
