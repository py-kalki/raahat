// A short foreground watch lets GPS improve without background tracking.
// Browser-reported accuracy is an estimate, not a guarantee of true position.
export async function getBrowserPosition(
  provider: Pick<Geolocation, 'watchPosition' | 'clearWatch'>,
  timeoutMs = 25000,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let finished = false;
    let watch: number | undefined;
    let best: GeolocationPosition | undefined;
    const finish = (position?: GeolocationPosition, error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (watch !== undefined) provider.clearWatch(watch);
      if (position) resolve(position); else reject(error);
    };
    const timer = setTimeout(() => {
      if (best && best.coords.accuracy <= 100 && Date.now() - best.timestamp <= 30000) finish(best);
      else finish(undefined, new Error(best
        ? `Location is too imprecise (reported accuracy ±${Math.round(best.coords.accuracy)} m). Enable Precise location for Raah (or Chrome in browser mode), move near a window or outdoors, and retry. No new location was saved.`
        : 'No fresh GPS fix was obtained. Turn on device Location, allow Precise location for Raah (or Chrome), and retry outdoors. No new location was saved.'));
    }, timeoutMs);
    try {
      watch = provider.watchPosition(position => {
        if (finished) return;
        const { latitude, longitude, accuracy } = position.coords;
        const age = Date.now() - position.timestamp;
        if (![latitude, longitude, accuracy, age].every(Number.isFinite) || Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180 || accuracy < 0 || age > 30000 || age < -5000) return;
        if (!best || accuracy < best.coords.accuracy) best = position;
        if (accuracy <= 50) finish(position);
      }, error => {
        if (error.code === 1) finish(undefined, new Error('Location permission denied. Open Android Settings → Apps → Raah → Permissions → Location and allow Precise location. In browser mode, also allow this site in Chrome. No new location was saved.'));
        // Temporary unavailable/timeout results may be followed by a valid fix.
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs });
      // Handle synchronous provider callbacks as well.
      if (finished) provider.clearWatch(watch);
    } catch { finish(undefined, new Error('Location could not start. Enable location access and retry. No new location was saved.')); }
  });
}
