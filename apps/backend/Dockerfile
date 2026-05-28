# =============================================================================
# Rollinhead Dashboard Backend — Multi-stage Production Dockerfile
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
COPY apps/backend/package.json ./apps/backend/

# Fetch and install dependencies (including packages/types dependencies)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Step 3: Application Builder
FROM dependencies AS builder
COPY . .
# Generate Prisma Client
WORKDIR /usr/src/app/apps/backend
RUN pnpm prisma generate
# Build backend and shared packages
WORKDIR /usr/src/app
RUN pnpm build --filter=backend...

# Step 4: Prune Dev Dependencies for Production Runner
FROM builder AS prune
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# Step 5: Production Runner
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /usr/src/app

# Copy pruned workspace dependencies
COPY --from=prune /usr/src/app/node_modules ./node_modules
COPY --from=prune /usr/src/app/packages/types/node_modules ./packages/types/node_modules
COPY --from=prune /usr/src/app/apps/backend/node_modules ./apps/backend/node_modules

# Copy build artifacts and config
COPY --from=builder /usr/src/app/packages/types/src ./packages/types/src
COPY --from=builder /usr/src/app/packages/types/package.json ./packages/types/
COPY --from=builder /usr/src/app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /usr/src/app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /usr/src/app/apps/backend/package.json ./apps/backend/

# Expose NestJS port
EXPOSE 4000

# Set running directory
WORKDIR /usr/src/app/apps/backend

# Launch NestJS Server
CMD ["node", "dist/main.js"]
