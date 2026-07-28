/* ============================================================================
   poids.js — le plafond de poids des pages
   Écrite le 28/07/2026.

   POURQUOI CETTE SUITE EXISTE
   Le plafond de 2 400 Ko était contrôlé par vite.js, l'une des 184 suites
   perdues ce matin avec le conteneur. Depuis, le chiffre était cité de mémoire
   et n'était appliqué par rien : on pouvait le dépasser sans qu'aucun signal ne
   se déclenche. C'est arrivé une fois dans la journée — la refonte de la
   recherche globale a porté le total à 2 400,3 Ko, découvert par hasard.

   PLAFOND RELEVÉ À 2 500 Ko, décision du patron le 28/07.
   La raison : à 2 397 Ko, l'ancien plafond ne laissait plus de quoi écrire une
   ligne. Le coût est réel — ces pages se chargent sur le téléphone d'un
   technicien en clientèle — mais 100 Ko de plus sur 2,4 Mo ne changent rien de
   perceptible. C'est un sursis, pas une solution : la vraie réponse est de
   sortir les blocs recopiés sur 22 pages dans des fichiers partagés.

   Ne pas relever ce plafond une seconde fois sans avoir tenté ce chantier.

   Lancement : node tests/poids.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");
const PLAFOND_KO = 2500;
const ALERTE_KO  = 2450;   /* on prévient avant de buter */

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

const pages = fs.readdirSync(RACINE).filter(f => f.endsWith(".html"));
const tailles = pages.map(f => ({ f, o: fs.statSync(path.join(RACINE, f)).size }))
                     .sort((a, b) => b.o - a.o);
const total = tailles.reduce((s, x) => s + x.o, 0);
const ko2 = o => (o / 1024).toFixed(1);

console.log("\npoids des pages\n");
console.log("  " + pages.length + " pages · " + ko2(total) + " Ko · plafond " + PLAFOND_KO + " Ko");
console.log("  marge : " + (PLAFOND_KO - total / 1024).toFixed(1) + " Ko\n");

t("le total reste sous le plafond de " + PLAFOND_KO + " Ko",
  total / 1024 <= PLAFOND_KO,
  "dépassement de " + (total / 1024 - PLAFOND_KO).toFixed(1) + " Ko — " +
  "relever le plafond n'est PAS la réponse par défaut, voir l'en-tête de ce fichier");

t("il reste de la marge pour travailler (seuil d'alerte " + ALERTE_KO + " Ko)",
  total / 1024 <= ALERTE_KO,
  "plus que " + (PLAFOND_KO - total / 1024).toFixed(1) + " Ko : le prochain ajout " +
  "de fond ne passera pas. Sortir les blocs partagés avant d'écrire.");

/* Une page seule qui enfle est plus facile à corriger qu'un total qui dérive :
   on la nomme tant qu'elle est isolable. */
const GROSSE_KO = 300;
const grosses = tailles.filter(x => x.o / 1024 > GROSSE_KO);
t("aucune page ne dépasse " + GROSSE_KO + " Ko à elle seule",
  grosses.length === 0,
  grosses.map(x => x.f + " (" + ko2(x.o) + " Ko)").join(", "));

console.log("\n  les cinq plus lourdes :");
tailles.slice(0, 5).forEach(x => console.log("    " + ko2(x.o).padStart(7) + " Ko  " + x.f));

console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
process.exit(ko ? 1 : 0);
