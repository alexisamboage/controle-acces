// Lecture et nettoyage du fichier Excel des membres.
// Aucune donnée n'est envoyée nulle part : tout se passe dans le téléphone.
// Ne jamais afficher de nom dans la console (protection des données).

// « Roméo  » → « romeo » : minuscules, sans accents, sans ponctuation, espaces simples
function normaliser(texte) {
  return String(texte ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Retire les espaces en trop au début, à la fin et au milieu
function nettoyer(texte) {
  return String(texte ?? '').replace(/\s+/g, ' ').trim();
}

// « léa » ou « LÉA » → « Léa » ; « jean-marc » → « Jean-Marc »
function majusculeInitiale(texte) {
  if (texte !== texte.toLowerCase() && texte !== texte.toUpperCase()) return texte;
  return texte.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, sep, lettre) => sep + lettre.toUpperCase());
}

// Colonnes reconnues, repérées par le nom de l'en-tête (pas par la position)
const COLONNES = {
  nom: t => t === 'nom' || t === 'nom de famille',
  prenom: t => t === 'prenom' || t === 'prenoms',
  naissance: t => t.includes('naissance') || t === 'annee' || t === 'ne le',
  telephone: t => /^(tel|telephone|portable|natel|mobile)\b/.test(t),
  email: t => t === 'email' || t === 'e mail' || t === 'mail' || t === 'courriel' || t === 'adresse email',
  club: t => t.includes('club')
};

function reperesColonnes(ligne) {
  const reperes = {};
  ligne.forEach((cellule, i) => {
    const t = normaliser(cellule);
    for (const [cle, correspond] of Object.entries(COLONNES)) {
      if (reperes[cle] === undefined && correspond(t)) { reperes[cle] = i; break; }
    }
  });
  return reperes;
}

// Année de naissance à partir d'une vraie date Excel, d'un texte « 05.11.2009 » ou d'une année seule
function anneeNaissance(valeur) {
  if (valeur === '' || valeur == null) return '';
  if (typeof valeur === 'number') {
    if (valeur >= 1900 && valeur <= 2100) return String(Math.trunc(valeur));
    const date = XLSX.SSF.parse_date_code(valeur);
    return date && date.y >= 1900 ? String(date.y) : '';
  }
  if (valeur instanceof Date) return String(valeur.getFullYear());
  const texte = String(valeur);
  const quatreChiffres = texte.match(/\b(19|20)\d{2}\b/);
  if (quatreChiffres) return quatreChiffres[0];
  const court = texte.match(/^\s*\d{1,2}[./-]\d{1,2}[./-](\d{2})\s*$/);
  if (court) {
    const aa = Number(court[1]);
    const siecle = aa > new Date().getFullYear() % 100 ? 1900 : 2000;
    return String(siecle + aa);
  }
  return '';
}

// Identifiant stable d'un membre (pour les futurs QR codes) : le même depuis le
// fichier complet ou la liste allégée, et sur tous les téléphones.
function identifiantMembre(nom, prenom, annee, club) {
  const texte = [normaliser(nom), normaliser(prenom), annee, normaliser(club)].join('|');
  // Empreinte « cyrb53 » : courte, rapide, sans risque de doublon pour quelques milliers de membres
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < texte.length; i++) {
    const c = texte.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// Lit toutes les feuilles du classeur et renvoie { membres, resume }.
// Les lignes ignorées sont signalées par feuille et numéro de ligne, jamais par nom.
function analyserClasseur(classeur) {
  const membres = new Map();
  const resume = { parClub: {}, lignesVides: 0, ignorees: [], doublons: [], feuillesSansEntete: [] };

  for (const nomFeuille of classeur.SheetNames) {
    const lignes = XLSX.utils.sheet_to_json(classeur.Sheets[nomFeuille], { header: 1, raw: true, defval: '', blankrows: true });

    // L'en-tête est en ligne 1 normalement ; on tolère quelques lignes de titre au-dessus
    let indexEntete = -1, reperes = {};
    for (let i = 0; i < Math.min(lignes.length, 10); i++) {
      reperes = reperesColonnes(lignes[i]);
      if (reperes.nom !== undefined && reperes.prenom !== undefined) { indexEntete = i; break; }
    }
    if (indexEntete === -1) {
      if (lignes.some(l => l.some(c => nettoyer(c) !== ''))) resume.feuillesSansEntete.push(nomFeuille);
      continue;
    }

    for (let i = indexEntete + 1; i < lignes.length; i++) {
      const ligne = lignes[i];
      const numero = i + 1; // numéro de ligne tel qu'affiché dans Excel
      const lire = cle => reperes[cle] === undefined ? '' : ligne[reperes[cle]];

      if (ligne.every(c => nettoyer(c) === '')) { resume.lignesVides++; continue; }

      const nom = nettoyer(lire('nom')).toUpperCase();
      const prenom = majusculeInitiale(nettoyer(lire('prenom')));
      if (!nom && !prenom) {
        resume.ignorees.push({ feuille: nomFeuille, ligne: numero, raison: 'nom et prénom manquants' });
        continue;
      }

      const club = (nettoyer(lire('club')) || nettoyer(nomFeuille)).toUpperCase();
      const annee = anneeNaissance(lire('naissance'));
      const id = identifiantMembre(nom, prenom, annee, club);

      if (membres.has(id)) {
        resume.doublons.push({ feuille: nomFeuille, ligne: numero });
        continue;
      }
      membres.set(id, {
        id, nom, prenom, annee, club,
        telephone: nettoyer(lire('telephone')),
        email: nettoyer(lire('email')),
        recherche: normaliser(nom + ' ' + prenom)
      });
      resume.parClub[club] = (resume.parClub[club] || 0) + 1;
    }
  }

  resume.total = membres.size;
  return { membres: [...membres.values()], resume };
}
