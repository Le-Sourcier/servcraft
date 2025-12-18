# ==========================================
# Servcraft - Production Dockerfile
# Multi-stage build for optimized image size
# ==========================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY tsup.config.ts ./
COPY prisma ./prisma/

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY src ./src

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 servcraft

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files from previous stages
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Set ownership
RUN chown -R servcraft:nodejs /app

# Switch to non-root user
USER servcraft

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
