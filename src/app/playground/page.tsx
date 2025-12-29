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
  ExternalLink,
  FileCode,
  Database,
  Key,
  Mail,
  HardDrive,
  Radio,
  Users
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

const availableModules = [
  { id: "auth", name: "Authentication", description: "JWT, OAuth, MFA", icon: Key },
  { id: "users", name: "Users", description: "User CRUD operations", icon: Users },
  { id: "email", name: "Email", description: "SMTP email sending", icon: Mail },
  { id: "cache", name: "Cache", description: "Redis caching", icon: Database },
  { id: "queue", name: "Queue", description: "Background jobs", icon: HardDrive },
  { id: "websocket", name: "WebSocket", description: "Real-time communication", icon: Radio },
];

const templates = [
  {
    id: "hello",
    name: "Hello World",
    description: "Print a greeting message",
    code: `// Hello World Example
// Welcome to ServCraft Playground!

console.log("=================================");
console.log("Welcome to ServCraft Playground!");
console.log("=================================");
console.log("");
console.log("Version: 0.4.9");
console.log("Status: Running smoothly");
console.log("");

// Available modules: auth, users, email, cache, queue, websocket
// Enable modules from the dropdown above

console.log("Ready for coding! 🚀");

// Try some JavaScript!
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Doubled numbers:", doubled);

const sum = numbers.reduce((a, b) => a + b, 0);
console.log("Sum:", sum);

console.log("");
console.log("Happy coding! 🎉");`,
  },
  {
    id: "functions",
    name: "Functions",
    description: "Learn about functions",
    code: `// Functions Example
// Functions are reusable blocks of code

// Basic function
function greet(name) {
  return \`Hello, \${name}! Welcome to ServCraft.\`;
}

console.log(greet("Developer"));

// Arrow function
const add = (a, b) => a + b;
console.log(\`2 + 3 = \${add(2, 3)}\`);

// Higher-order function
const createMultiplier = (factor) => {
  return (num) => num * factor;
};

const triple = createMultiplier(3);
console.log(\`5 × 3 = \${triple(5)}\`);

// Async function example
async function fetchData() {
  // Simulating an async operation
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ id: 1, name: "Data fetched!" });
    }, 100);
  });
}

// Call the async function
const data = await fetchData();
console.log("Async result:", JSON.stringify(data));`,
  },
  {
    id: "objects",
    name: "Objects & Arrays",
    description: "Working with data structures",
    code: `// Objects and Arrays Example

// Object with methods
const user = {
  name: "Alice",
  email: "alice@example.com",
  role: "ADMIN",

  greet() {
    return \`Hello, I'm \${this.name}\`;
  },

  getInfo() {
    return {
      name: this.name,
      email: this.email,
      role: this.role
    };
  }
};

console.log(user.greet());
console.log("User info:", JSON.stringify(user.getInfo(), null, 2));

// Array operations
const products = [
  { name: "Laptop", price: 999, category: "Electronics" },
  { name: "Book", price: 15, category: "Education" },
  { name: "Phone", price: 699, category: "Electronics" },
  { name: "Desk", price: 299, category: "Furniture" }
];

// Filter, map, reduce
const electronics = products.filter(p => p.category === "Electronics");
console.log("Electronics:", electronics.map(p => p.name).join(", "));

const totalPrice = products.reduce((sum, p) => sum + p.price, 0);
console.log("Total price: $" + totalPrice);

// Destructuring
const { name, price } = products[0];
console.log(\`First product: \${name} costs $\${price}\`);`,
  },
  {
    id: "auth",
    name: "Authentication",
    description: "JWT token generation (requires auth module)",
    code: `// Authentication Example with Auth Module
// Enable 'auth' module to use these features

console.log("=== Authentication Module Demo ===");
console.log("");

// Generate a JWT token
const payload = {
  userId: 123,
  email: "user@example.com",
  role: "ADMIN",
  iat: Date.now()
};

const token = auth.generateToken(payload);
console.log("Generated JWT Token:");
console.log(token.substring(0, 50) + "...");

console.log("");

// Verify the token
const verified = auth.verifyToken(token);
if (verified.valid) {
  console.log("Token is valid!");
  console.log("Payload:", JSON.stringify(verified.payload, null, 2));
} else {
  console.log("Token verification failed:", verified.error);
}

console.log("");

// Password hashing
const password = "securePassword123";
const hash = auth.hashPassword(password);
console.log("Password hash:", hash);

console.log("");
console.log("Password verification:", auth.verifyPassword(password, hash));
console.log("Wrong password verification:", auth.verifyPassword("wrongPassword", hash));`,
  },
  {
    id: "users",
    name: "Users CRUD",
    description: "User database operations (requires users module)",
    code: `// Users CRUD Example
// Enable 'users' module to use these features

console.log("=== Users Module Demo ===");
console.log("");

// List all users
console.log("All users:");
const allUsers = users.findAll();
allUsers.forEach(u => {
  console.log(\`  - \${u.name} (\${u.email}) - \${u.role}\`);
});

console.log("");

// Find user by ID
console.log("Find user by ID 1:");
const user = users.findById(1);
console.log(user);

console.log("");

// Create new user
console.log("Creating new user...");
const newUser = users.create({
  name: "David",
  email: "david@example.com",
  role: "USER"
});
console.log("Created:", newUser);

console.log("");

// Update user
console.log("Updating user 1...");
const updated = users.update(1, { name: "Alice Smith" });
console.log("Updated:", updated);

console.log("");

// Delete user
console.log("Deleting user 3...");
const deleted = users.delete(3);
console.log("Deleted:", deleted);

console.log("");

// Final user list
console.log("Final users:");
users.findAll().forEach(u => {
  console.log(\`  - \${u.name} (\${u.email}) - \${u.role}\`);
});`,
  },
  {
    id: "cache",
    name: "Cache Operations",
    description: "Redis-like cache (requires cache module)",
    code: `// Cache Operations Example
// Enable 'cache' module to use these features

console.log("=== Cache Module Demo ===");
console.log("");

// Set values in cache
console.log("Setting cache values...");
cache.set("user:1", { name: "Alice", role: "ADMIN" }, 60);
cache.set("user:2", { name: "Bob", role: "USER" }, 60);
cache.set("counter", 42, 120);

console.log("");

// Get values
console.log("Getting cache values...");
const user1 = cache.get("user:1");
console.log("user:1:", user1);

const user2 = cache.get("user:2");
console.log("user:2:", user2);

const counter = cache.get("counter");
console.log("counter:", counter);

console.log("");

// Non-existent key
const missing = cache.get("missing");
console.log("missing key:", missing);

console.log("");

// Delete key
console.log("Deleting user:2...");
const deleted = cache.del("user:2");
console.log("Deleted:", deleted);

console.log("");

// Get stats
console.log("Verifying deletion...");
console.log("user:2 after delete:", cache.get("user:2"));`,
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
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [activeTemplate, setActiveTemplate] = useState(templates[0].id);

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
    setSyntaxError(null);
    setShowTemplates(false);
    setActiveTemplate(template.id);
  };

  const runCode = async () => {
    setIsRunning(true);
    setError(null);
    setSyntaxError(null);
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

      // Check for syntax errors first
      if (result.syntaxError) {
        setSyntaxError(result.syntaxError);
        setIsRunning(false);
        return;
      }

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
    setSyntaxError(null);
    setActiveTemplate(templates[0].id);
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, selectedModules]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Compact Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left Section */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Terminal className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold gradient-text">Playground</span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="px-1.5 py-0.5 rounded bg-secondary/50">Ctrl+Enter</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">5s timeout</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">50MB</span>
            </div>
          </div>

          {/* Right Section - Controls */}
          <div className="flex items-center gap-1">
            {/* Templates Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTemplates(!showTemplates);
                  setShowModules(false);
                }}
                className="gap-1 h-8 text-xs px-2 sm:px-3"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Templates</span>
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
                        className={cn(
                          "w-full text-left px-4 py-2.5 hover:bg-secondary/50 transition-colors",
                          activeTemplate === template.id && "bg-primary/10 text-primary"
                        )}
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
                className="gap-1 h-8 text-xs px-2 sm:px-3"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Modules</span>
                {selectedModules.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
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
                        <module.icon className="w-4 h-4 text-muted-foreground" />
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

            <div className="h-5 w-px bg-border mx-1" />

            {/* Run Button */}
            <Button
              onClick={runCode}
              disabled={isRunning}
              size="sm"
              className="gap-1 h-8 px-3 sm:px-4"
            >
              {isRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span className="hidden xs:inline font-medium">{isRunning ? "Running..." : "Run"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Full height minus compact header */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4">
        <div className="grid lg:grid-cols-2 gap-4 h-[calc(100vh-10rem)] sm:h-[calc(100vh-8rem)]">
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
                {selectedModules.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                    <Sparkles className="w-3 h-3" />
                    {selectedModules.join(", ")}
                  </span>
                )}
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
            <div className="flex-1 bg-[#0d0d14] border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="flex-1 relative">
                {/* Line numbers */}
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-[#0a0a0f] border-r border-border/50 flex flex-col pt-4 px-2 text-xs text-muted-foreground font-mono leading-6 select-none">
                  {code.split("\n").map((_, i) => (
                    <div key={i} className="text-right">{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-full pl-12 p-4 font-mono text-sm bg-transparent text-foreground resize-none focus:outline-none leading-6"
                  spellCheck={false}
                  placeholder="Write your code here..."
                />
              </div>
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

            {/* Syntax Error Banner */}
            {syntaxError && (
              <div className="mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2 text-red-400 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium text-sm">Syntax Error</span>
                </div>
                <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">{syntaxError}</pre>
              </div>
            )}

            {/* Runtime Error Banner */}
            {error && !syntaxError && (
              <div className="mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2 text-red-400 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium text-sm">Runtime Error</span>
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
                      <p className="text-sm">Click "Run" or press Ctrl+Enter to execute</p>
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
