# Playground Architecture

## Overview

The ServCraft playground provides a **real, isolated execution environment** using Docker containers. Each user session gets its own container with automatic cleanup.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Next.js)                     │
│  - Monaco Editor (VS Code)                                   │
│  - File Explorer                                              │
│  - Terminal Simulation                                        │
│  - Package/Module Management UI                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ API Calls
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                      │
│                                                               │
│  /api/playground/container                                   │
│    - POST: Create container                                  │
│    - DELETE: Destroy container                               │
│    - GET: Get container status                               │
│                                                               │
│  /api/playground/sync                                        │
│    - POST: Sync files to container                           │
│                                                               │
│  /api/playground/install                                     │
│    - POST: Install npm packages                              │
│                                                               │
│  /api/playground/execute                                     │
│    - POST: Execute code in container                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Docker API
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Docker Containers                         │
│                                                               │
│  ┌──────────────────────────────────────────┐               │
│  │  Container: servcraft-playground-{uuid}  │               │
│  │  - Image: node:20-alpine                 │               │
│  │  - Memory: 512MB limit                   │               │
│  │  - CPU: 0.5 cores                        │               │
│  │  - Network: Disabled (security)          │               │
│  │  - Volume: /tmp/playground-{uuid}        │               │
│  │  - Auto-destroy: 30 minutes timeout      │               │
│  └──────────────────────────────────────────┘               │
│                                                               │
│  Each session = isolated container                           │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. **Real Package Installation**
- Packages are actually installed via `npm install` in the container
- No simulation - real Node.js environment
- Full access to npm registry

### 2. **Isolated Execution**
- Each user gets their own Docker container
- No interference between sessions
- Security through isolation

### 3. **Resource Limits**
- Memory: 512MB per container
- CPU: 0.5 cores max
- Network: Disabled (no external calls)
- Prevents abuse and resource exhaustion

### 4. **Auto Cleanup**
- Containers auto-destroy after 30 minutes of inactivity
- Automatic on server shutdown
- Prevents memory leaks

### 5. **File Synchronization**
- Files from frontend sync to container workspace
- Changes persist within session
- Real filesystem operations

## API Endpoints

### Create Container
```bash
POST /api/playground/container
{
  "sessionId": "unique-session-id"
}
```

### Install Packages
```bash
POST /api/playground/install
{
  "sessionId": "session-id",
  "packages": ["fastify", "@fastify/cors"]
}
```

### Sync Files
```bash
POST /api/playground/sync
{
  "sessionId": "session-id",
  "files": [/* FileNode[] */]
}
```

### Execute Code
```bash
POST /api/playground/execute
{
  "sessionId": "session-id",
  "code": "console.log('Hello');",
  "filename": "index.js"
}
```

### Cleanup Container
```bash
DELETE /api/playground/container?sessionId=session-id
```

## Security Considerations

1. **Network Isolation**: Containers have no network access
2. **Resource Limits**: CPU and memory capped
3. **Auto Cleanup**: Prevents abandoned containers
4. **Rate Limiting**: Prevents abuse (already in execute endpoint)
5. **Sandboxing**: Docker provides OS-level isolation

## Requirements

- Docker installed and running
- Docker socket accessible (`/var/run/docker.sock`)
- Sufficient disk space for containers
- Node.js 20+ image available

## Development

To test locally:
```bash
# Ensure Docker is running
docker info

# Start the dev server
npm run dev

# Playground will automatically create containers when needed
```

## Production Deployment

For production, consider:
- Using Kubernetes instead of raw Docker
- Redis for session storage (instead of in-memory Map)
- Persistent volume cleanup cronjob
- Container registry for custom base images
- Monitoring and logging
- Load balancing for multiple servers
