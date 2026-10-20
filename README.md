# Raahat (राहत) — Real-time Emergency Corridor System

> **Raahat** creates automated green corridors for ambulances and emergency vehicles by synchronizing real-time GPS telemetry with on-duty traffic police ahead of the route.

Built strictly according to:
- [`PRD.md`](./PRD.md)
- [`design.md`](./design.md) (Editorial nature-first glass design system)
- [`implementation-plan.md`](./implementation-plan.md)

---

## 1. Monorepo Architecture

```
raahat/
├── apps/
│   ├── mobile/                    # React Native + Expo mobile application
│   │   ├── app/                   # Expo Router screens (Driver, Officer, Admin)
│   │   │   ├── index.tsx          # Editorial Onboarding screen (design.md 4.3)
│   │   │   ├── (auth)/login.tsx   # Phone + Role authentication with verification gate
│   │   │   ├── driver/            # Driver Home (design.md 4.2), Trip Setup & Active Corridor
│   │   │   ├── officer/           # On/Off Duty station & Full-Screen Alarm Modal
│   │   │   └── admin/             # Central oversight map & User verification gate
│   │   ├── components/ui/         # GlassView, EditorialHeadline, PillButton, CategoryChip, FloatingNav
│   │   ├── lib/                   # API client and Socket.IO manager
│   │   └── store/                 # Zustand state stores
│   └── api/                       # Express + Socket.IO + Prisma backend
│       ├── prisma/                # Schema (User, Officer, Trip, Alert with unique constraints) & seed
│       └── src/
│           ├── routes/            # /auth, /trips, /officers, /admin, /devices
│           ├── services/          # Corridor engine (turf.js), Routing (OSRM), Alert dispatch & push
│           └── sockets/           # Real-time WebSocket telemetry handlers
├── packages/
│   └── shared/                    # Shared types, Zod schemas, constants & Design tokens
├── tools/
│   └── gps-simulator/             # CLI simulator to replay ambulance routes and test alerts
├── PRD.md
├── design.md
└── implementation-plan.md
```

---

## 2. Design System Alignment (`design.md`)

Raahat strictly implements the serenity and precision of the editorial glass design system:
- **Palette**: Forest green accents (`#1F3A2A`, `#3E6B4B`), Sage highlights (`#6F9A78`, `#A9C4AE`), Mist backgrounds (`#F4F7F5`, `#DCE6E0`), and Ink primary actions (`#111312`).
- **Surfaces**: Frosted glass layering (`rgba(255, 255, 255, 0.55)` with 20px blur, white hairline border at 65% opacity, and subtle diffuse green shadow `elev-2`).
- **Typography**: Clean sentence-weight sans-serif paired with **elegant italic serif emphasis accents** on key words.
- **Pill Interactions**: Capsule shaped buttons, category chips, tags, and the signature floating bottom navigation capsule.
- **Color Semantics**: Red = emergency corridor active, Green = clear / acknowledged / on duty, Gray = offline.

---

## 3. Quick Start Guide

### Step 1: Install Dependencies
```bash
pnpm install
```

### Step 2: Database Setup
Set your PostgreSQL connection string in `apps/api/.env` (or copy `.env.example`):
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/raahat?schema=public"
```
Generate Prisma client and push schema:
```bash
pnpm --filter @raahat/api prisma:generate
pnpm --filter @raahat/api prisma:db-push
```

### Step 3: Seed Demo Data
Pre-populates an Admin Dispatcher, an Ambulance Driver, and 5 stationed Delhi Traffic Officers:
```bash
pnpm --filter @raahat/api seed
```
Demo accounts:
- **Admin**: `9999999999` / `password123`
- **Driver**: `9888888888` / `password123`
- **Officers**: `9777777701` to `9777777705` / `password123`

### Step 4: Run API Server
```bash
pnpm dev:api
```
API running on `http://localhost:4000` (Health check: `http://localhost:4000/health`).

### Step 5: Start Mobile App (Expo)
```bash
pnpm dev:mobile
```
Press `w` for web preview, or scan QR code via Expo Go on Android.

### Step 6: Run GPS Ambulance Simulator
To test real-time corridor alerts and officer acknowledgements:
```bash
pnpm dev:simulator
```
The simulator will authenticate as the driver, create an emergency corridor, stream coordinates every 2.5s, trigger alerts on eligible officers within 4 min ETA, and log live acknowledgements.
