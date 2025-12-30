# Playground Production Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Nginx/Caddy (Port 443)                        │
│                 SSL Termination + Routing                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Next.js     │  │  Next.js     │  │  Next.js     │
│  (Port 3000) │  │  (Port 3001) │  │  (Port 3002) │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │  Reverse Proxy  │                 │
       ↓                 ↓                 ↓
┌─────────────────────────────────────────────────┐
│        Docker Containers (Playground)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Session1 │  │ Session2 │  │ Session3 │ ... │
│  │ :4001    │  │ :4002    │  │ :4003    │     │
│  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────┘
```

---

## Current Implementation (Option 1: Path-based URLs)

### Preview URL Format
```
https://servcraft.io/api/playground/preview/{sessionId}
https://servcraft.io/api/playground/preview/{sessionId}/api/users
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/servcraft

upstream nextjs {
    server localhost:3000;
}

server {
    listen 80;
    server_name servcraft.io www.servcraft.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name servcraft.io www.servcraft.io;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/servcraft.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/servcraft.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Next.js proxy
    location / {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Longer timeout for playground operations
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Special handling for preview routes (longer timeout)
    location /api/playground/preview/ {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Very long timeout for running services
        proxy_read_timeout 600s;
        proxy_connect_timeout 10s;
    }
}
```

### Caddy Configuration (Simpler Alternative)

```
servcraft.io {
    reverse_proxy localhost:3000

    # Automatic HTTPS with Let's Encrypt
    # No manual SSL configuration needed!
}
```

---

## Future Implementation (Option 2: Subdomain-based URLs)

### Preview URL Format
```
https://{sessionId}.preview.servcraft.io
```

### DNS Setup

Add one wildcard record to your DNS:

```
Type: A
Name: *.preview.servcraft.io
Value: YOUR_SERVER_IP
TTL: 300
```

**Testing DNS:**
```bash
dig abc123.preview.servcraft.io
dig xyz789.preview.servcraft.io
# Both should resolve to YOUR_SERVER_IP
```

### SSL Certificate (Wildcard)

```bash
# Using Certbot with DNS challenge
certbot certonly --manual \
  --preferred-challenges=dns \
  -d "*.preview.servcraft.io" \
  -d "preview.servcraft.io"

# Or using Cloudflare DNS plugin (easier)
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "*.preview.servcraft.io" \
  -d "preview.servcraft.io"
```

### Nginx Configuration (Option 2)

```nginx
# Separate server block for preview subdomains
server {
    listen 443 ssl http2;
    server_name ~^(?<session_id>[a-z0-9-]+)\.preview\.servcraft\.io$;

    ssl_certificate /etc/letsencrypt/live/preview.servcraft.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/preview.servcraft.io/privkey.pem;

    location / {
        # Pass to Next.js with session ID
        proxy_pass http://localhost:3000/api/playground/preview-subdomain/$session_id$request_uri;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Session-ID $session_id;
        proxy_read_timeout 600s;
    }
}
```

### Caddy Configuration (Option 2)

```
*.preview.servcraft.io {
    reverse_proxy localhost:3000

    # Caddy automatically handles wildcard SSL!
}
```

---

## Production Deployment Checklist

### Pre-deployment
- [ ] Install Docker on production server
- [ ] Configure firewall (allow ports 80, 443)
- [ ] Setup SSL certificate (Let's Encrypt recommended)
- [ ] Configure reverse proxy (Nginx or Caddy)
- [ ] Test Docker permissions for web user

### Cleanup System
- [ ] Make cleanup script executable: `chmod +x scripts/cleanup-playground-containers.sh`
- [ ] Test cleanup script: `./scripts/cleanup-playground-containers.sh`
- [ ] Setup cron job (every 10 minutes)
- [ ] Configure log rotation for `/var/log/playground-cleanup.log`

### Monitoring
- [ ] Setup alerts for high container count (`docker ps | grep servcraft-playground | wc -l`)
- [ ] Monitor disk usage of Docker volumes
- [ ] Track CPU/memory usage of playground containers
- [ ] Setup log aggregation (optional)

### Security
- [ ] Limit max concurrent sessions (rate limiting)
- [ ] Set resource limits on containers (already done: 512MB RAM, 0.5 CPU)
- [ ] Disable network access for containers (or whitelist npm registry only)
- [ ] Regular security updates for Docker images

### Example Crontab

```bash
# Edit crontab
crontab -e

# Add these lines:

# Cleanup expired playground containers (every 10 minutes)
*/10 * * * * /var/www/servcraft_docs/scripts/cleanup-playground-containers.sh >> /var/log/playground-cleanup.log 2>&1

# Rotate cleanup logs weekly
0 0 * * 0 mv /var/log/playground-cleanup.log /var/log/playground-cleanup.log.old && touch /var/log/playground-cleanup.log

# Alert if too many containers (every hour)
0 * * * * COUNT=$(docker ps --filter "name=servcraft-playground-" -q | wc -l); if [ $COUNT -gt 50 ]; then echo "WARNING: $COUNT playground containers active!" | mail -s "Playground Alert" admin@servcraft.io; fi
```

---

## Resource Limits & Scaling

### Per Container Limits (Current)
- RAM: 512MB
- CPU: 0.5 cores
- Network: Enabled (for npm install)
- Timeout: 30-40 minutes

### Server Capacity Estimation

**Small VPS (2 CPU, 4GB RAM):**
- Max concurrent containers: ~8
- Expected users/day: ~50-100

**Medium VPS (4 CPU, 8GB RAM):**
- Max concurrent containers: ~16
- Expected users/day: ~200-500

**Large VPS (8 CPU, 16GB RAM):**
- Max concurrent containers: ~32
- Expected users/day: ~1000+

### Scaling Strategy

1. **Vertical scaling** (increase server resources)
2. **Horizontal scaling** (multiple servers + load balancer)
3. **Container pooling** (reuse containers instead of destroying)
4. **Pre-built images** (reduce init time from 10min to 30sec)

---

## Troubleshooting

### Containers not cleaning up
```bash
# Check cleanup script
./scripts/cleanup-playground-containers.sh

# Check cron logs
tail -f /var/log/playground-cleanup.log

# Manually clean all playground containers
docker ps --filter "name=servcraft-playground-" -q | xargs docker rm -f
docker volume ls --filter "name=servcraft-vol-" -q | xargs docker volume rm
```

### Preview URL not working
```bash
# Check if container is running
docker ps | grep servcraft-playground

# Check container logs
docker logs servcraft-playground-{sessionId}

# Test direct port access
curl http://localhost:{exposedPort}

# Check Next.js proxy logs
tail -f .next/trace
```

### High resource usage
```bash
# Check container stats
docker stats --filter "name=servcraft-playground-"

# Kill all playground containers immediately
docker rm -f $(docker ps -q --filter "name=servcraft-playground-")
```

---

## Migration from Development to Production

1. **Update environment variables:**
   ```bash
   NODE_ENV=production
   ```

2. **Build Next.js for production:**
   ```bash
   npm run build
   npm start
   ```

3. **Setup reverse proxy** (Nginx/Caddy)

4. **Configure cron cleanup script**

5. **Test preview URLs** with real domain

6. **(Optional) Migrate to Option 2** (subdomain-based) later
