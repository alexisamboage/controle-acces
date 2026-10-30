// Réglages propres à ce téléphone : club où l'on donne le cours, prénom du prof,
// email de l'administration. Rien n'est écrit en dur : chaque club partenaire
// peut utiliser l'app avec ses propres réglages.

let profil = null; // { club, prenom, emailAdmin }

const formReglages = document.getElementById('form-reglages');
const formBienvenue = document.getElementById('form-bienvenue');
const dialogueBienvenue = document.getElementById('bienvenue');

// Gros boutons avec les clubs trouvés dans le fichier ; un toucher remplit le champ
function afficherChoixClubs(formulaire, clubs) {
  const zone = formulaire.querySelector('.choix-clubs');
  const champ = formulaire.elements.club;
  zone.replaceChildren();
  [...clubs].sort().forEach(club => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'puce-club';
    bouton.textContent = club;
    bouton.style.setProperty('--couleur-club', couleursClubs[club] || '#9a938c');
    bouton.setAttribute('aria-pressed', String(champ.value === club));
    bouton.addEventListener('click', () => {
      champ.value = club;
      majPucesActives(formulaire);
    });
    zone.append(bouton);
  });
  zone.hidden = clubs.length === 0;
}

function majPucesActives(formulaire) {
  const valeur = formulaire.elements.club.value.trim().toUpperCase();
  formulaire.querySelectorAll('.puce-club').forEach(p => p.setAttribute('aria-pressed', String(p.textContent === valeur)));
}

function remplirFormulaire(formulaire) {
  formulaire.elements.club.value = profil?.club || '';
  formulaire.elements.prenom.value = profil?.prenom || '';
  formulaire.elements.emailAdmin.value = profil?.emailAdmin || '';
  majPucesActives(formulaire);
}

function lireFormulaire(formulaire) {
  return {
    club: nettoyer(formulaire.elements.club.value).toUpperCase(),
    prenom: nettoyer(formulaire.elements.prenom.value),
    emailAdmin: nettoyer(formulaire.elements.emailAdmin.value)
  };
}

async function enregistrerProfil(nouveau) {
  profil = nouveau;
  await ecrireReglage('profil', profil);
}

[formReglages, formBienvenue].forEach(f => f.elements.club.addEventListener('input', () => majPucesActives(f)));

formReglages.addEventListener('submit', async e => {
  e.preventDefault();
  await enregistrerProfil(lireFormulaire(formReglages));
  const ok = formReglages.querySelector('.confirmation');
  ok.hidden = false;
  setTimeout(() => { ok.hidden = true; }, 2500);
});

formBienvenue.addEventListener('submit', async e => {
  e.preventDefault();
  await enregistrerProfil(lireFormulaire(formBienvenue));
  remplirFormulaire(formReglages);
  dialogueBienvenue.close();
  champRecherche.focus();
});

// La question du premier lancement ne peut pas être ignorée
dialogueBienvenue.addEventListener('cancel', e => e.preventDefault());

// Charge les réglages ; pose la question de bienvenue si une liste existe mais pas encore de réglages
async function chargerReglages(clubs) {
  profil = (await lireReglage('profil')) || null;
  afficherChoixClubs(formReglages, clubs);
  afficherChoixClubs(formBienvenue, clubs);
  remplirFormulaire(formReglages);
  if (!profil && clubs.length && !dialogueBienvenue.open) {
    remplirFormulaire(formBienvenue);
    dialogueBienvenue.showModal();
  }
}
