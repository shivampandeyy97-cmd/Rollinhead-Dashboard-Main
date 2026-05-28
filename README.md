# 📊 Rollinhead Adtech & Publisher Analytics Dashboard

A production-grade, multi-role full-stack analytics platform built using a robust pnpm workspace monorepo architecture. 

It provides **Adtech Publishers** with secure real-time net performance reports, adjusted net eCPM calculators, and automated script generator drawers, while providing **Internal Ops Administrators** with tools to onboard new publisher accounts, customize active revenue shares, ingest ad demand CSV records in the background, and track network margins.

---

## ⚡ Key Highlights
* **Next.js 15 (App Router)**: Premium dark design system (`#090a0c` canvas, `#111315` cards) featuring glassmorphism, harmony-matched HSL red accent details, and Outfit/Inter typography.
* **NestJS (API Backend)**: Solid, strict TypeScript backend separating auth controllers, DB syncing, CSV ingestion processing pipelines, and targeting announcements.
* **Prisma & PostgreSQL**: Relational sync of 10 primary schemas with an integrated automated database seeding engine populating **900+ active performance rows** over a rolling 30-day index.
* **Robust Security & RBAC**: Safe HTTP-only cookie JWT strategy ensuring zero client-side leakage of access tokens, filtered through customized NestJS route guards.
* **CSV background Ingestion**: Multi-part upload parser that ingests raw demand logs, automatically locates publisher configs effective for that day, applies rev-share splits, saves operating margin, and logs complete audit histories.

---

## 🏗️ Workspace Layout

```
rollinhead-dashboard/
├── apps/
│   ├── frontend/          # Next.js 15 + Zustand + TanStack Query + Recharts
│   │   ├── src/app/       # App Router page layouts and protective routes
│   │   └── Dockerfile     # Multi-stage standalone runner container
│   └── backend/           # NestJS REST APIs + Prisma Client
│       ├── src/           # Business logic split into role-based modules
│       ├── prisma/        # Relational PostgreSQL mapping schemas & seeds
│       └── Dockerfile     # Multi-stage production workspace runner
├── packages/
│   └── types/             # Shared monorepo-wide Typescript models & DTOs
├── .github/workflows/     # Automated Actions CI checking lints and builds
├── docker-compose.yml     # Standalone Docker setup for PostgreSQL + pgAdmin
├── pnpm-workspace.yaml    # Workspace definition mapping sub-packages
└── turbo.json             # Turborepo caching pipelines configuration
```

---

## 🚀 Quick Start (Local Developer Setup)

### Prerequisites
* **Node.js 22 LTS** (Recommended via Homebrew/nvm)
* **pnpm 11+**
* **PostgreSQL 16** (Running locally or inside Docker Compose)

### 1. Configure Environments
Create `.env` file in the root workspace folder based on `.env.example`:
```bash
cp .env.example .env
cp .env.example apps/backend/.env
cp .env.example apps/frontend/.env.local
```

### 2. Install Workspace Dependencies
Execute from root:
```bash
pnpm install
```

### 3. Sync and Seed PostgreSQL Database
Ensure your PostgreSQL database is running, then synchronize tables and run the seed script:
```bash
# Push schema structures directly
pnpm db:push

# Populate database with 30-days of performance reports, notifications, and default credentials
pnpm db:seed
```

### 4. Run Development Stack
Launch backend (`:4000`) and frontend (`:3000`) concurrently using Turborepo:
```bash
pnpm dev
```

---

## 🔑 Demo Seed Accounts

Quick-login credentials for testing role interactions:

| Account Type | Email / Username | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@rollinhead.com` | `admin123` | Full dashboard access, publisher CRUD, CSV Uploads, global analytics |
| **Publisher** | `publisher@rollinhead.com` | `publisher123` | Restricted views, net earnings charts, script generator, notifications |

---

## 📦 Container Orchestration (Production Build)

Both applications have been configured with highly-optimized **multi-stage Docker builds** that keep final images light and secure.

### Build Backend Image
```bash
docker build -t rollinhead-backend -f apps/backend/Dockerfile .
```

### Build Standalone Frontend Image
```bash
docker build --build-arg NEXT_PUBLIC_API_URL="https://api.yourdomain.com" -t rollinhead-frontend -f apps/frontend/Dockerfile .
```

### Run Full Infrastructure Locally (PostgreSQL + pgAdmin)
```bash
docker compose up -d
```
Access **pgAdmin** at [http://localhost:5050](http://localhost:5050) using username `admin@rollinhead.com` and password `admin` to verify tables and runs.
