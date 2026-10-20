# LifeLane — Implementation Plan

Companion to `PRD.md`. Estimated total: **5–6 weeks** solo, part-time pace. Demo-ready core (M1–M4) in about 3 weeks.

---

## 1. Architecture

```
┌────────────────────┐       HTTPS / WSS        ┌──────────────────────────┐
│ Android app (Expo) │ ───────────────────────▶ │ Express + Socket.IO API  │
│ Driver/Officer/Admin│ ◀─────────────────────── │ TypeScript               │
└─────────┬──────────┘     FCM high-priority     └───────┬───────────┬──────┘
          │                                              │           │
          │ background GPS                         Prisma│           │ OSRM (routing)
          ▼                                              ▼           ▼
   expo-location + task-manager                    PostgreSQL     turf.js (geometry)
```

**Stack**

| Layer | Choice |
|-------|--------|
| App | Expo (dev build), TypeScript, Expo Router, NativeWind |
| Map | `@maplibre/maplibre-react-native` + OSM tiles |
| Location | `expo-location`, `expo-task-manager` (foreground service) |
| Notifications | `expo-notifications` + FCM, high-importance channel, custom siren |
| State/data | Zustand, TanStack Query, `socket.io-client` |
| API | Node.js, Express, Socket.IO, Zod validation |
| DB | PostgreSQL + Prisma |
| Geo | `@turf/turf`, OSRM |
| Hosting | Railway/Render/Fly for API, Neon/Supabase for Postgres |
| Build | EAS Build (APK for pilots) |

## 2. Repository structure (monorepo)

```
lifelane/
├── apps/
│   ├── mobile/                  # Expo app
│   │   ├── app/                 # Expo Router screens
│   │   │   ├── (auth)/login.tsx
│   │   │   ├── driver/{index,trip-setup,active}.tsx
│   │   │   ├── officer/{index,alert}.tsx
│   │   │   └── admin/{map,users}.tsx
│   │   ├── components/ui/       # BigButton, StatusPill, BottomSheet
│   │   ├── lib/{api,socket,location-task,push}.ts
│   │   └── store/               # Zustand stores
│   └── api/
│       ├── prisma/schema.prisma
│       └── src/
│           ├── routes/          # auth, trips, officers, admin
│           ├── services/        # corridor, routing, alertEngine, push
│           ├── sockets/         # handlers + auth middleware
│           ├── middleware/      # auth, rateLimit, validate
│           └── index.ts
├── packages/shared/             # shared types, zod schemas, constants
├── tools/gps-simulator/         # replay a route as a moving ambulance
├── PRD.md
└── implementation-plan.md
```

## 3. Phases

### Phase 0 — Setup (1–2 days)
- [ ] Monorepo (pnpm workspaces), TypeScript configs, ESLint, Prettier
- [ ] Postgres + Prisma schema + first migration
- [ ] Firebase project + `google-services.json`
- [ ] EAS project, first dev build on a real phone

**Done when:** blank app launches on a phone and API `/health` responds.

### Phase 1 — Auth and roles (3–4 days) · M1
- [ ] `POST /auth/register`, `POST /auth/login` (bcrypt + JWT access/refresh)
- [ ] Role middleware (DRIVER, OFFICER, ADMIN) and `verified` gate
- [ ] Admin endpoints: list pending users, approve/reject
- [ ] App: login screen, secure token storage (`expo-secure-store`), role-based redirect
- [ ] Rate limit on auth routes

**Done when:** unverified user is blocked from every protected route; admin can verify.

### Phase 2 — Officer: duty and location (4–5 days) · M2
- [ ] `PATCH /officers/me/duty`, `POST /officers/me/location`
- [ ] Background location task with foreground-service notification
- [ ] Permission flow: foreground → background → notifications → battery-optimization exemption
- [ ] Officer home screen: big On Duty toggle, GPS and connection status
- [ ] Register FCM token with backend

**Done when:** officer phone, screen off, keeps updating location for 30+ min.

### Phase 3 — Driver: trip and tracking (4–5 days) · M3
- [ ] `POST /trips` (validates pickup/drop, calls OSRM, stores route GeoJSON)
- [ ] `PATCH /trips/:id/end`, `PATCH /trips/:id/cancel`
- [ ] Trip setup screen (search/pin pickup and drop)
- [ ] Active trip screen: map, route, speed, ETA, End Trip
- [ ] Driver background location via socket (`driver:location`, 3–5 s)
- [ ] Queue and resend GPS points when offline

**Done when:** driver can run a full trip and the position streams to the server.

### Phase 4 — Corridor engine and alerts (5–6 days) · M4 (**critical**)
- [ ] Corridor service (`findOfficersAhead`) with unit tests
- [ ] Alert engine: dedupe via unique (trip, officer), emit socket + FCM
- [ ] FCM high-priority message + Android notification channel with siren
- [ ] Full-screen intent for alerts when app is closed or locked
- [ ] Officer alert screen: siren, vibration, countdown, ACKNOWLEDGE
- [ ] `alert:ack` socket event, stored on `Alert`
- [ ] Auto-dismiss after ambulance passes the officer
- [ ] Driver sees acknowledged-officer count

**Done when:** simulated trip alerts the right officers once each, 2–4 min ahead, with the phone locked.

### Phase 5 — Admin and simulator (3–4 days) · M5
- [ ] Admin live map (vehicles + officers + active alerts)
- [ ] Trip history list and detail with alert timeline
- [ ] GPS simulator CLI: replays a route polyline at configurable speed
- [ ] Seed script: demo city, drivers, 20 officers along a route

**Done when:** one command runs a full demo with no human steps.

### Phase 6 — Hardening and release (3–4 days) · M6
- [ ] Socket JWT handshake verification and room authorization
- [ ] Input validation (Zod) on every route and socket event
- [ ] Rate limits, helmet, CORS allowlist, structured logging
- [ ] Error monitoring (Sentry) in app and API
- [ ] Load test: 200 officers + 10 simultaneous trips
- [ ] EAS production APK, install guide, demo video

## 4. API contract (v1)

| Method | Route | Role | Purpose |
|--------|-------|------|---------|
| POST | `/auth/register` | public | Create account (unverified) |
| POST | `/auth/login` | public | Get tokens |
| GET | `/admin/users?status=pending` | ADMIN | Pending approvals |
| PATCH | `/admin/users/:id/verify` | ADMIN | Approve or reject |
| PATCH | `/officers/me/duty` | OFFICER | On/Off duty |
| POST | `/officers/me/location` | OFFICER | Location (HTTP fallback) |
| POST | `/devices/push-token` | any | Register FCM token |
| POST | `/trips` | DRIVER | Create trip + route |
| PATCH | `/trips/:id/end` | DRIVER | Complete trip |
| PATCH | `/trips/:id/cancel` | DRIVER | Cancel trip |
| GET | `/trips` | ADMIN | History |

**Socket events**

| Event | Direction | Payload |
|-------|-----------|---------|
| `driver:location` | client → server | `{ tripId, lat, lng, speed }` |
| `officer:location` | client → server | `{ lat, lng }` |
| `emergency:alert` | server → officer | `{ tripId, etaSec, distanceAheadM, message }` |
| `alert:ack` | officer → server | `{ alertId }` |
| `alert:acked` | server → driver/admin | `{ tripId, officerId, count }` |
| `trip:update` | server → admin | `{ tripId, lat, lng }` |
| `alert:dismiss` | server → officer | `{ alertId }` |

Identity (user ID, role) always comes from the verified JWT, never from the payload.

## 5. Corridor algorithm

1. Snap ambulance position to the route line → distance along route.
2. For each on-duty officer with a fresh fix (under 60 s):
   - Snap to the route; skip if farther than **300 m**.
   - `distanceAhead = officerAlong − ambulanceAlong`; skip if negative.
   - `eta = distanceAhead / speed`; alert if `eta ≤ 240 s`.
3. Insert `Alert` (unique per trip and officer). On success, emit.
4. Officer who is later passed (`distanceAhead < −100 m`) gets `alert:dismiss`.

**Scale note:** at MVP scale, loading on-duty officers each tick is fine. Before 1k+ officers, add a PostGIS bounding-box prefilter or an in-memory spatial index, and throttle the engine to one run per second per trip.

## 6. Testing strategy

| Level | What |
|-------|------|
| Unit | Corridor service (ahead/behind/off-route/too-far/dedupe), ETA math |
| Integration | Auth flow, trip creation with mocked OSRM, alert emission with a test socket client |
| Simulation | GPS simulator drives a route; assert each officer alerted once within window |
| Device | Real Android phones: locked screen, Doze, battery saver, Android 13/14/15 |
| Field | Drive-test with a car and 2–3 phones before any demo |

## 7. Android-specific checklist

- [ ] `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `POST_NOTIFICATIONS`
- [ ] `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_LOCATION` (Android 14+)
- [ ] `USE_FULL_SCREEN_INTENT` for alerts over the lock screen
- [ ] High-importance notification channel with custom siren sound
- [ ] Prompt to disable battery optimization (OEMs like Xiaomi, Oppo, Vivo kill background apps aggressively)
- [ ] Test on at least one aggressive-OEM phone, since this is where most failures occur

## 8. DevOps

- **Environments:** local (Docker Postgres), staging, production
- **CI:** GitHub Actions: lint, typecheck, unit tests, Prisma migrate check
- **Secrets:** env vars only (`DATABASE_URL`, `JWT_SECRET`, `FCM_SERVICE_ACCOUNT`); never in the repo
- **Migrations:** `prisma migrate deploy` in the release step
- **Monitoring:** Sentry + uptime check on `/health`
- **Backups:** daily Postgres snapshot

## 9. Security checklist

- [ ] Passwords hashed with bcrypt, short-lived access tokens
- [ ] Socket handshake verifies JWT; users can only join their own rooms
- [ ] Only verified DRIVER can create trips; only trip owner can post its location
- [ ] Rate limits on trips, auth and location endpoints
- [ ] Validation on all inputs; reject coordinates out of range
- [ ] Officer location deleted or nulled when going Off Duty
- [ ] Audit log of trip creation, alerts and acknowledgements

## 10. Risks to retire early

1. **Background GPS + alert on a locked phone.** Build a throwaway prototype in Phase 0–2 and test on real devices first. If this fails, the product fails.
2. **OEM battery killers.** Test on a Xiaomi/Oppo-class device in week 1.
3. **OSRM demo server limits.** Fine for dev; plan self-hosting or Mapbox before a pilot.

## 11. Post-MVP backlog

Multi-vehicle priority · hospital pre-alert · text-to-speech alerts · reroute on deviation · analytics dashboard · traffic-signal integration · civilian alerts · Play Store release · iOS.

## 12. Suggested first week

| Day | Task |
|-----|------|
| 1 | Monorepo, Postgres, Prisma schema, Expo dev build on phone |
| 2 | Auth endpoints + login screen |
| 3 | Admin verify + role routing |
| 4 | Officer duty toggle + background location prototype |
| 5 | Test background GPS on locked phone; fix permissions |
| 6–7 | Buffer, review, begin trip creation |
