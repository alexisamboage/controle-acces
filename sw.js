// Service worker : garde une copie de l'app dans le téléphone pour qu'elle
// s'ouvre sans internet. Les données des membres ne passent jamais par ici
// (elles sont dans IndexedDB, que ce fichier ne touche pas).
importScripts('version.js');

const CACHE = 'controle-acces-' + self.VERSION;

const FICHIERS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'version.js',
  'import.js',
  'db.js',
  'lib/xlsx.full.min.js',
  'manifest.webmanifest',
  'polices/anton.woff2',
  'images/embleme.png',
  'images/icone-192.png',
  'images/icone-512.png',
  'images/icone-maskable-512.png',
  'images/apple-touch-icon.png'
];

// Nouvelle version : on télécharge tous les fichiers d'un coup
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// On supprime les copies des anciennes versions de l'app
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n.startsWith('controle-acces-') && n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Toujours répondre avec la copie du téléphone : marche avec ou sans réseau
self.addEventListener('fetch', event => {
  const requete = event.request;
  if (requete.method !== 'GET') return;

  if (requete.mode === 'navigate') {
    event.respondWith(caches.match('index.html', { cacheName: CACHE }).then(r => r || fetch(requete)));
    return;
  }
  event.respondWith(caches.match(requete, { ignoreSearch: true }).then(r => r || fetch(requete)));
});
