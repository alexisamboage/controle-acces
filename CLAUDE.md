# Contrôle d'accès Club Yamabushi

PWA hors ligne pour vérifier, pendant un entraînement, si une personne figure dans la liste des inscrits des clubs partenaires (GAMMA, LANCY, SERVETTE, d'autres peuvent s'ajouter). Contrôle d'accès uniquement : pas d'abonnements ni de paiements.

- En ligne : https://alexisamboage.github.io/controle-acces/ (GitHub Pages, branche `main`, racine)
- Utilisateur : Alexis, coach et gérant de GAMMA, **pas développeur**. Répondre en français, avancer par petites étapes, expliquer simplement et faire tester (ordinateur puis Samsung S22) avant de continuer.

## Règles impératives

- **Protection des données** (beaucoup de mineurs) : ne jamais lire, afficher, journaliser ni publier le vrai fichier Excel. `.gitignore` exclut `*.xlsx`, `*.xls`, `*.csv`. Tester uniquement avec `test/faux-membres.xlsx` ou `test/demo-membres.xlsx` (générés par les scripts `.ps1` du dossier `test`).
- **100 % hors ligne** : aucune dépendance CDN. Toute nouvelle ressource doit être copiée dans le projet **et** ajoutée à `FICHIERS` dans `sw.js`.
- **Aucun nom de club ou de personne en dur** : tout vient du fichier importé ou des réglages. L'email de l'administration est saisi dans les réglages (pas dans le code, qui est public).
- **À chaque publication, incrémenter `VERSION` dans `version.js`** : c'est ce qui déclenche la mise à jour automatique sur les téléphones (sans perte de données).
- Compatible Chrome Android **et** Safari iPhone.

## Organisation du code (HTML/CSS/JS simples, sans framework)

- `index.html` : écrans Contrôle, Non-inscrits, Liste, Réglages + dialogues (bienvenue, fiche membre, non-inscrit)
- `import.js` : lecture et nettoyage du classeur (colonnes repérées par en-tête normalisé, toutes les feuilles, club = colonne ou nom de feuille, colonne Statut ignorée), `identifiantMembre()` = empreinte stable de nom + prénom + année + club (pour de futurs QR codes)
- `db.js` : IndexedDB (`membres`, `reglages`, `nonInscrits`)
- `recherche.js` : recherche sans accents/casse/espaces/ordre, « noms proches » (distance d'édition)
- `reglages.js` : club du cours, prénom du prof, email de l'administration, question du premier lancement
- `non-inscrits.js` : formulaire, email `mailto:` prérempli, liste, export Excel, partage de fichier
- `app.js` : navigation, import, liste à partager (sans téléphone ni email), affichage des résultats, service worker
- `sw.js` + `version.js` : cache hors ligne et mises à jour ; `lib/` SheetJS 0.20.3 ; `polices/` Anton ; `images/` icônes (régénérables avec `outils/creer-icones.ps1`)

## Tester sur l'ordinateur

Pas de Node ni de Python sur ce PC. Servir le dossier avec un petit serveur PowerShell (`System.Net.HttpListener`) sur `http://localhost`, puis ouvrir la page. Le panneau navigateur intégré ne gère pas les service workers : pour vérifier le cache hors ligne, utiliser Edge sans fenêtre (`--headless=new --remote-debugging-port`) avec `test/verif-hors-ligne.html`.

## Publier

`git add -A`, `git commit`, `git push` (l'ordinateur est déjà connecté au compte GitHub `alexisamboage`). GitHub Pages met environ une minute à se mettre à jour : vérifier que `version.js` en ligne affiche la nouvelle version.

## Idées pour plus tard (non développées)

- Version 2 : QR code par membre (génération et scan hors ligne), à partir de l'identifiant stable existant.
- Suivi des abonnés et statistiques de fréquentation (ex. membres de Lancy ou Servette qui viennent à GAMMA).
- Synchronisation entre téléphones (aujourd'hui chaque téléphone est indépendant).
