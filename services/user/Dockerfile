# user-service — tsup bundles ALL deps into dist/index.js (self-contained).
# Per ADR 0006 + CLAUDE.md: CI is the only build path.

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json tsconfig.json .npmrc* ./
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
COPY services/user/package.json ./services/user/
RUN pnpm install --frozen-lockfile

COPY packages/types ./packages/types
COPY packages/config ./packages/config
COPY packages/utils ./packages/utils
COPY services/user ./services/user

RUN pnpm --filter @ping/types build
RUN pnpm --filter @ping/config build
RUN pnpm --filter @ping/utils build
RUN pnpm --filter @ping/user-service db:generate
RUN pnpm --filter @ping/user-service build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 ping
USER ping

COPY --from=builder --chown=ping:nodejs /app/services/user/dist ./dist
COPY --from=builder --chown=ping:nodejs /app/services/user/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/healthz || exit 1

CMD ["node", "dist/index.js"]
