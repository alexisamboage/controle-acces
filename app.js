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
  listeImportee = !!infos;
  membres = infos ? (await tousLesMembres()).map(preparerMembre) : [];
  lancerRecherche();

  if (!infos) {
    afficherMessage(zone, 'info', 'Aucune liste importée. Importe le fichier Excel des membres pour commencer.');
    await chargerReglages([]);
    return;
  }

  definirCouleursClubs(Object.keys(infos.parClub));
  await chargerReglages(Object.keys(infos.parClub));
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

// ---------- Écran Contrôle : la recherche ----------
let membres = [];
let listeImportee = false;
const zoneResultats = document.getElementById('resultats');
const boutonEffacer = document.getElementById('effacer');

champRecherche.addEventListener('input', lancerRecherche);
boutonEffacer.addEventListener('click', () => {
  champRecherche.value = '';
  lancerRecherche();
  champRecherche.focus();
});
// La touche « Rechercher » du clavier ferme le clavier pour mieux voir le résultat
champRecherche.addEventListener('keydown', e => { if (e.key === 'Enter') champRecherche.blur(); });

function lancerRecherche() {
  const saisie = champRecherche.value;
  boutonEffacer.hidden = saisie === '';
  const reponse = listeImportee ? rechercher(membres, saisie) : null;

  document.getElementById('accueil-sans-liste').hidden = listeImportee;
  document.getElementById('accueil-avec-liste').hidden = !listeImportee || reponse !== null;
  zoneResultats.replaceChildren();
  if (!reponse) return;

  if (reponse.total > 0) afficherTrouves(reponse);
  else afficherNonTrouve(saisie);
}

// Vert : la ou les personnes trouvées
function afficherTrouves({ resultats, total }) {
  const entete = document.createElement('p');
  entete.className = 'entete-trouves';
  entete.textContent = total === 1 ? '✓ Inscrit' : `✓ ${total} inscrits trouvés`;
  zoneResultats.append(entete);
  if (total > resultats.length) {
    const plus = document.createElement('p');
    plus.className = 'petit';
    plus.textContent = `Les ${resultats.length} premiers sont affichés. Tape quelques lettres de plus.`;
    zoneResultats.append(plus);
  }
  zoneResultats.append(listeMembres(resultats, 'trouve'));
}

// Rouge : personne ne correspond
function afficherNonTrouve(saisie) {
  const bloc = document.createElement('div');
  bloc.className = 'non-trouve';
  bloc.innerHTML = `
    <div class="tampon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></div>
    <p class="non-trouve-titre">Non trouvé</p>
    <p class="non-trouve-sous-titre">À vérifier</p>
    <p class="non-trouve-saisie"></p>`;
  bloc.querySelector('.non-trouve-saisie').textContent = `« ${saisie.trim()} » n'est pas dans la liste.`;
  const noter = document.createElement('button');
  noter.type = 'button';
  noter.className = 'gros-bouton bouton-noter';
  noter.textContent = 'Noter comme non inscrit';
  noter.addEventListener('click', () => ouvrirFormulaireNonInscrit(saisie));
  bloc.append(noter);
  zoneResultats.append(bloc);

  const proches = nomsProches(membres, saisie);
  if (proches.length) {
    const titre = document.createElement('p');
    titre.className = 'titre-proches';
    titre.textContent = 'Noms proches ? Vérifie l\'orthographe.';
    zoneResultats.append(titre, listeMembres(proches, 'proche'));
  }
}

// Liste de membres : un gros bouton par personne, qui ouvre sa fiche
function listeMembres(liste, type) {
  const ul = document.createElement('ul');
  ul.className = 'liste-resultats';
  liste.forEach(m => {
    const li = document.createElement('li');
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'resultat resultat-' + type;

    const nom = document.createElement('span');
    nom.className = 'resultat-nom';
    const nomFamille = document.createElement('strong');
    nomFamille.textContent = m.nom;
    nom.append(nomFamille, ' ' + m.prenom);

    const infos = document.createElement('span');
    infos.className = 'resultat-infos';
    const annee = document.createElement('span');
    annee.textContent = m.annee || 'année ?';
    infos.append(badgeClub(m.club), annee);

    bouton.append(nom, infos);
    bouton.addEventListener('click', () => ouvrirFiche(m));
    li.append(bouton);
    ul.append(li);
  });
  return ul;
}

// ---------- Fiche d'un membre ----------
const fiche = document.getElementById('fiche');
document.getElementById('fiche-fermer').addEventListener('click', () => fiche.close());
fiche.addEventListener('click', e => { if (e.target === fiche) fiche.close(); });

function ouvrirFiche(m) {
  document.getElementById('fiche-nom').textContent = `${m.nom} ${m.prenom}`;

  const details = document.getElementById('fiche-details');
  const annee = document.createElement('span');
  annee.textContent = m.annee ? `Né(e) en ${m.annee}` : 'Année de naissance inconnue';
  details.replaceChildren(badgeClub(m.club), annee);

  const contacts = document.getElementById('fiche-contacts');
  contacts.replaceChildren();
  if (m.telephone) {
    const lien = document.createElement('a');
    lien.className = 'contact';
    lien.href = 'tel:' + m.telephone.replace(/[^\d+]/g, '');
    lien.textContent = '📞 ' + m.telephone;
    contacts.append(lien);
  }
  if (m.email) {
    const lien = document.createElement('a');
    lien.className = 'contact';
    lien.href = 'mailto:' + m.email;
    lien.textContent = '✉ ' + m.email;
    contacts.append(lien);
  }
  if (!m.telephone && !m.email) {
    const vide = document.createElement('p');
    vide.className = 'petit';
    vide.textContent = 'Pas de téléphone ni d\'email dans la liste.';
    contacts.append(vide);
  }
  fiche.showModal();
}

rafraichirEtat();
afficherNonInscrits();

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
