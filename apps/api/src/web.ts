import express, { Express, Router } from 'express';
import fs from 'fs';
import path from 'path';

export function legacyApi(router: Router): express.RequestHandler {
  return (req, res, next) => {
    // /trips and /admin are also browser routes. JSON clients keep their legacy URLs.
    if (req.method === 'GET' && req.headers.accept?.includes('text/html') && !req.headers.authorization) return next();
    router(req, res, next);
  };
}

export function serveWebApp(app: Express, directory = path.resolve(__dirname, '../../mobile/dist')) {
  if (!fs.existsSync(path.join(directory, 'index.html'))) return;
  // Express hides dot-directories by default. Expose only the Android trust file.
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.sendFile(path.join(directory, '.well-known/assetlinks.json'), { dotfiles: 'allow' });
  });
  app.use(express.static(directory, {
    dotfiles: 'ignore',
    setHeaders(res, file) {
      if (/\.(html|webmanifest)$/.test(file) || /[\\/](sw|pwa)\.js$/.test(file)) res.setHeader('Cache-Control', 'no-cache');
      if (file.endsWith('sw.js')) res.setHeader('Service-Worker-Allowed', '/');
    },
  }));
  app.get(['/', '/home', '/trips', '/profile', '/corridor', '/demo', '/driver', '/driver/active', '/driver/trip-setup', '/officer', '/admin/map', '/admin/users', '/login'], (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(directory, 'index.html'));
  });
}
