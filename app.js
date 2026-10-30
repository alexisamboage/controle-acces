document.getElementById('version').textContent = VERSION;

const champRecherche = document.getElementById('recherche');

// Passe d'un écran à l'autre quand on touche un onglet
function afficherEcran(id) {
  document.querySelectorAll('.ecran').forEach(e => e.classList.toggle('actif', e.id === id));
  document.querySelectorAll('.onglet').forEach(o => o.classList.toggle('actif', o.dataset.ecran === id));
  if (id === 'ecran-controle') champRecherche.focus();
}

document.querySelectorAll('.onglet').forEach(onglet => {
  onglet.addEventListener('click', () => afficherEcran(onglet.dataset.ecran));
});

// Boutons qui mènent vers un autre écran (ex. « Importer la liste »)
document.querySelectorAll('[data-aller]').forEach(bouton => {
  bouton.addEventListener('click', () => afficherEcran(bouton.dataset.aller));
});

// Focus automatique sur la recherche à l'ouverture
champRecherche.focus();

// Mode hors ligne + mise à jour automatique.
// Quand une nouvelle version est publiée, le téléphone la télécharge dès qu'il
// a du réseau, puis l'app se recharge toute seule (les données sont conservées).
if ('serviceWorker' in navigator) {
  const dejaControlee = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (dejaControlee) location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(enregistrement => {
    // Vérifie s'il y a une nouvelle version à chaque retour dans l'app
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') enregistrement.update().catch(() => {});
    });
  });
}
