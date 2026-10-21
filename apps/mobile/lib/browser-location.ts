// A browser may expose geolocation but never answer (e.g. an embedded webview).
// Bound every attempt ourselves, then retry unavailable GPS with network location.
export async function getBrowserPosition(provider: Pick<Geolocation, 'getCurrentPosition'>, timeoutMs = 8000): Promise<GeolocationPosition> {
  const attempt = (highAccuracy: boolean) => new Promise<GeolocationPosition>((resolve, reject) => {
    let finished = false;
    const finish = (value: GeolocationPosition | null, error?: any) => {
      if (finished) return;
      finished = true; clearTimeout(timer);
      if (value) resolve(value); else reject(error);
    };
    const timer = setTimeout(() => finish(null, { code: 3 }), timeoutMs + 250);
    try {
      provider.getCurrentPosition(position => finish(position), error => finish(null, error),
        { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: 30000 });
    } catch (error) { finish(null, error); }
  });
  try { return await attempt(true); }
  catch (error: any) {
    if (error.code === 1) throw new Error('Location permission denied. Allow location for this website and enable device Location services. In an embedded preview, open the same address in Chrome or Edge.');
    try { return await attempt(false); }
    catch (fallback: any) {
      if (fallback.code === 1) throw new Error('Location permission denied. Allow location in browser site settings and retry.');
      throw new Error('The browser could not obtain your location. Enable device Location services and try this address in Chrome or Edge (Android: turn on Location and allow precise location). No location was saved.');
    }
  }
}
