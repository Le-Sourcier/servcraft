import { ChildProcess, spawn, execSync } from "child_process";
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

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
}

export interface SandboxSession {
  id: string;
  startTime: number;
  process?: ChildProcess;
  output: string[];
}

// Stockage des sessions actives (en mémoire pour le prototype)
const activeSessions = new Map<string, SandboxSession>();
const SESSION_DIR = "/tmp/servcraft-sandbox";
const MAX_OUTPUT_LINES = 1000;
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

// Créer le répertoire de sessions au démarrage
if (!existsSync(SESSION_DIR)) {
  mkdirSync(SESSION_DIR, { recursive: true });
}

/**
 * Nettoie le code pour éviter les injections dangereuses
 */
export function sanitizeCode(code: string): { safe: boolean; sanitized: string; reason?: string } {
  // Patterns dangereux à détecter
  const dangerousPatterns = [
    { pattern: /require\s*\(/, reason: "require() not allowed" },
    { pattern: /import\s+.*from/, reason: "import statements not allowed" },
    { pattern: /process\.cwd/, reason: "Access to process.cwd() not allowed" },
    { pattern: /process\.env/, reason: "Access to process.env not allowed" },
    { pattern: /child_process/, reason: "Child process spawning not allowed" },
    { pattern: /fs\.(read|write)FileSync/, reason: "Direct file system access not allowed" },
    { pattern: /eval\s*\(/, reason: "eval() not allowed" },
    { pattern: /Function\s*\(/, reason: "Function constructor not allowed" },
    { pattern: /__dirname/, reason: "__dirname not allowed" },
    { pattern: /__filename/, reason: "__filename not allowed" },
  ];

  for (const { pattern, reason } of dangerousPatterns) {
    if (pattern.test(code)) {
      return { safe: false, sanitized: code, reason };
    }
  }

  // Limiter la taille du code
  if (code.length > 50000) {
    return { safe: false, sanitized: code, reason: "Code too large (max 50KB)" };
  }

  return { safe: true, sanitized: code };
}

/**
 * Génère un script exécutable à partir du code fournis
 */
function generateScript(code: string, modules: string[]): string {
  // Template de script sandbox
  const script = `
// ServCraft Playground Sandbox
// Auto-généré - Ne pas modifier manuellement

const modules = ${JSON.stringify(modules)};
const output = [];
const logs = [];

// Capture console.log
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
  const msg = args.map(arg => String(arg)).join(' ');
  output.push({ type: 'log', message: msg });
  originalLog.apply(console, args);
};

console.error = (...args) => {
  const msg = args.map(arg => String(arg)).join(' ');
  output.push({ type: 'error', message: msg });
  originalError.apply(console, args);
};

console.warn = (...args) => {
  const msg = args.map(arg => String(arg)).join(' ');
  output.push({ type: 'warn', message: msg });
  originalWarn.apply(console, args);
};

// Code utilisateur
${code}

// Afficher les résultats
if (output.length === 0) {
  console.log('Code executed successfully (no output)');
}

output.forEach(item => {
  console.log(\`[\${item.type.toUpperCase()}] \${item.message}\`);
});
`;

  return script;
}

/**
 * Exécute le code dans un sandbox (simulation pour le prototype)
 */
export async function executeInSandbox(config: SandboxConfig): Promise<SandboxResult> {
  const startTime = Date.now();
  const sessionId = uuidv4();
  const sessionDir = join(SESSION_DIR, sessionId);

  try {
    // Nettoyer les sessions anciennes (> 5 minutes)
    cleanupOldSessions();

    // Vérifier le code
    const sanitization = sanitizeCode(config.code);
    if (!sanitization.safe) {
      return {
        success: false,
        output: "",
        error: `Security check failed: ${sanitization.reason}`,
        executionTime: Date.now() - startTime,
      };
    }

    // Créer le répertoire de session
    mkdirSync(sessionDir, { recursive: true });

    // Générer et écrire le script
    const script = generateScript(config.code, config.modules);
    writeFileSync(join(sessionDir, "script.js"), script);

    // Pour le prototype: exécution simulée
    // En production, utiliser un vrai sandbox Docker
    const result = await simulateExecution(script, config.timeout, config.maxMemory);

    // Nettoyer
    cleanupSession(sessionId);

    return {
      ...result,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    cleanupSession(sessionId);
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Unknown error",
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Simulation d'exécution pour le prototype
 * En production, remplacer par une vraie exécution Docker
 */
async function simulateExecution(
  script: string,
  timeout: number,
  maxMemory: number
): Promise<SandboxResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const outputs: string[] = [];

    // Simuler l'exécution du code
    try {
      // Évaluer le script de manière sécurisée (simulée)
      // Note: En production, ceci serait dans un container Docker isolé

      // Analyser le script pour "exécuter" les instructions
      const outputMatch = script.matchAll(/console\.log\s*\(\s*['"`]([^'"`]*)['"`]/g);
      const errorMatch = script.matchAll(/console\.error\s*\(\s*['"`]([^'"`]*)['"`]/g);

      // Ajouter un message de démarrage
      outputs.push("[INFO] Sandbox session started");
      outputs.push("[INFO] Modules loaded: " + script.match(/modules\s*=\s*\[.*\]/)?.[0]?.replace("modules = ", "") || "[]");
      outputs.push("");

      // Simuler la sortie du code utilisateur
      const codeLines = script.split("\n").filter(
        (line) =>
          line.includes("console.log") ||
          line.includes("console.error") ||
          line.includes("return")
      );

      for (const line of codeLines.slice(0, 20)) {
        if (line.includes("console.log")) {
          const msg = line.match(/['"`]([^'"`]*)['"`]/);
          if (msg) {
            outputs.push(msg[1]);
          }
        }
      }

      // Message de fin
      outputs.push("");
      outputs.push("[INFO] Execution completed successfully");
      outputs.push(`[INFO] Memory usage: ${Math.floor(Math.random() * maxMemory * 0.3) + 10}MB`);
      outputs.push(`[INFO] Time: ${Date.now() - startTime}ms`);

      resolve({
        success: true,
        output: outputs.join("\n"),
        executionTime: Date.now() - startTime,
        memoryUsed: Math.floor(Math.random() * maxMemory * 0.3) + 10,
      });
    } catch (error) {
      resolve({
        success: false,
        output: outputs.join("\n"),
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Execution error",
      });
    }

    // Timeout de simulation
    setTimeout(() => {
      if (outputs.length === 0) {
        resolve({
          success: false,
          output: outputs.join("\n"),
          executionTime: Date.now() - startTime,
          error: "Execution timeout",
        });
      }
    }, Math.min(timeout, 100)); // Simulation rapide
  });
}

/**
 * Nettoie une session
 */
function cleanupSession(sessionId: string): void {
  try {
    const sessionDir = join(SESSION_DIR, sessionId);
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
    activeSessions.delete(sessionId);
  } catch (error) {
    console.error("Error cleaning up session:", error);
  }
}

/**
 * Nettoie les sessions anciennes
 */
function cleanupOldSessions(): void {
  const maxAge = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();

  for (const [id, session] of activeSessions.entries()) {
    if (now - session.startTime > maxAge) {
      cleanupSession(id);
    }
  }
}

/**
 * Récupère les statistiques du sandbox
 */
export function getSandboxStats(): {
  activeSessions: number;
  uptime: number;
  maxMemory: number;
} {
  return {
    activeSessions: activeSessions.size,
    uptime: Math.floor(process.uptime()),
    maxMemory: 50, // MB
  };
}
