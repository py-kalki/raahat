const fs = require('node:fs');
const path = require('node:path');
const mobile = path.resolve(__dirname, '../apps/mobile');
const trustFile = path.join(mobile, 'public/.well-known/assetlinks.json');
if (fs.existsSync(trustFile)) {
  fs.mkdirSync(path.join(mobile, 'dist/.well-known'), { recursive: true });
  fs.copyFileSync(trustFile, path.join(mobile, 'dist/.well-known/assetlinks.json'));
}
const htmlPath = path.join(mobile, 'dist/index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(/<title>.*?<\/title>/, '<title>Raah — Corridor Demo</title>');
if (!html.includes('manifest.webmanifest')) {
  html = html.replace('</head>', '<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#1F3A2A"><script src="/pwa.js" defer></script></head>');
}
fs.writeFileSync(htmlPath, html);
for (const file of ['manifest.webmanifest', 'sw.js', 'pwa.js', 'icons/icon-192.png', 'icons/icon-512.png']) {
  if (!fs.existsSync(path.join(mobile, 'dist', file))) throw new Error(`Missing PWA file: ${file}`);
}
console.log('PWA manifest, service worker, and icons verified.');
