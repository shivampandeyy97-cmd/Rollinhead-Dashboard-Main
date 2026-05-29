#!/bin/bash
# =============================================================================
# Rollinhead Dashboard — 100% Free Production Deployment Coordinator
# =============================================================================

# Set error handling
set -e

# Define color schemes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=============================================================${NC}"
echo -e "${GREEN}    🚀 ROLLINHEAD FULL-STACK DASHBOARD DEPLOYMENT COORDINATOR ${NC}"
echo -e "${BLUE}=============================================================${NC}"

# Check for correct paths
export PATH="$HOME/.local/node/bin:$PATH"

# 1. Database URL input
echo -e "\n${YELLOW}[Step 1] Connecting to your Free Neon PostgreSQL Database${NC}"
echo -e "Please create a free database at ${BLUE}https://neon.tech${NC} if you haven't already."
echo -e "Enter your Neon Connection String (DATABASE_URL):"
read -r NEON_DB_URL

if [ -z "$NEON_DB_URL" ]; then
    echo -e "${RED}❌ Error: Connection URL cannot be empty.${NC}"
    exit 1
fi

# 2. Update backend env file
echo -e "\n${YELLOW}[Step 2] Updating production configs...${NC}"
echo "DATABASE_URL=\"$NEON_DB_URL\"" > apps/backend/.env.production
echo "JWT_SECRET=\"$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")\"" >> apps/backend/.env.production
echo "PORT=4000" >> apps/backend/.env.production
echo "NODE_ENV=production" >> apps/backend/.env.production

# 3. Synchronize Schema and Seed database
echo -e "\n${YELLOW}[Step 3] Syncing PostgreSQL Schema & Seeding 900+ Records...${NC}"
export DATABASE_URL="$NEON_DB_URL"
cd apps/backend
npx prisma generate
npx prisma db push --force-reset
echo -e "${GREEN}✓ Live Neon Schema created successfully!${NC}"

echo -e "\n${YELLOW}Populating database with seed analytics data...${NC}"
npx ts-node prisma/seed.ts
echo -e "${GREEN}✓ Production Database successfully seeded!${NC}"
cd ../..

# 4. GitHub synchronization
echo -e "\n${YELLOW}[Step 4] Pushing production configuration updates to GitHub...${NC}"
git add apps/backend/.env.production || true
git commit -m "chore: configure database and prisma schemas for free production cloud" || true
git push origin main
echo -e "${GREEN}✓ GitHub repository updated!${NC}"

# 5. Provide easy deployment guides
echo -e "\n${BLUE}=============================================================${NC}"
echo -e "${GREEN}    🎉 DATABASE SYNCED & READY FOR LIVE HOStING! ${NC}"
echo -e "${BLUE}=============================================================${NC}"
echo -e "\nTo take your frontend and backend live 100% free, do these 2 steps:"
echo -e "\n${YELLOW}1. Deploy Backend to Render (Free Web Service)${NC}"
echo -e "   - Sign in to ${BLUE}https://render.com${NC} using GitHub."
echo -e "   - Click ${GREEN}New +${NC} > ${GREEN}Web Service${NC} > Connect ${BLUE}Rollinhead-Dashboard-Main${NC}."
echo -e "   - Set ${YELLOW}Root Directory${NC} to: ${BLUE}apps/backend${NC}"
echo -e "   - Set ${YELLOW}Runtime${NC} to: ${BLUE}Node${NC}"
echo -e "   - Set ${YELLOW}Build Command${NC} to: ${BLUE}pnpm install --frozen-lockfile && npx prisma generate && pnpm build${NC}"
echo -e "   - Set ${YELLOW}Start Command${NC} to: ${BLUE}pnpm start:prod${NC}"
echo -e "   - Add these ${YELLOW}Environment Variables${NC} in the Render dashboard:"
echo -e "     * ${BLUE}DATABASE_URL${NC} = ${NEON_DB_URL}"
echo -e "     * ${BLUE}JWT_SECRET${NC} = (Any secure long password)"
echo -e "     * ${BLUE}FRONTEND_URL${NC} = (Your Vercel URL, set after Vercel deploy)"

echo -e "\n${YELLOW}2. Deploy Frontend to Vercel (Free Frontend Server)${NC}"
echo -e "   - Sign in to ${BLUE}https://vercel.com${NC} using GitHub."
echo -e "   - Click ${GREEN}Add New${NC} > ${GREEN}Project${NC} > Import ${BLUE}Rollinhead-Dashboard-Main${NC}."
echo -e "   - Set ${YELLOW}Framework Preset${NC} to: ${BLUE}Next.js${NC}"
echo -e "   - Set ${YELLOW}Root Directory${NC} to: ${BLUE}apps/frontend${NC}"
echo -e "   - Add this ${YELLOW}Environment Variable${NC} in the Vercel dashboard:"
echo -e "     * ${BLUE}NEXT_PUBLIC_API_URL${NC} = (Your Render Web Service URL with /api at the end, e.g., ${BLUE}https://your-app.onrender.com/api${NC})"

echo -e "\n${GREEN}🚀 You are good to go! Execute this script on your machine to seed the database and sync the repo: ${BLUE}./deploy-free-stack.sh${NC}\n"
