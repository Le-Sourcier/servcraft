# Playground Roadmap

## Current Implementation (v1.0) ✅

### Features
- ✅ Real Docker container execution (isolated environments)
- ✅ JavaScript/TypeScript project templates
- ✅ Monaco Editor integration
- ✅ File synchronization (bidirectional)
- ✅ Real npm package installation
- ✅ Session management (30min + 10min extension)
- ✅ Multi-layer cleanup system (timers + worker + cron)
- ✅ **Reverse proxy preview URLs** (Path-based)

### Preview URL Structure (Current)
```
https://servcraft.io/api/playground/preview/{sessionId}
```

**Example:**
```
https://servcraft.io/api/playground/preview/session-1767080834814-xprao825hlk
```

### Architecture
- Next.js API route acts as reverse proxy
- Container port 3000 → Random host port (4000-5000)
- Single HTTPS endpoint, no port exposure
- Works with standard SSL certificates

---

## Future Enhancements

### Option 2: Dynamic Subdomain Preview URLs (v2.0) 🚀

#### Preview URL Structure (Future)
```
https://{sessionId}.preview.servcraft.io
```

**Example:**
```
https://1767080834-xprao825hlk.preview.servcraft.io
```

#### Advantages
- ✅ Cleaner, more professional URLs
- ✅ Better cookie/session isolation between previews
- ✅ Easier CORS handling
- ✅ More intuitive for users

#### Implementation Requirements

##### 1. DNS Configuration (One-time setup)

Add a **wildcard DNS record** to your domain:

```
Type: A
Name: *.preview.servcraft.io
Value: YOUR_SERVER_IP
TTL: 300
```

This single record makes ALL subdomains (e.g., `abc.preview.servcraft.io`, `xyz.preview.servcraft.io`) point to your server.

**Cost:** FREE (included with any domain registrar)

##### 2. SSL Certificate (Wildcard)

Obtain a **wildcard SSL certificate** for `*.preview.servcraft.io`:

**Option A - Let's Encrypt (FREE, Recommended):**
```bash
# Using DNS challenge
certbot certonly --dns-cloudflare \
  -d "*.preview.servcraft.io" \
  -d "preview.servcraft.io"

# Or using Caddy (auto-renewal)
caddy reverse-proxy --from "*.preview.servcraft.io" --to localhost:3000
```

**Option B - Cloudflare SSL (FREE):**
- Enable Cloudflare for your domain
- Wildcard certificates included automatically
- Cloudflare proxies all traffic

**Cost:** FREE with Let's Encrypt or Cloudflare

##### 3. Reverse Proxy Configuration

**Option A - Nginx:**
```nginx
server {
    listen 443 ssl http2;
    server_name ~^(?<session_id>.+)\.preview\.servcraft\.io$;

    ssl_certificate /etc/letsencrypt/live/preview.servcraft.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/preview.servcraft.io/privkey.pem;

    location / {
        # Pass session_id to Next.js
        proxy_pass http://localhost:3000/api/playground/preview-subdomain/$session_id;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Option B - Traefik (Modern, Auto-SSL):**
```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.dnschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@servcraft.io"
    labels:
      - "traefik.http.routers.preview.rule=HostRegexp(`{session:[a-z0-9-]+}.preview.servcraft.io`)"
      - "traefik.http.routers.preview.tls.certresolver=letsencrypt"
      - "traefik.http.routers.preview.tls.domains[0].main=*.preview.servcraft.io"
```

**Option C - Caddy (Easiest, Auto-SSL):**
```
*.preview.servcraft.io {
    reverse_proxy localhost:3000
}
```

##### 4. Code Changes Required

**New API route:** `/api/playground/preview-subdomain/[sessionId]/route.ts`
```typescript
// Extract sessionId from subdomain instead of path
// Rest is identical to current implementation
```

**Update preview URL generation:**
```typescript
const previewUrl = `https://${sessionId.slice(8, 20)}.preview.servcraft.io`;
```

#### Estimated Implementation Time
- DNS setup: 5 minutes
- SSL certificate: 10 minutes (automated with Let's Encrypt)
- Nginx/Caddy config: 15 minutes
- Code updates: 20 minutes
- Testing: 10 minutes

**Total: ~1 hour**

#### Migration Path
1. Implement Option 2 alongside Option 1
2. Add feature flag to choose between path-based and subdomain-based
3. Test with beta users
4. Gradually migrate all users
5. Deprecate Option 1

---

## Other Future Enhancements

### Performance
- [ ] Pre-built Docker images with dependencies cached
- [ ] Container pooling (reuse containers instead of creating new ones)
- [ ] Incremental file sync (only sync changed files)

### Features
- [ ] Real-time collaboration (multiple users in same session)
- [ ] File upload support (drag & drop)
- [ ] Git integration (commit/push from playground)
- [ ] Database preview (embedded PostgreSQL/SQLite)
- [ ] VS Code extension integration

### Monitoring
- [ ] Metrics dashboard (active sessions, resource usage)
- [ ] Alerts for high container count
- [ ] Usage analytics per user/session

---

## Cost Analysis

### Current (v1.0)
- Server: Standard VPS ($5-20/month)
- SSL: Free (Let's Encrypt)
- Docker: Free
- **Total: $5-20/month** (scales with server size)

### With Option 2 (v2.0)
- Server: Standard VPS ($5-20/month)
- DNS Wildcard: Free (included)
- SSL Wildcard: Free (Let's Encrypt)
- Reverse Proxy: Free (Nginx/Caddy)
- **Total: $5-20/month** (no additional cost!)

### At Scale (1M sessions/month)
- Need multiple servers with load balancer
- Estimated: $200-500/month for infrastructure
- Still using free DNS wildcard + free SSL
