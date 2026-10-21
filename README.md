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

### Browser demo on Render (recommended for this demo)

Run `pnpm build:demo`, then `pnpm start:api`. The server now serves the website
and API together. Android Chrome can install it to the home screen; no APK is
needed. See [Render setup and two-phone demo steps](docs/web-demo.md) for the
build command, notification keys, one-time GPS, and simulated trip controls.

### Install a standalone Android APK (Windows / Android Studio)

The red "Could not connect to development server" screen means a **debug**
build was installed. Debug builds load JavaScript from Metro on port 8081.
A standalone installation needs the **release** variant, which embeds JavaScript.

1. Install dependencies with `pnpm install` and configure Android Studio's SDK
   and JDK 17.
2. Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env.local` to your deployed HTTPS
   API origin. The mobile project already has a local `.env`; Expo environment
   precedence applies. Never put server credentials in `EXPO_PUBLIC_*` variables.
3. From the repository root, run `pnpm build:android:apk`.
4. Transfer `dist/raahat-release.apk` to the phone and install it. Metro and a
   USB connection are not needed. Login and live corridor features still need
   internet access and the backend.

The command builds the shared package, creates Android sources if absent, runs
`:app:assembleRelease`, and checks for `assets/index.android.bundle` before
copying the APK. It refreshes JavaScript on each build so environment and shared
package changes cannot leave an old bundle in the APK. It rejects missing, HTTP, and loopback API origins to avoid
shipping a standalone build that cannot reach its backend. Rebuild after changing
the API URL; Expo embeds public environment values at bundle time.
Metro uses two workers in this workflow to keep memory usage manageable while
Android Studio and Gradle are running.

In Android Studio, open `apps/mobile/android`, select **release** for the `app`
module in **Build Variants**, then build the APK. The native output is
`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.
Run `pnpm --filter @raahat/shared build` first and set the mobile environment
as above. Do not distribute `outputs/apk/debug/app-debug.apk`.

The current native release configuration uses the debug signing key for local
device testing. Use your own release keystore for public distribution. If Android
reports a signature mismatch, use the original signing key to preserve app data;
uninstalling the old app also resolves it but removes its local data.

For deliberate debug development with a USB-connected phone, use
`pnpm dev:mobile` and `adb reverse tcp:8081 tcp:8081`. This is a development
workflow, not a standalone APK fix.

References: [Expo local release builds](https://docs.expo.dev/guides/local-app-production/)
and [Expo APK builds](https://docs.expo.dev/build-reference/apk/).

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
