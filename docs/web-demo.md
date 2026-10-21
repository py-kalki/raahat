# Render browser demo

The Express service serves the Expo web export and API together. This is a PWA
opened in Android Chrome, with an optional home-screen install. It does not use
Metro, Android Studio, or an APK. The existing native build remains separate.

## Existing Render service

Commit/push the changes to the branch connected to your Render service. In that
service's Settings, keep the repository root as the root directory (not apps/api):

- Build command: `pnpm install --frozen-lockfile && pnpm build:demo`
- Start command: `pnpm start:api`
- Health check path: `/health`
- Node runtime: Node 22 or newer; pnpm version is pinned in package.json.

Keep the existing DATABASE_URL and JWT_SECRET. Set NODE_ENV to production.
No database schema migration is needed for this change. The existing pushToken
field stores one browser subscription per account, so use different officer
accounts if demonstrating multiple officer devices.

For browser push, run `pnpm push:keys` locally once, then add these private Render
environment settings. Do not commit generated keys:

```
VAPID_PUBLIC_KEY=<publicKey from the command>
VAPID_PRIVATE_KEY=<privateKey from the command>
VAPID_SUBJECT=mailto:<your real contact email>
```

Keep this key pair stable across deploys. If changed, enable notifications again
on each device. Never place VAPID_PRIVATE_KEY in EXPO_PUBLIC variables.
Without these settings the app opens, but notification setup reports that push
is not configured. Existing Expo/FCM notifications remain available for native apps.

Deploy the latest commit. Visit the service's HTTPS root URL, for example
`https://raahat-n1e2.onrender.com/`, and `/demo`. Seeing only JSON at `/health`
does not verify the website. `/manifest.webmanifest` and `/sw.js` must also load.

## Two-device demonstration

1. Open the HTTPS website in Android Chrome on two phones, or separate browser
   profiles. Sign in as an approved officer on one and approved driver on the other.
   Existing seeded demo accounts work only if the Render database has been seeded.
2. Officer: open **Demo setup**, press **Get my location**, and allow location.
   This records one stationary post and sets duty on. Refresh after moving or
   after 30 minutes. Denied GPS never substitutes a Delhi coordinate on the web.
3. Officer: press **Enable notifications for this account**, allow notifications,
   then **Send test notification**. Check the phone's notification tray. Tests
   are limited to one every 30 seconds. Use **Disable notifications** to opt out.
4. Driver: create a trip from the driver home page, selecting a destination such
   that its route passes the officer's location. Open **Demo setup** and press
   **Simulate my active trip**. Keep this page visible. It sends simulated points
   along the saved route to the real corridor engine for about 2½ minutes plus
   server processing time. Leaving the page, hiding it, or losing connection stops it.
5. Officer: return to the officer station for the in-app alert. When the driver
   reaches the corridor window, a browser notification is also sent if configured.
   Acknowledge the alert; the driver receives the count update. A notification click
   opens/focuses the app; sign in again if required. Pending alerts load at the station.
6. Driver: open the active trip screen and end/cancel the trip after demonstrating.
7. Chrome menu → **Add to Home screen** / **Install app** gives an app-like launcher.

The demo needs internet. It has no background GPS tracking or offline operation.
Browser/Android battery and notification settings affect delivery. The driver must
keep the simulator visible. Routes and hospital search use external OpenStreetMap/
OSRM services; some existing dashboard figures are illustrative. This is a demo,
not a live emergency dispatch deployment. No one should rely on it for emergencies.

## Local verification

```
pnpm build:demo
pnpm --filter @raahat/mobile typecheck
pnpm --filter @raahat/api exec tsx --test tests/web-demo.test.ts
pnpm start:api
```

Open `http://localhost:4000` on the development machine. Localhost is permitted
for service workers; a phone must use the deployed HTTPS address. API calls use
`/api` on the current origin, while legacy native API URLs remain supported.
Authentication stays in memory; refreshing the page requires signing in again.
The service worker intentionally does not cache account data or telemetry.

## Verification completed

- API compilation, mobile TypeScript check and production web export passed.
- Nine automated tests passed, including simulated driver location → corridor
  evaluation → officer alert → acknowledgement back to the driver, using an
  isolated test database substitute.
- Slow push requests no longer block subsequent officers or driver updates.
  Officer alerts are subscribed at app level, including on the Demo setup screen.
- GPS retries a failed high-accuracy fix using network-based positioning and
  bounds unresponsive browser callbacks. Denied permission is never bypassed.
- Browser checks passed for driver/officer sign-in, connected demo controls,
  starting/stopping simulation, officer preview acknowledgement/dismissal,
  notification setup errors, and the setup screen at a 390-pixel viewport.
- HTTP checks passed for frontend deep links, JavaScript, manifest, worker,
  icons and authenticated API separation. The server sends an origin-only
  cross-origin referrer policy for map provider requests.

The Render deployment, Android home-screen installation and real device GPS /
push delivery still require verification on the deployed HTTPS service. No live
Render data was changed during these tests.

Notification timing: eligible officers receive a socket alert immediately after
the alert is stored, independently of push delivery. Eligibility still means ahead
of the ambulance, within 300 metres of the route and within the four-minute ETA
window; this is not a four-minute timer. A sleeping Render Free service can take
about a minute to wake (https://render.com/docs/free). Browser/OS push delivery is
not an instantaneous guarantee. `/health` includes the deployed revision and
whether browser push is configured; pushing code does not set secret VAPID keys.
