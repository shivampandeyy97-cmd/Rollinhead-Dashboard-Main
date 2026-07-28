#!/bin/bash
# =============================================================================
# Rollinhead Dashboard — Local Staging Runner Script
# Runs backend on http://localhost:4001 and frontend on http://localhost:3001
# =============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=============================================================${NC}"
echo -e "${GREEN}    🧪 ROLLINHEAD STAGING ENVIRONMENT LOCAL RUNNER ${NC}"
echo -e "${BLUE}=============================================================${NC}"

export PATH="/Users/shivampandey/homebrew/bin:$HOME/.local/node/bin:$PATH"

# Ensure PostgreSQL is running
if ! pg_isready -q; then
    echo -e "${YELLOW}Starting local PostgreSQL service...${NC}"
    brew services start postgresql@16 || true
    sleep 2
fi

# Ensure staging database exists
psql -d postgres -c "CREATE DATABASE rollinhead_staging OWNER rollinhead;" 2>/dev/null || true

# Synchronize Prisma schema with staging database
echo -e "${YELLOW}Syncing Staging Schema & Seeding Data...${NC}"
export DATABASE_URL="postgresql://rollinhead:rollinhead_dev_2026@localhost:5432/rollinhead_staging?schema=public"

cd apps/backend
npx prisma db push --skip-generate
npx ts-node prisma/seed.ts
cd ../..

echo -e "${GREEN}✓ Staging database synced & seeded!${NC}"
echo -e "${YELLOW}Launching Staging Stack (Frontend: :3001 | Backend: :4001)...${NC}\n"

# Run staging stack concurrently
PORT=4001 NEXT_PUBLIC_API_URL="http://localhost:4001/api" pnpm dev --port 3001
