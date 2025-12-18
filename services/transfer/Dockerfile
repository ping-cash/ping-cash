# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
COPY services/transfer/package.json ./services/transfer/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/types ./packages/types
COPY packages/config ./packages/config
COPY packages/utils ./packages/utils
COPY services/transfer ./services/transfer

# Build packages
RUN pnpm --filter @cash/types build
RUN pnpm --filter @cash/config build
RUN pnpm --filter @cash/utils build

# Generate Prisma client and build service
RUN pnpm --filter @cash/transfer-service db:generate
RUN pnpm --filter @cash/transfer-service build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 cash
USER cash

# Copy built application
COPY --from=builder --chown=cash:nodejs /app/services/transfer/dist ./dist
COPY --from=builder --chown=cash:nodejs /app/services/transfer/prisma ./prisma
COPY --from=builder --chown=cash:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=cash:nodejs /app/services/transfer/node_modules/.prisma ./node_modules/.prisma

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

CMD ["node", "dist/index.js"]
