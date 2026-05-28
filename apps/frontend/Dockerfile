# =============================================================================
# Rollinhead Dashboard Frontend — Multi-stage Production Dockerfile
# =============================================================================

# Step 1: Base & Setup
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /usr/src/app

# Step 2: Dependencies Skeleton Construction
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY apps/frontend/package.json ./apps/frontend/

# Fetch and install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Step 3: Application Builder
FROM dependencies AS builder
COPY . .

# Set dynamic environment variables at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build frontend and shared packages
RUN pnpm build --filter=frontend...

# Step 4: Production Runner
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /usr/src/app

# Create non-root user for security compliance
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copy static assets and public files needed for client-side rendering
COPY --from=builder /usr/src/app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /usr/src/app/apps/frontend/.next/static ./apps/frontend/.next/static

# Copy Next.js standalone folder (traces code and node_modules dynamically)
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/apps/frontend/.next/standalone ./

# Expose Next.js default port
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Launch Next.js Standalone Node Server
CMD ["node", "apps/frontend/server.js"]
