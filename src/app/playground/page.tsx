"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Terminal,
  Play,
  RotateCcw,
  Loader2,
  Check,
  Copy,
  Sparkles,
  Shield,
  Clock,
  Cpu,
  AlertTriangle,
  ChevronDown,
  Code2,
  Zap,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

const availableModules = [
  { id: "auth", name: "Authentication", description: "JWT, OAuth, MFA" },
  { id: "users", name: "Users", description: "User CRUD operations" },
  { id: "email", name: "Email", description: "SMTP email sending" },
  { id: "cache", name: "Cache", description: "Redis caching" },
  { id: "queue", name: "Queue", description: "Background jobs" },
  { id: "websocket", name: "WebSocket", description: "Real-time communication" },
];

const templates = [
  {
    id: "hello",
    name: "Hello World",
    description: "Print a greeting message",
    code: `// Hello World Example
// This is your first ServCraft program!

console.log("=================================");
console.log("Welcome to ServCraft Playground!");
console.log("=================================");
console.log("");
console.log("Version: 0.4.9");
console.log("Status: Running smoothly");
console.log("");

// Try adding modules to unlock more features
// Available: auth, users, email, cache, queue, websocket

console.log("Ready for coding! 🚀");`,
  },
  {
    id: "api",
    name: "Simple API",
    description: "Basic API endpoint structure",
    code: `// Simple API Endpoint Example
// Define a basic API route

console.log("Setting up API endpoints...");
console.log("");

// Simulated route definitions
const routes = [
  { method: "GET", path: "/api/health", handler: () => "OK" },
  { method: "GET", path: "/api/users", handler: () => "[]" },
  { method: "POST", path: "/api/users", handler: () => "Created" },
];

routes.forEach(route => {
  console.log(\`[\${route.method}] \${route.path} -> \${route.handler()}\`);
});

console.log("");
console.log("API Server initialized on port 3000");
console.log("Listening for requests...");`,
  },
  {
    id: "auth",
    name: "Authentication",
    description: "User login simulation (requires auth module)",
    code: `// Authentication Example
// Requires: auth module

console.log("Auth Service initialized");
console.log("");

// Simulate user authentication
const users = [
  { id: 1, email: "admin@example.com", role: "ADMIN" },
  { id: 2, email: "user@example.com", role: "USER" },
];

// Login simulation
function login(email, password) {
  console.log(\`Attempting login for: \${email}\`);

  // Simulate password check
  if (password.length < 4) {
    console.log("Error: Password too short");
    return null;
  }

  const user = users.find(u => u.email === email);
  if (user) {
    console.log(\`Success! Logged in as \${user.role}\`);
    return {
      user,
      accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    };
  }

  console.log("Error: User not found");
  return null;
}

// Test login
login("admin@example.com", "password123");
login("unknown@example.com", "pass");

console.log("");
console.log("Authentication flow complete");`,
  },
  {
    id: "database",
    name: "Database",
    description: "Database operations (requires users module)",
    code: `// Database Operations Example
// Requires: users module + database connection

console.log("Initializing database connection...");
console.log("Connected to: postgresql://localhost:5432/servcraft");
console.log("");

// Simulate Prisma operations
const db = {
  users: {
    findMany: async () => [
      { id: 1, name: "Alice", email: "alice@example.com" },
      { id: 2, name: "Bob", email: "bob@example.com" },
    ],
    create: async (data) => ({ id: 3, ...data }),
    update: async (where, data) => ({ ...where, ...data }),
    delete: async (where) => ({ ...where }),
  }
};

async function queryUsers() {
  console.log("Fetching all users...");
  const users = await db.users.findMany();
  console.log(\`Found \${users.length} users:\`);
  users.forEach(u => console.log(\`  - \${u.name} (\${u.email})\`));
}

async function createUser() {
  console.log("Creating new user...");
  const user = await db.users.create({
    name: "Charlie",
    email: "charlie@example.com",
  });
  console.log(\`Created: \${JSON.stringify(user)}\`);
}

async function runQueries() {
  await queryUsers();
  await createUser();
}

runQueries();

console.log("");
console.log("Database operations completed");`,
  },
];

const defaultCode = templates[0].code;

export default function PlaygroundPage() {
  const [code, setCode] = useState(defaultCode);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [showModules, setShowModules] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ executionTime: 0, memoryUsed: 0 });
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((m) => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const loadTemplate = (template: typeof templates[0]) => {
    setCode(template.code);
    setSelectedModules([]);
    setOutput("");
    setError(null);
    setShowTemplates(false);
  };

  const runCode = async () => {
    setIsRunning(true);
    setError(null);
    setOutput("");
    setStats({ executionTime: 0, memoryUsed: 0 });

    const startTime = Date.now();

    try {
      const response = await fetch("/api/playground/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          modules: selectedModules,
          timeout: 5000,
          maxMemory: 50,
        }),
      });

      const result = await response.json();
      const endTime = Date.now();

      if (result.success) {
        setOutput(result.output || "Code executed successfully (no output)");
        setStats({
          executionTime: endTime - startTime,
          memoryUsed: result.memoryUsed || 0,
        });
      } else {
        setError(result.error || "Execution failed");
        setOutput(result.output || "");
      }
    } catch (err) {
      setError("Failed to connect to sandbox server");
      setOutput("");
    } finally {
      setIsRunning(false);
    }
  };

  const resetCode = () => {
    setCode(defaultCode);
    setSelectedModules([]);
    setOutput("");
    setError(null);
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Compact Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Terminal className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold gradient-text">Playground</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <span>•</span>
              <span>5s timeout</span>
              <span>•</span>
              <span>50MB limit</span>
              <span>•</span>
              <span>Sandboxed</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Templates Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTemplates(!showTemplates);
                  setShowModules(false);
                }}
                className="gap-1 h-8 text-xs"
              >
                <Code2 className="w-3 h-3" />
                <span className="hidden sm:inline">Templates</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", showTemplates && "rotate-180")} />
              </Button>

              {showTemplates && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowTemplates(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <p className="text-xs font-medium text-muted-foreground px-2">Choose a template</p>
                    </div>
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => loadTemplate(template)}
                        className="w-full text-left px-4 py-2.5 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Modules Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowModules(!showModules);
                  setShowTemplates(false);
                }}
                className="gap-1 h-8 text-xs"
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">Modules</span>
                {selectedModules.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {selectedModules.length}
                  </span>
                )}
                <ChevronDown className={cn("w-3 h-3 transition-transform", showModules && "rotate-180")} />
              </Button>

              {showModules && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowModules(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <p className="text-xs font-medium text-muted-foreground px-2">Select modules to enable</p>
                    </div>
                    {availableModules.map((module) => (
                      <button
                        key={module.id}
                        onClick={() => toggleModule(module.id)}
                        className="w-full text-left px-4 py-2 hover:bg-secondary/50 transition-colors flex items-center gap-3"
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                            selectedModules.includes(module.id)
                              ? "bg-primary border-primary"
                              : "border-border"
                          )}
                        >
                          {selectedModules.includes(module.id) && (
                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{module.name}</div>
                          <div className="text-xs text-muted-foreground">{module.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Run Button */}
            <Button
              onClick={runCode}
              disabled={isRunning}
              size="sm"
              className="gap-1 h-8"
            >
              {isRunning ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{isRunning ? "Running..." : "Run"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Full height minus compact header */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4">
        <div className="grid lg:grid-cols-2 gap-4 h-[calc(100vh-8rem)]">
          {/* Code Editor */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm">
                <Code2 className="w-4 h-4 text-primary" />
                <span className="font-medium">Code</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetCode}
                className="gap-1 h-7 text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </Button>
            </div>
            <div className="flex-1 bg-[#0d0d14] border border-border rounded-xl overflow-hidden">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-transparent text-foreground resize-none focus:outline-none code-gradient"
                spellCheck={false}
                placeholder="Write your code here..."
              />
            </div>
          </motion.div>

          {/* Output Terminal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="font-medium">Output</span>
              </div>
              {output && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyOutput}
                  className="gap-1 h-7 text-xs"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 text-red-400 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium text-sm">Error</span>
                </div>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Output Panel */}
            <div className="flex-1 bg-[#0d0d14] border border-border rounded-xl overflow-hidden flex flex-col">
              {/* Stats Bar */}
              <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-secondary/20 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>{stats.executionTime}ms</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3 h-3" />
                  <span>{stats.memoryUsed}MB</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  <span>Sandboxed</span>
                </div>
              </div>

              {/* Output Content */}
              <div
                ref={outputRef}
                className="flex-1 p-4 overflow-auto font-mono text-sm"
              >
                {output ? (
                  <pre className="text-foreground whitespace-pre-wrap">{output}</pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Zap className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Click "Run" to execute</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Compact Footer */}
      <div className="border-t border-border py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <Link href="/docs" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <ExternalLink className="w-3 h-3" />
              <span>View Documentation</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span>Powered by ServCraft</span>
          </div>
        </div>
      </div>
    </div>
  );
}
