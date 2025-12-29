// Playground Project Structure Simulation
// This file defines the initial project state

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  children?: FileNode[];
  expanded?: boolean;
}

export interface PackageDependency {
  name: string;
  version: string;
  installed: boolean;
}

export interface InstalledModule {
  name: string;
  version: string;
  installed: boolean;
}

// Initial project structure
export const initialProjectFiles: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    expanded: true,
    children: [
      {
        name: 'app.ts',
        type: 'file',
        language: 'typescript',
        content: `import Fastify from 'fastify';
import { cors } from '@fastify/cors';
import { servcraft } from 'servcraft';

// Initialize Fastify
const fastify = Fastify({
  logger: true,
});

// Register CORS
await fastify.register(cors, {
  origin: true,
});

// Health check endpoint
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API routes
fastify.get('/api/users', async () => {
  return [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ];
});

fastify.post('/api/users', async (request) => {
  const user = request.body as { name: string; email: string };
  return { id: 3, ...user, createdAt: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
`,
      },
      {
        name: 'routes',
        type: 'folder',
        children: [
          {
            name: 'index.ts',
            type: 'file',
            language: 'typescript',
            content: `import { FastifyPluginAsync } from 'fastify';

const root: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get('/', async (request, reply) => {
    return { message: 'Welcome to ServCraft API', version: '0.4.9' };
  });
};

export default root;
`,
          },
          {
            name: 'users.ts',
            type: 'file',
            language: 'typescript',
            content: `import { FastifyPluginAsync } from 'fastify';

interface UserParams {
  id: string;
}

interface CreateUserBody {
  name: string;
  email: string;
}

const users: FastifyPluginAsync = async (fastify, opts) => {
  // Get all users
  fastify.get<User>('/', async (request, reply) => {
    return [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ];
  });

  // Get user by ID
  fastify.get<UserParams>('/:id', async (request, reply) => {
    const { id } = request.params;
    return { id: parseInt(id), name: 'User ' + id, email: 'user' + id + '@example.com' };
  });

  // Create user
  fastify.post<{ Body: CreateUserBody }>('/', async (request, reply) => {
    const user = request.body;
    return { id: 3, ...user, createdAt: new Date().toISOString() };
  });
};

export default users;
`,
          },
        ],
      },
      {
        name: 'modules',
        type: 'folder',
        children: [],
      },
    ],
  },
  {
    name: 'prisma',
    type: 'folder',
    children: [
      {
        name: 'schema.prisma',
        type: 'file',
        language: 'prisma',
        content: `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}
`,
      },
    ],
  },
  {
    name: 'modules',
    type: 'folder',
    expanded: false,
    children: [],
  },
  {
    name: '.env',
    type: 'file',
    language: 'bash',
    content: `# Database
DATABASE_URL="postgresql://user:password@localhost:5432/servcraft"

# App
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="7d"
`,
  },
  {
    name: 'package.json',
    type: 'file',
    language: 'json',
    content: `{
  "name": "my-servcraft-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "servcraft dev",
    "build": "servcraft build",
    "start": "servcraft start",
    "db:push": "servcraft db push",
    "db:migrate": "servcraft db migrate",
    "db:generate": "servcraft db generate",
    "add": "servcraft add"
  },
  "dependencies": {
    "servcraft": "^0.4.9",
    "fastify": "^4.28.0",
    "@fastify/cors": "^9.0.1",
    "@prisma/client": "^5.15.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "prisma": "^5.15.0",
    "servcraft-cli": "^0.4.9"
  }
}
`,
  },
  {
    name: 'servcraft.config.ts',
    type: 'file',
    language: 'typescript',
    content: `import { defineConfig } from 'servcraft';

export default defineConfig({
  name: 'my-servcraft-api',
  version: '1.0.0',
  port: 3000,
  database: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/servcraft',
  },
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '7d',
    },
  },
  modules: [],
});
`,
  },
  {
    name: 'tsconfig.json',
    type: 'file',
    language: 'json',
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
`,
  },
];

// Available packages to install
export const availablePackages: PackageDependency[] = [
  { name: 'fastify', version: '^4.28.0', installed: true },
  { name: '@fastify/cors', version: '^9.0.1', installed: true },
  { name: '@prisma/client', version: '^5.15.0', installed: true },
  { name: 'zod', version: '^3.23.8', installed: false },
  { name: '@fastify/jwt', version: '^8.0.0', installed: false },
  { name: '@fastify/bcrypt', version: '^5.1.0', installed: false },
  { name: '@fastify/rate-limit', version: '^9.1.0', installed: false },
  { name: '@fastify/websocket', version: '^10.0.0', installed: false },
  { name: 'ioredis', version: '^5.4.1', installed: false },
  { name: 'nodemailer', version: '^6.9.13', installed: false },
];

// Available ServCraft modules
export const availableModules: InstalledModule[] = [
  { name: 'auth', version: '0.4.9', installed: false },
  { name: 'users', version: '0.4.9', installed: false },
  { name: 'email', version: '0.4.9', installed: false },
  { name: 'cache', version: '0.4.9', installed: false },
  { name: 'queue', version: '0.4.9', installed: false },
  { name: 'websocket', version: '0.4.9', installed: false },
  { name: 'oauth', version: '0.4.9', installed: false },
  { name: 'mfa', version: '0.4.9', installed: false },
  { name: 'search', version: '0.4.9', installed: false },
  { name: 'logger', version: '0.4.9', installed: false },
];

// Terminal command history
export interface TerminalCommand {
  id: string;
  command: string;
  output: string[];
  timestamp: Date;
  type: 'command' | 'output' | 'error' | 'system';
}

// Icons for file types
export const fileIcons: Record<string, string> = {
  ts: "code",
  tsx: "code",
  js: "code",
  json: "json",
  prisma: "database",
  env: "settings",
  md: "file-text",
  css: "palette",
  html: "globe",
  yml: "settings",
  yaml: "settings",
  folder: "folder",
  folderOpen: "folder-open",
  default: "file-code",
};

// Get icon name for a file
export function getFileIconName(filename: string, isFolder = false, isExpanded = false): string {
  if (isFolder) return isExpanded ? "folderOpen" : "folder";
  const ext = filename.split('.').pop() || '';
  return fileIcons[ext] || fileIcons.default;
}

// Flatten file tree for searching
export function flattenFiles(files: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  for (const file of files) {
    result.push(file);
    if (file.children) {
      result.push(...flattenFiles(file.children));
    }
  }
  return result;
}

// Find file by path
export function findFile(files: FileNode[], path: string): FileNode | null {
  const parts = path.split('/').filter(Boolean);
  let current: FileNode[] = files;

  for (const part of parts) {
    const found = current.find(f => f.name === part);
    if (!found) return null;
    if (found.children) {
      current = found.children;
    }
  }

  return current.find(f => f.name === parts[parts.length - 1]) || null;
}
