const CACHE_NAME = 'bsg-player-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. STRATÉGIE POUR L'AUDIO (Optimisée pour l'arrière-plan)
  if (event.request.destination === 'audio' || url.includes('.mp3')) {
    event.respondWith(
      fetch(event.request, {
        mode: 'no-cors', 
        credentials: 'omit'
      }).then(response => {
        // Si le réseau répond bien, on renvoie la réponse directement
        return response;
      }).catch(err => {
        console.error("Erreur de récupération audio dans le SW:", err);
        // CRUCIAL : On laisse la requête échouer naturellement auprès de l'élément <audio>
        // plutôt que de renvoyer "rien", ce qui évite de casser le cycle de vie du lecteur.
        throw err; 
      })
    );
    return;
  }

  // 2. STRATÉGIE POUR LES IMAGES (Mise en cache pour l'écran verrouillé)
  if (event.request.destination === 'image' || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Si l'image est déjà dans le cache (grâce au préchargement), on la sert instantanément
        if (cachedResponse) {
          return cachedResponse;
        }
        // Sinon, on va la chercher sur le réseau et on la sauvegarde dans le cache
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Si pas de réseau et pas de cache, on peut tenter de renvoyer le logo par défaut s'il existe
          return caches.match('https://raw.githubusercontent.com/bsg-univers/ppdp-bsg/refs/heads/main/media/ppdp.png');
        });
      })
    );
    return;
  }

  // 3. STRATÉGIE PAR DÉFAUT (Réseau d'abord pour le HTML/CSS/JS)
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
