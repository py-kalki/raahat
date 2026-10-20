# LifeLane — Product Requirements Document

**Working title:** LifeLane (see naming notes in chat; easy to change)
**Version:** 0.1 (MVP)
**Platform:** Android (React Native + Expo)
**Status:** Draft for review

---

## 1. Overview

LifeLane is a real-time emergency corridor system. When an ambulance (or other emergency vehicle) starts a trip, the app computes the route, tracks the vehicle live, and automatically alerts traffic police located on the road ahead, a few minutes before the vehicle reaches them, so they can clear the way.

## 2. Problem

Emergency vehicles lose critical minutes in traffic. Today, clearing the road depends on sirens, manual radio or phone calls, and luck. Traffic police on the route usually have no advance warning that an ambulance is coming.

## 3. Goals

| # | Goal | MVP target |
|---|------|------------|
| G1 | Give traffic police advance notice of an approaching emergency vehicle | Alert delivered 2–4 min before arrival |
| G2 | Live tracking of active emergency vehicles | Location update latency under 5 s |
| G3 | Reliable alert delivery that cannot be missed | Full-screen alarm with acknowledgement |
| G4 | Prove value with measurable data | Trip time and alert/ack logs per trip |

### Non-goals (MVP)

- Controlling traffic signals directly
- Alerting civilian drivers
- iOS app
- Integration with government dispatch (112/ERSS) systems
- Patient medical data or hospital integration

## 4. Users and personas

| Role | Description | Core need |
|------|-------------|-----------|
| **Driver** | Ambulance or emergency vehicle driver, stressed, often driving, may be wearing gloves | Start a trip in 2 taps, no distractions |
| **Officer** | Traffic police on duty at a junction or patrolling | Get a loud, clear warning in time, and know where to act |
| **Admin / Dispatcher** | Control-room person or project owner | Verify users, watch live map, review trips |

## 5. Assumptions (please confirm or correct)

1. MVP is a **demo/pilot**, distributed as an APK (not the Play Store).
2. The driver enters or pins the pickup and drop points. No dispatch system integration.
3. **One app with role-based screens** (Driver, Officer, Admin) instead of separate apps.
4. Free map stack (MapLibre + OpenStreetMap, OSRM routing) for the MVP.
5. Officers voluntarily go "On Duty" and share GPS while on shift.
6. Initial region: India (city to be decided).

## 6. User stories

**Driver**
- As a driver, I can log in and see my vehicle status.
- As a driver, I can set pickup and drop points and start a trip.
- As a driver, I see my route on a full-screen map and how many officers have acknowledged ahead.
- As a driver, I can end or cancel a trip.

**Officer**
- As an officer, I can go On Duty / Off Duty with one tap.
- As an officer, I receive a full-screen alarm with ETA and direction when an ambulance will reach my area.
- As an officer, I can acknowledge the alert so the driver and dispatcher know I'm acting.
- As an officer, the alert dismisses itself after the ambulance has passed.

**Admin**
- As an admin, I can approve or reject driver and officer accounts.
- As an admin, I see all active trips and on-duty officers on a live map.
- As an admin, I can review past trips with alert and acknowledgement logs.

## 7. Functional requirements

### P0 (must have for MVP)

| ID | Requirement |
|----|-------------|
| F1 | Phone + password authentication with roles (DRIVER, OFFICER, ADMIN) |
| F2 | Admin verification: unverified users cannot start trips or receive alerts |
| F3 | Driver creates a trip with pickup and drop; route computed via routing service and stored as GeoJSON |
| F4 | Driver app streams location every 3–5 s, including when the screen is off (foreground service) |
| F5 | Officer On/Off Duty toggle; officer app sends location every ~10 s while on duty, including in background |
| F6 | **Corridor engine:** for each location update, find on-duty officers within 300 m of the route who are ahead of the vehicle and within ~4 min ETA |
| F7 | One alert per officer per trip (no duplicates) |
| F8 | Alert delivery through Socket.IO (in-app) and FCM high-priority push (background) |
| F9 | Officer full-screen alert: siren, vibration, countdown, big ACKNOWLEDGE button |
| F10 | Live map for driver (route + ambulance) and admin (all vehicles + officers) |
| F11 | Trip lifecycle: ACTIVE → COMPLETED / CANCELLED, with timestamps |
| F12 | GPS simulator tool for demos and testing |

### P1 (should have)

| ID | Requirement |
|----|-------------|
| F13 | Driver sees live count of acknowledged officers ahead |
| F14 | Text-to-speech alert ("Ambulance in 2 minutes, Ring Road junction") |
| F15 | Trip history and basic analytics for admin |
| F16 | Reroute if the driver deviates from the route |
| F17 | Adaptive GPS interval to save battery |

### P2 (later)

Multi-vehicle priority, hospital pre-alert, traffic-signal integration, civilian alerts, iOS, Play Store release.

## 8. Key flows

**Trip flow**
1. Driver opens app → taps **Start Trip** → sets pickup and drop.
2. Backend computes the route and creates an ACTIVE trip.
3. Driver app streams location. On every update the backend runs the corridor engine.
4. Officers matching the corridor rules get an alert (socket + push).
5. Officer acknowledges. Driver and admin see the acknowledgement.
6. Trip ends when the driver arrives at the drop point or cancels.

**Alert rules (defaults, configurable)**
- Corridor width: 300 m from the route line
- Alert horizon: officer reached within 240 s
- Assumed speed for ETA: 15 m/s (refined with live speed later)
- Officer location must be fresher than 60 s

## 9. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Latency | Location update to alert delivery under 3 s p95 |
| Reliability | Alerts must survive app backgrounding and Android Doze (high-priority FCM, full-screen intent) |
| Battery | Driver app usable for a full shift on a charger; officer app under ~10% per hour on duty |
| Security | JWT auth, socket handshake verification, rate limiting, no client-trusted IDs, HTTPS only |
| Privacy | Officer location stored only while on duty; trip data retention policy defined before pilot |
| Abuse prevention | Admin-verified accounts, audit log of every trip and alert |
| Accessibility | Touch targets of 56dp or more (72dp for critical actions), high contrast, dark mode default |
| Offline | Show connection status; queue driver GPS points and resend when back online |

## 10. Design principles

1. One primary action per screen.
2. Map-first layout with a bottom sheet.
3. Dark mode by default, high contrast.
4. Color means status only: red = emergency, green = clear/on duty, amber = warning, gray = offline.
5. The officer alert must be impossible to miss.
6. Always show GPS and connection status.

**Key screens:** Login, Driver Home, Trip Setup, Active Trip (driver), Officer Home, Officer Alert, Admin Live Map, Admin Verification.

## 11. Data model (summary)

`User` (role, verified) · `Vehicle` · `Officer` (onDuty, lat/lng, updatedAt) · `Trip` (route GeoJSON, status, current position) · `Alert` (trip, officer, ETA, status, ack time). Unique constraint on (trip, officer) prevents duplicate alerts.

## 12. Success metrics

| Metric | Target |
|--------|--------|
| Alert delivery rate to eligible officers | 99%+ |
| Median lead time of alert before arrival | 2–4 min |
| Acknowledgement rate | 80%+ |
| Location update latency | under 5 s |
| Demo: simulated trip end-to-end without manual steps | passes |
| Pilot (if applicable): trip time reduction vs baseline | measurable improvement |

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Officers don't keep the app on or share GPS | No alerts | Simple On Duty flow, battery-friendly tracking, onboarding with the department |
| Late or blocked notifications on Android | Missed alerts | High-priority FCM, full-screen intent, battery-optimization exemption prompt, socket as primary channel |
| Fake emergencies | Public disruption | Admin-verified drivers, trip audit log, rate limits |
| Routing/map free-tier limits | Outages | Self-host OSRM or move to Mapbox before pilot |
| Alert fatigue | Ignored alerts | Dedup, tight corridor, auto-dismiss after passing |
| Play Store background-location policy | Rejection | Start with APK distribution, prepare declaration and demo video later |
| Legal and liability concerns | Blocks pilot | Position as an advisory tool, involve the police department early |

## 13b. Open questions

1. Demo or real pilot with a department?
2. Which city and map provider?
3. Does the pickup come from a dispatch system, or is it driver-entered?
4. Should the product support fire and police vehicles from day one, or ambulances only?

## 14. Milestones

| Milestone | Outcome |
|-----------|---------|
| M1 | Auth, roles, schema, admin verification |
| M2 | Officer duty toggle, background location, live map |
| M3 | Driver trip creation, routing, live broadcast |
| M4 | Corridor engine + alerts (socket + FCM) + full-screen alert |
| M5 | Admin map, simulator, hardening |
| M6 | APK build, demo run, feedback |
