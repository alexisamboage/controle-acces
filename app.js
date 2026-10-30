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

// ---------- Couleurs des clubs ----------
// Chaque club reçoit une couleur selon l'ordre alphabétique des clubs du fichier.
// Le vert et le rouge sont exclus : ils sont réservés à « inscrit » / « non trouvé ».
const PALETTE_CLUBS = ['#d4a72c', '#4c8dff', '#b67cff', '#22b8b0', '#ff8a3d', '#ff6fae', '#9fb0c8', '#c9b48a'];
let couleursClubs = {};

function definirCouleursClubs(clubs) {
  couleursClubs = {};
  [...clubs].sort().forEach((club, i) => { couleursClubs[club] = PALETTE_CLUBS[i % PALETTE_CLUBS.length]; });
}

function badgeClub(club) {
  const badge = document.createElement('span');
  badge.className = 'badge-club';
  badge.textContent = club;
  badge.style.setProperty('--couleur-club', couleursClubs[club] || '#9a938c');
  return badge;
}

// ---------- Écran Liste : import du fichier Excel ----------
const JOURS_AVANT_ALERTE = 30;
const boutonImporter = document.getElementById('bouton-importer');
const champFichier = document.getElementById('fichier');

boutonImporter.addEventListener('click', () => champFichier.click());
champFichier.addEventListener('change', () => {
  const fichier = champFichier.files[0];
  champFichier.value = ''; // permet de réimporter le même fichier
  if (fichier) importerFichier(fichier);
});

async function importerFichier(fichier) {
  const zoneResume = document.getElementById('resume-import');
  boutonImporter.disabled = true;
  boutonImporter.textContent = 'Import en cours…';
  zoneResume.replaceChildren();
  try {
    const classeur = XLSX.read(await fichier.arrayBuffer(), { type: 'array' });
    const { membres, resume } = analyserClasseur(classeur);
    if (membres.length === 0) {
      afficherMessage(zoneResume, 'alerte', 'Aucun membre trouvé dans ce fichier. Vérifie qu\'il contient des colonnes « Nom » et « Prénom ». La liste précédente est conservée.');
      return;
    }
    await remplacerMembres(membres, { date: new Date().toISOString(), fichier: fichier.name, total: resume.total, parClub: resume.parClub });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    afficherResumeImport(zoneResume, resume);
    await rafraichirEtat();
  } catch (erreur) {
    afficherMessage(zoneResume, 'alerte', 'Ce fichier n\'a pas pu être lu. Choisis un fichier Excel (.xlsx). La liste précédente est conservée.');
  } finally {
    boutonImporter.disabled = false;
    boutonImporter.textContent = 'Importer le fichier Excel';
  }
}

function afficherMessage(zone, type, texte) {
  const p = document.createElement('p');
  p.className = 'bandeau bandeau-' + type;
  p.textContent = texte;
  zone.replaceChildren(p);
}

// Résumé après import : membres par club, puis lignes ignorées et pourquoi
function afficherResumeImport(zone, resume) {
  const carte = document.createElement('div');
  carte.className = 'carte';
  const titre = document.createElement('p');
  titre.className = 'carte-titre';
  titre.textContent = `Import terminé : ${resume.total} membres`;
  carte.append(titre);

  const remarques = [];
  if (resume.lignesVides) remarques.push(`${resume.lignesVides} ligne${resume.lignesVides > 1 ? 's' : ''} vide${resume.lignesVides > 1 ? 's' : ''} ignorée${resume.lignesVides > 1 ? 's' : ''}`);
  resume.ignorees.forEach(l => remarques.push(`Ignorée : feuille ${l.feuille}, ligne ${l.ligne} (${l.raison})`));
  resume.doublons.forEach(l => remarques.push(`Doublon ignoré : feuille ${l.feuille}, ligne ${l.ligne}`));
  resume.feuillesSansEntete.forEach(f => remarques.push(`Feuille ${f} ignorée : colonnes « Nom » et « Prénom » introuvables`));

  if (remarques.length) {
    const liste = document.createElement('ul');
    liste.className = 'remarques';
    remarques.forEach(r => { const li = document.createElement('li'); li.textContent = r; liste.append(li); });
    carte.append(liste);
  } else {
    const ok = document.createElement('p');
    ok.className = 'petit';
    ok.textContent = 'Aucune ligne ignorée.';
    carte.append(ok);
  }
  zone.replaceChildren(carte);
}

// Met à jour l'écran Liste et l'accueil selon la liste enregistrée
async function rafraichirEtat() {
  const infos = await lireReglage('import');
  const zone = document.getElementById('etat-liste');
  zone.replaceChildren();
  document.getElementById('accueil-sans-liste').hidden = !!infos;
  document.getElementById('accueil-avec-liste').hidden = !infos;

  if (!infos) {
    afficherMessage(zone, 'info', 'Aucune liste importée. Importe le fichier Excel des membres pour commencer.');
    return;
  }

  definirCouleursClubs(Object.keys(infos.parClub));
  document.getElementById('accueil-compte').textContent = `${infos.total} membres dans la liste`;

  const date = new Date(infos.date);
  const jours = Math.floor((Date.now() - date) / 86400000);
  if (jours > JOURS_AVANT_ALERTE) {
    const alerte = document.createElement('p');
    alerte.className = 'bandeau bandeau-alerte';
    alerte.textContent = `La liste date de ${jours} jours. Importe le dernier fichier pour qu'elle soit à jour.`;
    zone.append(alerte);
  }

  const carte = document.createElement('div');
  carte.className = 'carte';
  const titre = document.createElement('p');
  titre.className = 'carte-titre';
  titre.textContent = `${infos.total} membres`;
  const quand = document.createElement('p');
  quand.className = 'petit';
  quand.textContent = 'Mise à jour le ' + date.toLocaleDateString('fr-CH') + ' à ' + date.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
  carte.append(titre, quand);

  const clubs = document.createElement('ul');
  clubs.className = 'liste-clubs';
  Object.keys(infos.parClub).sort().forEach(club => {
    const li = document.createElement('li');
    const nombre = document.createElement('span');
    nombre.textContent = infos.parClub[club];
    li.append(badgeClub(club), nombre);
    clubs.append(li);
  });
  carte.append(clubs);
  zone.append(carte);
}

rafraichirEtat();

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
