// Stockage dans le téléphone (IndexedDB). Rien ne quitte l'appareil.
//   membres     : la liste importée (remplacée entièrement à chaque import)
//   reglages    : date du dernier import, club du cours, etc. (clé → valeur)
//   nonInscrits : les personnes notées comme non inscrites (vidé à la main)
const BASE = 'controle-acces';

function ouvrirBase() {
  return new Promise((ok, echec) => {
    const demande = indexedDB.open(BASE, 2);
    demande.onupgradeneeded = () => {
      const base = demande.result;
      if (!base.objectStoreNames.contains('membres')) base.createObjectStore('membres', { keyPath: 'id' });
      if (!base.objectStoreNames.contains('reglages')) base.createObjectStore('reglages');
      if (!base.objectStoreNames.contains('nonInscrits')) base.createObjectStore('nonInscrits', { keyPath: 'id', autoIncrement: true });
    };
    demande.onsuccess = () => ok(demande.result);
    demande.onerror = () => echec(demande.error);
  });
}

const basePrete = ouvrirBase();

// Lance une opération et attend la fin de la transaction
async function transaction(magasins, mode, travail) {
  const base = await basePrete;
  return new Promise((ok, echec) => {
    const tx = base.transaction(magasins, mode);
    let resultat;
    Promise.resolve(travail(tx)).then(r => { resultat = r; });
    tx.oncomplete = () => ok(resultat);
    tx.onerror = () => echec(tx.error);
    tx.onabort = () => echec(tx.error);
  });
}

function enPromesse(demande) {
  return new Promise((ok, echec) => {
    demande.onsuccess = () => ok(demande.result);
    demande.onerror = () => echec(demande.error);
  });
}

// Remplace toute la liste des membres et enregistre le résumé de l'import, en une seule fois
function remplacerMembres(membres, infosImport) {
  return transaction(['membres', 'reglages'], 'readwrite', tx => {
    const magasin = tx.objectStore('membres');
    magasin.clear();
    membres.forEach(m => magasin.put(m));
    tx.objectStore('reglages').put(infosImport, 'import');
  });
}

function tousLesMembres() {
  return transaction(['membres'], 'readonly', tx => enPromesse(tx.objectStore('membres').getAll()));
}

function lireReglage(cle) {
  return transaction(['reglages'], 'readonly', tx => enPromesse(tx.objectStore('reglages').get(cle)));
}

function ecrireReglage(cle, valeur) {
  return transaction(['reglages'], 'readwrite', tx => { tx.objectStore('reglages').put(valeur, cle); });
}

// Ajoute ou met à jour une personne non inscrite ; renvoie son numéro
function enregistrerNonInscrit(fiche) {
  return transaction(['nonInscrits'], 'readwrite', tx => enPromesse(tx.objectStore('nonInscrits').put(fiche)));
}

function tousLesNonInscrits() {
  return transaction(['nonInscrits'], 'readonly', tx => enPromesse(tx.objectStore('nonInscrits').getAll()));
}

function supprimerNonInscrit(id) {
  return transaction(['nonInscrits'], 'readwrite', tx => { tx.objectStore('nonInscrits').delete(id); });
}

function viderNonInscrits() {
  return transaction(['nonInscrits'], 'readwrite', tx => { tx.objectStore('nonInscrits').clear(); });
}
