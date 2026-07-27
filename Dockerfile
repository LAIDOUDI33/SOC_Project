# ============================================================
# National SOC Platform - Production Dockerfile
# Multi-stage build for Djezzy Deployment
# ============================================================

# ------------------------------------------------------------
# Stage 1: Dependencies
# ------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# ------------------------------------------------------------
# Stage 2: Build
# ------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ------------------------------------------------------------
# Stage 3: Production Runner (Standalone Output)
# ------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install dependencies for Prisma and native modules
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    curl \
    tzdata \
    && cp /usr/share/zoneinfo/Africa/Algiers /etc/localtime \
    && echo "Africa/Algiers" > /etc/timezone

# Copy standalone output from build stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files for database operations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Generate Prisma client in production image
RUN npx prisma generate

# Create required directories with proper permissions
RUN mkdir -p /app/db /app/logs \
    && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health check for Kubernetes liveness/readiness probes
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
