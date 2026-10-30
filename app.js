// Date de version, affichée dans « À propos ». À changer à chaque publication.
const VERSION = '2026-10-30';

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
