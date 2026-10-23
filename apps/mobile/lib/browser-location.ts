// A short foreground watch lets GPS improve without background tracking.
// Browser-reported accuracy is an estimate, not a guarantee of true position.
export async function getBrowserPosition(
  provider: Pick<Geolocation, 'watchPosition' | 'clearWatch'> & Partial<Pick<Geolocation, 'getCurrentPosition'>>,
  timeoutMs = 12000,
  maxAccuracyM = 100,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let finished = false;
    let watch: number | undefined;
    let best: GeolocationPosition | undefined;
    let fallbackStarted = false;
    let fallbackTimer: ReturnType<typeof setTimeout>;
    const finish = (position?: GeolocationPosition, error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      if (watch !== undefined) provider.clearWatch(watch);
      if (position) resolve(position); else reject(error);
    };
    const timer = setTimeout(() => {
      if (best && best.coords.accuracy <= maxAccuracyM && Date.now() - best.timestamp <= 30000) finish(best);
      else finish(undefined, new Error(best
        ? `Location is too imprecise (reported accuracy ±${Math.round(best.coords.accuracy)} m). Enable Precise location for Raah (or Chrome in browser mode), move near a window or outdoors, and retry. No new location was saved.`
        : 'The browser did not provide a fresh location. Allow Location in this site’s permissions and enable device location services. On Windows, also allow desktop apps to access location. Retry, or enter confirmed coordinates manually. No new location was saved.'));
    }, timeoutMs);
    const receive = (position: GeolocationPosition) => {
        if (finished) return;
        const { latitude, longitude, accuracy } = position.coords;
        const age = Date.now() - position.timestamp;
        if (![latitude, longitude, accuracy, age].every(Number.isFinite) || Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180 || accuracy < 0 || age > 30000 || age < -5000) return;
        if (!best || accuracy < best.coords.accuracy) best = position;
        if (accuracy <= 50) finish(position);
    };
    const failed = (error: GeolocationPositionError) => {
        if (error.code === 1) finish(undefined, new Error('Location permission denied. Allow Location for this site using the icon beside the browser address. On Android, also allow Precise location for Raah or your browser. No new location was saved.'));
        else startFallback();
    };
    const startFallback = () => {
      if (finished || fallbackStarted || !provider.getCurrentPosition) return;
      fallbackStarted = true;
      try { provider.getCurrentPosition(receive, error => { if (error.code === 1) failed(error); },
        { enableHighAccuracy: false, maximumAge: 0, timeout: timeoutMs }); } catch { /* Outer deadline remains authoritative. */ }
    };
    fallbackTimer = setTimeout(startFallback, Math.min(3000, timeoutMs / 2));
    try {
      watch = provider.watchPosition(receive, failed, { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs });
      // Handle synchronous provider callbacks as well.
      if (finished) provider.clearWatch(watch);
    } catch { finish(undefined, new Error('Location could not start. Enable location access and retry. No new location was saved.')); }
  });
}
