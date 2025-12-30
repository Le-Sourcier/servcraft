FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

# Install Docker CLI for playground functionality
RUN apk add --no-cache docker-cli

# Create nextjs user and group
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy built application
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Note: Running as root to access Docker socket
# In docker-compose.yml, we mount /var/run/docker.sock
# USER nextjs (commented out - need root for Docker access)

EXPOSE 3000
CMD ["node", "server.js"]
