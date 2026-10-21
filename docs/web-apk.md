# Raahat hosted Android APK

The dedicated `com.raahat.web` app opens https://raahat-n1e2.onrender.com using
Android Browser Helper's Trusted Web Activity. It has its own Raahat launcher icon
and uses the deployed website, with no Metro or bundled React Native runtime.
It can coexist with the older `com.raahat.app` APK. Internet and an up-to-date
TWA-capable browser (recommended: Chrome) are required.

Version 1.0.1 is labelled **Raahat Web** and uses a persistent native entry screen.
It attempts a verified browser session once, keeps an Open Raahat button available,
and displays launch errors or a five-second browser timeout. Open in browser
explicitly chooses an external browser, avoiding a deep-link loop back into the
APK. Returning or restoring the screen does not automatically relaunch it.
This replaces the library's translucent launcher. The reported Infinix Android 15
crash has no device stack trace, so its exact original cause is not confirmed.

## Build

Open `apps/web-apk` in Android Studio, or run from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-web-apk.ps1
```

Requires Java 17 and Android SDK 36. Set `ANDROID_HOME` to your SDK location or
create `apps/web-apk/local.properties` with `sdk.dir` pointing at it.
The script generates a unique signing key once, runs Android 15 Robolectric startup
tests and Android lint, builds a signed release APK, verifies its signature against
the website association, and copies it to `dist/raahat-web-release.apk`.
Keep `apps/web-apk/raahat-release.jks` and `signing.properties` backed up privately.
They are ignored by Git. Future APK updates require the same signing key and a
higher versionCode in `app/build.gradle`. Do not regenerate the key for updates.

## Website verification and permissions

The build writes the public certificate fingerprint to
`apps/mobile/public/.well-known/assetlinks.json`. Commit this public file and deploy
the website. The API explicitly serves this one dot-directory file; unrelated
hidden files stay hidden. Confirm the live HTTPS `/.well-known/assetlinks.json`
returns JSON with this APK's fingerprint. Without verification, the browser may
show its address bar instead of fullscreen mode.

Android Browser Helper delegates location and notification permissions to Android.
In Demo setup, explicitly enable location and notifications. Denying permissions
does not grant access or fabricate location. The Render VAPID environment variables
are still required for background push; installing this APK does not configure
the server. See `web-demo.md` for the two-device demonstration.

Copy the APK to your phone, open it, and allow installation from the app you used
to open the file. No USB debugging is needed to install it. If the older Raahat
app remains installed, distinguish this build in Android App info by package
`com.raahat.web` (or remove the older one yourself).

Verify on a physical phone: launch from its icon, sign in, capture real GPS,
enable notifications, send a test, background the app and check delivery, then
tap a notification to return. Build/lint checks alone do not verify those flows.
