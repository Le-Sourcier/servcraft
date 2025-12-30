# Docker Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Host (Server)                     │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │         ServCraft Container (Next.js App)             │ │
│  │                                                       │ │
│  │  - Port 3000 (internal) → 3200 (host)               │ │
│  │  - Mounts /var/run/docker.sock                       │ │
│  │  - Can create playground containers                  │ │
│  └───────────────┬───────────────────────────────────────┘ │
│                  │                                          │
│                  ↓                                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │          Playground Containers (Created by App)       │ │
│  │                                                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │ │
│  │  │ Session1 │  │ Session2 │  │ Session3 │   ...    │ │
│  │  │ :4001    │  │ :4002    │  │ :4003    │          │ │
│  │  └──────────┘  └──────────┘  └──────────┘          │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Docker-in-Docker (DinD) Setup

The Next.js container needs to create playground containers. This is achieved by:

- **Mounting Docker socket**: `/var/run/docker.sock` from host
- **Installing Docker CLI**: In the container image
- **Running as root**: Required for Docker socket access

### 2. Port Configuration

- **Main App**: Port `3200` (host) → `3000` (container)
- **Playground Range**: Ports `4000-5000` exposed for playground containers
- Each playground session gets a random port in this range

### 3. Security Considerations

**Running as root is necessary but controlled:**
- Only the Next.js container runs as root
- Playground containers have resource limits (512MB RAM, 0.5 CPU)
- Automatic cleanup prevents resource exhaustion
- Network isolation between playground containers

## Deployment Process

### GitHub Actions Workflow

The deployment happens automatically on push to `docs` branch:

1. **Sync workspace** - rsync code to server
2. **Create .env** - Inject secrets from GitHub
3. **Docker Compose** - Build and deploy
4. **Setup cron** - Configure playground cleanup

### Manual Deployment

```bash
# On the server
cd /www/wwwroot/servcraft.nexuscorporat.com

# Pull latest changes
git pull origin docs

# Create .env file
cat <<EOF > .env
NEXT_PUBLIC_API_BASE_URL=https://api.servcraft.io
ADMIN_JWT_SECRET=your_secret_here
NODE_ENV=production
PORT=3000
EOF

# Deploy with Docker Compose
docker compose down
docker compose up -d --build

# Verify
docker ps
docker logs servcraft
```

## Environment Variables

### Required Secrets (GitHub)

Configure these in GitHub repository settings → Secrets:

- `SERVER_SSH_KEY` - SSH private key for server access
- `SERVER_HOST` - Server IP or hostname
- `SERVER_USER` - SSH username (usually root)
- `NEXT_PUBLIC_API_BASE_URL` - API base URL
- `ADMIN_JWT_SECRET` - JWT secret for admin operations

### .env File (on server)

```env
NEXT_PUBLIC_API_BASE_URL=https://api.servcraft.io
ADMIN_JWT_SECRET=your_jwt_secret_here
NODE_ENV=production
PORT=3000
```

## Playground Cleanup

### Automatic Cleanup (Cron)

A cron job runs every 10 minutes to clean up expired containers:

```bash
*/10 * * * * /www/wwwroot/servcraft.nexuscorporat.com/scripts/cleanup-playground-containers.sh >> /var/log/playground-cleanup.log 2>&1
```

### Manual Cleanup

```bash
# View cleanup logs
tail -f /var/log/playground-cleanup.log

# Run cleanup manually
./scripts/cleanup-playground-containers.sh

# Force remove all playground containers
docker rm -f $(docker ps -q --filter "name=servcraft-playground-")

# Clean up orphaned volumes
docker volume rm $(docker volume ls -q --filter "name=servcraft-vol-")
```

## Monitoring

### Health Checks

```bash
# Check main container
docker ps | grep servcraft
docker logs --tail 100 servcraft

# Check playground containers
docker ps --filter "name=servcraft-playground-"

# Check resource usage
docker stats --filter "name=servcraft"

# Check disk usage
df -h
docker system df
```

### Common Issues

**Issue: Cannot connect to Docker daemon**
```bash
# Check Docker socket permissions
ls -la /var/run/docker.sock
# Should be: srw-rw---- root docker

# Restart Docker service
sudo systemctl restart docker
```

**Issue: Playground containers not cleaning up**
```bash
# Check cron is running
crontab -l
systemctl status cron

# Check cleanup script permissions
ls -la scripts/cleanup-playground-containers.sh
chmod +x scripts/cleanup-playground-containers.sh
```

**Issue: Port conflicts**
```bash
# Check port usage
netstat -tulpn | grep -E "3200|4000"

# Kill processes using ports
lsof -ti:3200 | xargs kill -9
```

## Scaling Considerations

### Current Limits

- **Container RAM**: 512MB per playground session
- **Container CPU**: 0.5 cores per playground session
- **Port range**: 1000 ports (4000-5000)
- **Session timeout**: 30 minutes + 10 min extension

### Server Requirements

**Minimum (Development):**
- 2 vCPU, 4GB RAM
- Max ~8 concurrent sessions

**Recommended (Production):**
- 4 vCPU, 8GB RAM
- Max ~16 concurrent sessions

**Large Scale:**
- 8 vCPU, 16GB RAM
- Max ~32 concurrent sessions

### Horizontal Scaling

For >32 concurrent sessions:

1. Deploy multiple instances with load balancer
2. Use shared Redis for session state
3. Consider container pooling instead of on-demand creation

## Backup & Recovery

### Backup Important Data

```bash
# Backup .env
cp .env .env.backup

# Backup logs
tar -czf logs-backup.tar.gz /var/log/playground-cleanup.log

# Export Docker volumes (if needed)
docker run --rm -v servcraft-vol-example:/data -v $(pwd):/backup alpine tar czf /backup/volume-backup.tar.gz -C /data .
```

### Recovery

```bash
# Restore from backup
docker compose down
docker compose up -d --build

# Check health
docker ps
docker logs servcraft
```

## Nginx/Caddy Integration

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name servcraft.nexuscorporat.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/servcraft.nexuscorporat.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/servcraft.nexuscorporat.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Longer timeout for playground operations
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### Caddy Configuration (Simpler)

```
servcraft.nexuscorporat.com {
    reverse_proxy localhost:3200
}
```

## Troubleshooting

### Debug Mode

Enable verbose logging:

```bash
# Edit docker-compose.yml
environment:
  - NODE_ENV=production
  - DEBUG=*

# Restart
docker compose restart
```

### Inspect Container

```bash
# Enter container shell
docker exec -it servcraft sh

# Check Docker access from inside
docker ps

# Check environment
env | grep -i node
```

## Security Best Practices

1. ✅ Run only Docker CLI (not Docker daemon) in container
2. ✅ Use resource limits on playground containers
3. ✅ Implement automatic cleanup
4. ✅ Use non-privileged mode (privileged: false)
5. ✅ Keep secrets in .env, not in code
6. ✅ Regular security updates via automated rebuilds

## Cost Optimization

1. **Use Alpine images** - Smaller image size
2. **Multi-stage builds** - Only production dependencies
3. **Automatic cleanup** - No orphaned resources
4. **Image pruning** - Remove old images regularly
5. **Resource limits** - Prevent runaway containers
