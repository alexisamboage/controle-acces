// Personnes présentes à l'entraînement mais absentes de la liste :
// formulaire, email à l'administration, écran « Non-inscrits » et export Excel.

const dialogueNonInscrit = document.getElementById('dialogue-non-inscrit');
const formNonInscrit = document.getElementById('form-non-inscrit');
const zoneEnregistre = document.getElementById('non-inscrit-enregistre');
let ficheEnCours = null; // la personne qui vient d'être notée

function dateCourte(iso) { return new Date(iso).toLocaleDateString('fr-CH'); }
function heureCourte(iso) { return new Date(iso).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }); }

// ---------- Formulaire ----------
function ouvrirFormulaireNonInscrit(saisie) {
  formNonInscrit.reset();
  formNonInscrit.elements.nomPrenom.value = majusculeInitiale(nettoyer(saisie).toLowerCase());
  formNonInscrit.hidden = false;
  zoneEnregistre.hidden = true;
  dialogueNonInscrit.showModal();
  formNonInscrit.elements.telephone.focus();
}

document.getElementById('annuler-non-inscrit').addEventListener('click', () => dialogueNonInscrit.close());

formNonInscrit.addEventListener('submit', async e => {
  e.preventDefault();
  const champs = formNonInscrit.elements;
  const fiche = {
    date: new Date().toISOString(),
    nomPrenom: nettoyer(champs.nomPrenom.value),
    telephone: nettoyer(champs.telephone.value),
    raison: champs.raison.value || '',
    remarque: nettoyer(champs.remarque.value),
    clubCours: profil?.club || '',
    emailPrepare: false
  };
  fiche.id = await enregistrerNonInscrit(fiche);
  ficheEnCours = fiche;

  document.getElementById('enregistre-nom').textContent = fiche.nomPrenom;
  document.getElementById('enregistre-infos').textContent =
    `Le ${dateCourte(fiche.date)} à ${heureCourte(fiche.date)}` + (fiche.clubCours ? ` au club ${fiche.clubCours}` : '');
  document.getElementById('enregistre-message').replaceChildren();
  formNonInscrit.hidden = true;
  zoneEnregistre.hidden = false;
  afficherNonInscrits();
});

document.getElementById('bouton-prevenir').addEventListener('click', () => {
  prevenirAdministration(ficheEnCours, document.getElementById('enregistre-message'));
});

document.getElementById('bouton-terminer').addEventListener('click', () => {
  dialogueNonInscrit.close();
  champRecherche.value = '';
  lancerRecherche();
  champRecherche.focus();
});

// ---------- Email à l'administration ----------
// Ouvre l'application email du téléphone avec le message déjà rempli.
// C'est le prof qui appuie sur « Envoyer ». Sans réseau, l'email part plus tard.
function prevenirAdministration(fiche, zoneMessage) {
  if (!profil?.emailAdmin) {
    afficherMessage(zoneMessage, 'alerte', 'Ajoute d\'abord l\'email de l\'administration dans Réglages.');
    return;
  }
  location.href = lienEmail(fiche);
  fiche.emailPrepare = true;
  enregistrerNonInscrit(fiche).then(afficherNonInscrits);
}

function lienEmail(fiche) {
  const date = dateCourte(fiche.date);
  const lignes = [
    'Bonjour,',
    '',
    `Lors du cours du ${date} à ${heureCourte(fiche.date)}` + (fiche.clubCours ? ` au club ${fiche.clubCours}` : '') +
      ', la personne suivante s\'est entraînée mais ne figure pas dans la liste des inscrits :',
    '',
    `- Nom et prénom : ${fiche.nomPrenom}`
  ];
  if (fiche.telephone) lignes.push(`- Téléphone : ${fiche.telephone}`);
  if (fiche.raison) lignes.push(`- Raison : ${fiche.raison}`);
  if (fiche.remarque) lignes.push(`- Remarque : ${fiche.remarque}`);
  lignes.push(
    '',
    'Pouvez-vous vérifier s\'il s\'agit d\'un oubli dans le fichier ? Si ce n\'est pas le cas, nous prendrons les mesures nécessaires.',
    '',
    'Merci et bonne journée,'
  );
  if (profil.prenom) lignes.push(profil.prenom);

  const objet = `Vérification inscription – ${fiche.nomPrenom} – ${date}`;
  return `mailto:${profil.emailAdmin}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(lignes.join('\r\n'))}`;
}

// ---------- Écran « Non-inscrits » ----------
async function afficherNonInscrits() {
  const liste = (await tousLesNonInscrits()).sort((a, b) => b.date.localeCompare(a.date));
  const ul = document.getElementById('liste-non-inscrits');
  ul.replaceChildren();
  document.getElementById('non-inscrits-vide').hidden = liste.length > 0;
  document.getElementById('actions-non-inscrits').hidden = liste.length === 0;

  const onglet = document.querySelector('[data-ecran="ecran-non-inscrits"]');
  onglet.dataset.compte = liste.length || '';

  liste.forEach(fiche => {
    const li = document.createElement('li');
    li.className = 'carte carte-non-inscrit';

    const nom = document.createElement('p');
    nom.className = 'non-inscrit-nom';
    nom.textContent = fiche.nomPrenom;

    const quand = document.createElement('p');
    quand.className = 'petit';
    quand.textContent = `${dateCourte(fiche.date)} à ${heureCourte(fiche.date)}` + (fiche.clubCours ? ` · ${fiche.clubCours}` : '');
    li.append(nom, quand);

    const details = [fiche.raison, fiche.telephone && '📞 ' + fiche.telephone, fiche.remarque].filter(Boolean);
    if (details.length) {
      const p = document.createElement('p');
      p.className = 'non-inscrit-details';
      p.textContent = details.join(' · ');
      li.append(p);
    }

    const actions = document.createElement('div');
    actions.className = 'non-inscrit-actions';
    const message = document.createElement('div');
    const prevenir = document.createElement('button');
    prevenir.type = 'button';
    prevenir.className = fiche.emailPrepare ? 'petit-bouton fait' : 'petit-bouton';
    prevenir.textContent = fiche.emailPrepare ? '✉ Email préparé' : '✉ Prévenir';
    prevenir.addEventListener('click', () => prevenirAdministration(fiche, message));
    const supprimer = document.createElement('button');
    supprimer.type = 'button';
    supprimer.className = 'petit-bouton discret';
    supprimer.textContent = 'Supprimer';
    supprimer.addEventListener('click', async () => {
      if (!confirm(`Supprimer « ${fiche.nomPrenom} » de la liste des non-inscrits ?`)) return;
      await supprimerNonInscrit(fiche.id);
      afficherNonInscrits();
    });
    actions.append(prevenir, supprimer);
    li.append(actions, message);
    ul.append(li);
  });
}

document.getElementById('bouton-vider').addEventListener('click', async () => {
  if (!confirm('Vider toute la liste des non-inscrits ? Pense à l\'exporter avant si tu veux la garder.')) return;
  await viderNonInscrits();
  afficherNonInscrits();
});

// ---------- Export Excel ----------
// Crée le fichier et ouvre le menu « Partager » du téléphone (WhatsApp, email…)
document.getElementById('bouton-exporter').addEventListener('click', async () => {
  const liste = (await tousLesNonInscrits()).sort((a, b) => a.date.localeCompare(b.date));
  const lignes = liste.map(f => ({
    'Date': dateCourte(f.date),
    'Heure': heureCourte(f.date),
    'Nom et prénom': f.nomPrenom,
    'Téléphone': f.telephone,
    'Raison': f.raison,
    'Remarque': f.remarque,
    'Club du cours': f.clubCours,
    'Administration prévenue': f.emailPrepare ? 'Oui' : 'Non'
  }));
  const feuille = XLSX.utils.json_to_sheet(lignes);
  feuille['!cols'] = [{ wch: 11 }, { wch: 7 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 12 }];
  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, 'Non-inscrits');
  const aujourdhui = new Date().toISOString().slice(0, 10);
  partagerClasseur(classeur, `non-inscrits-${aujourdhui}.xlsx`, 'Non-inscrits');
});

async function partagerClasseur(classeur, nomFichier, titre) {
  const donnees = XLSX.write(classeur, { bookType: 'xlsx', type: 'array' });
  const fichier = new File([donnees], nomFichier, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: titre });
      return;
    } catch (erreur) {
      if (erreur.name === 'AbortError') return; // partage annulé
    }
  }
  // Sinon : téléchargement classique
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(fichier);
  lien.download = nomFichier;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(lien.href), 10000);
}
