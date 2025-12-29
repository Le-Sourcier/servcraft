import { createHash } from "node:crypto";

// Note: vm module is loaded dynamically in executeInSandbox for Next.js compatibility
// Using node:vm requires enabling node built-ins in Next.js config

export interface SandboxConfig {
  code: string;
  modules: string[];
  timeout: number; // en millisecondes
  maxMemory: number; // en MB
}

export interface SandboxResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsed?: number;
  syntaxError?: string;
}

// Module simulations for the playground
interface User extends Record<string, unknown> {
  id: number;
  name?: string;
  email?: string;
  role?: string;
}

interface UserModule {
  users: User[];
  findAll: () => User[];
  findById: (id: number) => User | undefined;
  findByEmail: (email: string) => User | undefined;
  create: (data: Record<string, unknown>) => User;
  update: (id: number, data: Record<string, unknown>) => User | null;
  delete: (id: number) => User | null;
}

interface CacheModule {
  cache: Map<string, { value: unknown; expiresAt: number }>;
  get: (key: string) => unknown;
  set: (key: string, value: unknown, ttlSeconds?: number) => boolean;
  del: (key: string) => boolean;
  flush: () => boolean;
}

interface QueueJob extends Record<string, unknown> {
  id: string;
  name: string;
  data: Record<string, unknown>;
  status: string;
}

interface QueueModule {
  jobs: QueueJob[];
  add: (name: string, data: Record<string, unknown>) => QueueJob;
  process: (name: string, handler: (job: Record<string, unknown>) => Promise<unknown>) => Promise<unknown>;
  getStats: () => { pending: number; processing: number; completed: number };
}

interface WebSocketModule {
  connections: string[];
  connect: (url: string) => string;
  send: (connId: string, data: string) => boolean;
  disconnect: (connId: string) => boolean;
  broadcast: (data: string) => number;
}

const moduleSimulations: {
  auth: Record<string, unknown>;
  users: UserModule;
  email: Record<string, unknown>;
  cache: CacheModule;
  queue: QueueModule;
  websocket: WebSocketModule;
} = {
  auth: {
    // Simulated JWT token generation
    generateToken: (payload: Record<string, unknown>) => {
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const signature = createHash("sha256").update(`${header}.${payloadB64}`).digest("hex").slice(0, 32);
      return `${header}.${payloadB64}.${signature}`;
    },
    // Verify a mock token
    verifyToken: (token: string) => {
      const parts = token.split(".");
      if (parts.length !== 3) return { valid: false, error: "Invalid token format" };
      try {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
        return { valid: true, payload };
      } catch {
        return { valid: false, error: "Invalid token payload" };
      }
    },
    // Hash password (mock)
    hashPassword: (password: string) => {
      return createHash("sha256").update(password).digest("hex");
    },
    // Verify password (mock)
    verifyPassword: (password: string, hash: string) => {
      return createHash("sha256").update(password).digest("hex") === hash;
    },
  },
  users: {
    // Mock user database
    users: [
      { id: 1, name: "Alice", email: "alice@example.com", role: "ADMIN" },
      { id: 2, name: "Bob", email: "bob@example.com", role: "USER" },
      { id: 3, name: "Charlie", email: "charlie@example.com", role: "USER" },
    ],
    findAll: () => [...(globalThis.__usersModule?.users || [])],
    findById: (id: number) => globalThis.__usersModule?.users.find(u => u.id === id),
    findByEmail: (email: string) => globalThis.__usersModule?.users.find(u => u.email === email),
    create: (data: Record<string, unknown>) => {
      const newUser = { id: Date.now(), ...data } as User;
      globalThis.__usersModule?.users.push(newUser);
      return newUser;
    },
    update: (id: number, data: Record<string, unknown>) => {
      const idx = globalThis.__usersModule?.users.findIndex(u => u.id === id);
      if (idx !== undefined && idx >= 0) {
        globalThis.__usersModule!.users[idx] = { ...globalThis.__usersModule!.users[idx], ...data } as User;
        return globalThis.__usersModule!.users[idx];
      }
      return null;
    },
    delete: (id: number) => {
      const idx = globalThis.__usersModule?.users.findIndex(u => u.id === id);
      if (idx !== undefined && idx >= 0) {
        return globalThis.__usersModule!.users.splice(idx, 1)[0];
      }
      return null;
    },
  },
  email: {
    // Mock email sending
    send: async (to: string, subject: string, body: string) => {
      console.log(`[EMAIL] Sending email to: ${to}`);
      console.log(`[EMAIL] Subject: ${subject}`);
      return { success: true, messageId: `msg_${Date.now()}` };
    },
    sendTemplate: async (to: string, template: string, data: Record<string, unknown>) => {
      console.log(`[EMAIL] Sending template '${template}' to: ${to}`);
      return { success: true, rendered: true };
    },
  },
  cache: {
    // Mock Redis cache
    cache: new Map<string, { value: unknown; expiresAt: number }>(),
    get: (key: string) => {
      const item = globalThis.__cacheModule?.cache.get(key);
      if (!item) return null;
      if (Date.now() > item.expiresAt) {
        globalThis.__cacheModule?.cache.delete(key);
        return null;
      }
      return item.value;
    },
    set: (key: string, value: unknown, ttlSeconds = 300) => {
      globalThis.__cacheModule?.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      return true;
    },
    del: (key: string) => {
      return globalThis.__cacheModule?.cache.delete(key) || false;
    },
    flush: () => {
      globalThis.__cacheModule?.cache.clear();
      return true;
    },
  },
  queue: {
    // Mock job queue
    jobs: [] as QueueJob[],
    add: (name: string, data: Record<string, unknown>) => {
      const job = { id: `job_${Date.now()}`, name, data, status: "pending" };
      globalThis.__queueModule?.jobs.push(job);
      return job;
    },
    process: async (name: string, handler: (job: Record<string, unknown>) => Promise<unknown>) => {
      const job = globalThis.__queueModule?.jobs.find(j => j.name === name && j.status === "pending");
      if (job) {
        job.status = "processing";
        const result = await handler(job);
        job.status = "completed";
        return result;
      }
      return null;
    },
    getStats: () => {
      const jobs = globalThis.__queueModule?.jobs || [];
      return {
        pending: jobs.filter(j => j.status === "pending").length,
        processing: jobs.filter(j => j.status === "processing").length,
        completed: jobs.filter(j => j.status === "completed").length,
      };
    },
  },
  websocket: {
    // Mock WebSocket connections
    connections: [] as string[],
    connect: (url: string) => {
      console.log(`[WEBSOCKET] Connecting to: ${url}`);
      const connId = `conn_${Date.now()}`;
      globalThis.__websocketModule?.connections.push(connId);
      return connId;
    },
    send: (connId: string, data: string) => {
      console.log(`[WEBSOCKET] Sending to ${connId}: ${data}`);
      return true;
    },
    disconnect: (connId: string) => {
      const idx = globalThis.__websocketModule?.connections.indexOf(connId);
      if (idx !== undefined && idx >= 0) {
        globalThis.__websocketModule?.connections.splice(idx, 1);
        return true;
      }
      return false;
    },
    broadcast: (data: string) => {
      console.log(`[WEBSOCKET] Broadcasting to ${globalThis.__websocketModule?.connections.length || 0} clients`);
      return globalThis.__websocketModule?.connections.length || 0;
    },
  },
};

// Syntax validation
export function checkSyntax(code: string): { valid: boolean; error?: string } {
  try {
    new Function(code);
    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown syntax error";
    // Clean up the error message (remove "at function (anonymous)" lines)
    const cleanedMessage = message
      .split("\n")
      .filter((line) => !line.includes("at Function") && !line.includes("at new Function"))
      .join("\n")
      .trim();
    return { valid: false, error: cleanedMessage };
  }
}

// Sanitize code - check for dangerous patterns
export function sanitizeCode(code: string): { safe: boolean; reason?: string } {
  const dangerousPatterns = [
    { pattern: /require\s*\(/, name: "require()" },
    { pattern: /import\s+.*from/, name: "import statements" },
    { pattern: /process\.cwd\s*\(/, name: "process.cwd()" },
    { pattern: /process\.env/, name: "process.env access" },
    { pattern: /child_process/, name: "child_process module" },
    { pattern: /fs\.(read|write)File/, name: "fs.readFile/writeFile" },
    { pattern: /fs\.(read|write)FileSync/, name: "fs.readFileSync/writeFileSync" },
    { pattern: /eval\s*\(/, name: "eval()" },
    { pattern: /Function\s*\(/, name: "Function constructor" },
    { pattern: /__dirname/, name: "__dirname" },
    { pattern: /__filename/, name: "__filename" },
    { pattern: /module\.exports/, name: "module.exports" },
    { pattern: /exports\./, name: "exports object" },
    { pattern: /global\./, name: "global object access" },
    { pattern: /process\.exit/, name: "process.exit()" },
    { pattern: /process\.kill/, name: "process.kill()" },
  ];

  for (const { pattern, name } of dangerousPatterns) {
    if (pattern.test(code)) {
      return { safe: false, reason: `${name} is not allowed in the playground` };
    }
  }

  // Limit code size
  if (code.length > 50000) {
    return { safe: false, reason: "Code too large (max 50KB)" };
  }

  return { safe: true };
}

// Execute code in a sandbox
export async function executeInSandbox(config: SandboxConfig): Promise<SandboxResult> {
  const startTime = Date.now();

  try {
    // Check syntax first
    const syntaxCheck = checkSyntax(config.code);
    if (!syntaxCheck.valid) {
      return {
        success: false,
        output: "",
        syntaxError: syntaxCheck.error,
        executionTime: Date.now() - startTime,
      };
    }

    // Sanitize code
    const sanitization = sanitizeCode(config.code);
    if (!sanitization.safe) {
      return {
        success: false,
        output: "",
        error: `Security check failed: ${sanitization.reason}`,
        executionTime: Date.now() - startTime,
      };
    }

    // Prepare output capture
    const outputs: string[] = [];
    const logs: Array<{ type: string; args: unknown[] }> = [];

    // Create sandbox context
    const context: Record<string, unknown> = {
      // Base globals (restricted)
      console: {
        log: (...args: unknown[]) => {
          const msg = args.map(arg => formatValue(arg)).join(" ");
          outputs.push(msg);
          logs.push({ type: "log", args });
        },
        error: (...args: unknown[]) => {
          const msg = args.map(arg => `Error: ${formatValue(arg)}`).join(" ");
          outputs.push(`[ERROR] ${msg}`);
          logs.push({ type: "error", args });
        },
        warn: (...args: unknown[]) => {
          const msg = args.map(arg => `Warning: ${formatValue(arg)}`).join(" ");
          outputs.push(`[WARN] ${msg}`);
          logs.push({ type: "warn", args });
        },
        info: (...args: unknown[]) => {
          const msg = args.map(arg => formatValue(arg)).join(" ");
          outputs.push(`[INFO] ${msg}`);
          logs.push({ type: "info", args });
        },
        debug: (...args: unknown[]) => {
          const msg = args.map(arg => formatValue(arg)).join(" ");
          outputs.push(`[DEBUG] ${msg}`);
          logs.push({ type: "debug", args });
        },
        table: (data: unknown) => {
          outputs.push(formatTable(data as Record<string, unknown>[]));
          logs.push({ type: "table", args: [data] });
        },
        time: (label: string) => {
          outputs.push(`[TIMER] Started: ${label}`);
        },
        timeEnd: (label: string) => {
          outputs.push(`[TIMER] Ended: ${label}`);
        },
        clear: () => {
          outputs.length = 0;
        },
      },
      Math,
      JSON,
      Date,
      Number,
      String,
      Boolean,
      Array,
      Object,
      RegExp,
      Map,
      Set,
      WeakMap,
      WeakSet,
      Promise,
      Error,
      TypeError,
      ReferenceError,
      SyntaxError,
      RangeError,
      encodeURI,
      decodeURI,
      encodeURIComponent,
      decodeURIComponent,
      isNaN,
      isFinite,
      parseInt,
      parseFloat,
      // Helper functions
      setTimeout: (fn: () => void, ms: number) => {
        if (ms > 2000) ms = 2000; // Cap timeout
        return setTimeout(fn, ms);
      },
      setImmediate: (fn: () => void) => setImmediate(fn),
      // Add module simulations
      auth: moduleSimulations.auth,
      users: moduleSimulations.users,
      email: moduleSimulations.email,
      cache: moduleSimulations.cache,
      queue: moduleSimulations.queue,
      websocket: moduleSimulations.websocket,
    };

    // Initialize module states
    globalThis.__usersModule = { users: [...moduleSimulations.users.users as Array<{ id: number }>] };
    globalThis.__cacheModule = { cache: new Map() };
    globalThis.__queueModule = { jobs: [] };
    globalThis.__websocketModule = { connections: [] };

    // Dynamic import of vm module for Next.js compatibility
    const vmModule = await import("node:vm");
    const vm = vmModule;

    // Create VM context with timeout
    const timeoutId = setTimeout(() => {
      throw new Error(`Execution timeout (${config.timeout}ms)`);
    }, config.timeout);

    try {
      const vmContext = vm.createContext(context);

      // Execute the code
      const result = vm.runInContext(config.code, vmContext, {
        timeout: config.timeout,
        displayErrors: true,
      });

      // Clear timeout
      clearTimeout(timeoutId);

      // Add result info
      if (result !== undefined) {
        outputs.push(`=> ${formatValue(result)}`);
      }

      // Memory usage (approximate)
      const memoryUsed = Math.floor(process.memoryUsage().heapUsed / 1024 / 1024 * 0.3) + 10;

      return {
        success: true,
        output: outputs.join("\n") || "Code executed successfully (no output)",
        executionTime: Date.now() - startTime,
        memoryUsed,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Unknown error",
      executionTime: Date.now() - startTime,
    };
  }
}

// Helper to format values for display
function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") {
    // Escape special characters but keep it readable
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
    return `"${escaped}"`;
  }
  if (typeof value === "function") {
    return `[Function: ${value.name || "anonymous"}]`;
  }
  if (typeof value === "symbol") {
    return value.toString();
  }
  if (typeof value === "object") {
    try {
      // Handle circular references
      const seen = new Set<object>();
      const format = (obj: unknown): string => {
        if (seen.has(obj as object)) return "[Circular]";
        seen.add(obj as object);
        if (Array.isArray(obj)) {
          return `[${obj.map(format).join(", ")}]`;
        }
        if (obj instanceof Map) {
          return `Map(${obj.size}) {${Array.from(obj.entries()).map(([k, v]) => `${format(k)} => ${format(v)}`).join(", ")}}`;
        }
        if (obj instanceof Set) {
          return `Set(${obj.size}) {${Array.from(obj).map(format).join(", ")}}`;
        }
        if (obj instanceof Error) {
          return `${obj.constructor.name}: ${obj.message}`;
        }
        const entries = Object.entries(obj as Record<string, unknown>);
        if (entries.length === 0) return "{}";
        if (entries.length <= 3) {
          return `{ ${entries.map(([k, v]) => `${k}: ${format(v)}`).join(", ")} }`;
        }
        return `{ ${entries.slice(0, 3).map(([k, v]) => `${k}: ${format(v)}`).join(", ")}, ... }`;
      };
      return format(value);
    } catch {
      return "[Object]";
    }
  }
  return String(value);
}

// Format table output
function formatTable(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "Table: empty";

  const columns = Object.keys(data[0]);
  const maxWidths: Record<string, number> = {};

  columns.forEach((col) => {
    maxWidths[col] = col.length;
    data.forEach((row) => {
      const val = String(row[col] ?? "");
      maxWidths[col] = Math.max(maxWidths[col], val.length);
    });
  });

  // Header
  const header = columns.map((col) => col.padEnd(maxWidths[col])).join(" | ");
  const separator = columns.map((col) => "-".repeat(maxWidths[col])).join("-+-");

  // Rows
  const rows = data.map((row) =>
    columns.map((col) => String(row[col] ?? "").padEnd(maxWidths[col])).join(" | ")
  );

  return [header, separator, ...rows].join("\n");
}

// Type declarations for global module states
declare global {
  var __usersModule: { users: User[] } | undefined;
  var __cacheModule: { cache: Map<string, { value: unknown; expiresAt: number }> } | undefined;
  var __queueModule: { jobs: QueueJob[] } | undefined;
  var __websocketModule: { connections: string[] } | undefined;
}
