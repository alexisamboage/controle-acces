// Recherche dans la liste des membres : insensible aux accents, aux majuscules,
// aux espaces et à l'ordre des mots (« axel agl » trouve « AGLIARDI Axel »).

const MAX_RESULTATS = 30;

// Prépare un membre pour la recherche (fait une seule fois après chargement)
function preparerMembre(membre) {
  const mots = membre.recherche.split(' ').filter(Boolean);
  // Nom puis prénom, et prénom puis nom, sans espaces : « martinromeo » et « romeomartin »
  const compact = mots.join('') + ' ' + normaliser(membre.prenom + ' ' + membre.nom).replace(/ /g, '');
  return { ...membre, mots, compact };
}

// Renvoie { resultats, total } : les membres qui contiennent tous les mots tapés
function rechercher(membres, saisie) {
  const morceaux = normaliser(saisie).split(' ').filter(Boolean);
  if (morceaux.join('').length < 2) return null;

  const trouves = [];
  for (const m of membres) {
    let score = 0;
    let ok = true;
    for (const morceau of morceaux) {
      if (!m.compact.includes(morceau)) { ok = false; break; }
      // Un mot qui commence par ce qui est tapé passe devant
      score += m.mots.some(mot => mot.startsWith(morceau)) ? 2 : 1;
    }
    if (ok) trouves.push({ m, score });
  }
  trouves.sort((a, b) => b.score - a.score || a.m.nom.localeCompare(b.m.nom, 'fr') || a.m.prenom.localeCompare(b.m.prenom, 'fr'));
  return { resultats: trouves.slice(0, MAX_RESULTATS).map(t => t.m), total: trouves.length };
}

// Distance entre deux mots (nombre de lettres à changer, ajouter ou enlever)
function distance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  let precedente = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const ligne = [i];
    for (let j = 1; j <= b.length; j++) {
      ligne[j] = Math.min(precedente[j] + 1, ligne[j - 1] + 1, precedente[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    precedente = ligne;
  }
  return precedente[b.length];
}

// « Noms proches ? » : membres dont le nom ressemble à ce qui est tapé
// (fautes de frappe, « Mohamed » / « Mohammed », etc.)
function nomsProches(membres, saisie, maximum = 5) {
  const morceaux = normaliser(saisie).split(' ').filter(m => m.length >= 3);
  if (!morceaux.length) return [];

  const candidats = [];
  for (const m of membres) {
    let total = 0;
    let ok = true;
    for (const morceau of morceaux) {
      const tolerance = morceau.length >= 6 ? 2 : 1;
      let meilleure = 99;
      for (const mot of m.mots) {
        meilleure = Math.min(meilleure, distance(morceau, mot), distance(morceau, mot.slice(0, morceau.length)));
      }
      if (meilleure > tolerance) { ok = false; break; }
      total += meilleure;
    }
    if (ok) candidats.push({ m, total });
  }
  candidats.sort((a, b) => a.total - b.total || a.m.nom.localeCompare(b.m.nom, 'fr'));
  return candidats.slice(0, maximum).map(c => c.m);
}
