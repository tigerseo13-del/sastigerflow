/* ============================================================================
   vocab.js — le vocabulaire du matériel
   Écrite le 28/07/2026, décision du patron.

   POURQUOI CETTE SUITE EXISTE
   Le logiciel employait cinq formulations pour quatre idées. Les deux pires
   étaient « Matériel à apporter » (création de contrat) et « Matériel à
   emporter » (fiche contrat) : la MÊME liste, écrite de deux façons selon la
   page. L'utilisateur ne peut pas savoir s'il s'agit de deux choses
   distinctes. Et « Équipements embarqués » venait du vocabulaire maritime.

   Quatre idées, quatre mots, aucun recouvrement :
     Matériel du véhicule   — ce qui reste à bord en permanence
     Matériel à emporter    — ce qu'on prend en plus pour ce contrat
     Matériel utilisé       — ce qui a servi sur place
     Équipements installés  — ce qui reste chez le client

   Lancement : node tests/vocab.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");
const PAGES = fs.readdirSync(RACINE).filter(f => f.endsWith(".html"));
const lire = f => fs.readFileSync(path.join(RACINE, f), "utf8");

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

/* Chaque terme, et les pages qui doivent le porter. */
const ATTENDU = [
  ["Matériel du véhicule",  ["technicien.html", "techniciens.html"]],
  ["Matériel à emporter",   ["contrat.html", "contrat-nouveau.html"]],
  ["Matériel utilisé",      ["calendrier.html", "tech-mobile.html"]],
  ["Équipements installés", ["client.html"]],
];

/* Les tournures écartées. Elles ne doivent revenir nulle part — c'est ce test
   qui rattrapera un copier-coller depuis une vieille page. */
const BANNIS = [
  ["embarqu",              "vocabulaire maritime, écarté le 28/07"],
  ["Matériel à apporter",  "doublon de « Matériel à emporter »"],
  ["Materiel a apporter",  "idem, sans accents"],
];

console.log("\nvocabulaire du matériel\n");

ATTENDU.forEach(([terme, pages]) => {
  const trouve = PAGES.filter(f => lire(f).includes(terme));
  const manquantes = pages.filter(p => !trouve.includes(p));
  t("« " + terme + " » est sur " + pages.join(" et "),
    manquantes.length === 0, "absent de : " + manquantes.join(", "));
});

/* par.js : une liste métier modifiée doit l'être dans calendrier.html ET
   tech-mobile.html. Le technicien mobile lit le même mot que le bureau. */
t("« Matériel utilisé » est identique côté bureau et côté mobile",
  lire("calendrier.html").includes("Matériel utilisé") &&
  lire("tech-mobile.html").includes("Matériel utilisé"));

BANNIS.forEach(([mot, raison]) => {
  const fautives = PAGES.filter(f => lire(f).includes(mot));
  t("« " + mot + " » n'apparaît plus nulle part",
    fautives.length === 0, raison + " — encore dans : " + fautives.join(", "));
});

/* Les quatre termes doivent rester DISTINCTS : si deux pages de familles
   différentes portaient le même mot, on retomberait dans la confusion qu'on
   vient de retirer. */
const paires = [];
ATTENDU.forEach(([a], i) => ATTENDU.slice(i + 1).forEach(([b]) => {
  if (a === b) paires.push(a + " / " + b);
}));
t("les quatre termes sont bien distincts les uns des autres", paires.length === 0, paires.join(" | "));

/* ===== LES PUCES DE COMPÉTENCE DU TABLEAU ========================== */
/* 28/07 — elles heritaient du style du panneau d'edition, declare plus bas et
   donc gagnant : bordure, gros calage, curseur main. Deux fois trop grosses,
   elles debordaient sur quatre lignes et chaque technicien avait une hauteur
   de ligne differente. */
const tech = lire("techniciens.html");
t("le tableau impose le style de SES puces",
  /\.skwrap \.skc\{/.test(tech),
  "sans cette regle elles reprennent celle du panneau d'edition");
t("les puces du tableau n'ont ni bordure ni curseur main",
  /\.skwrap \.skc\{border:0[^}]*cursor:default/.test(tech));
/* 28/07 (choix patron) : TOUTES les competences s'affichent. Une premiere
   version en montrait trois avec un compteur — plus regulier, mais il fallait
   survoler pour savoir ce que le technicien sait faire. */
t("le tableau affiche toutes les compétences",
  !/sk\.slice\(0, 3\)/.test(tech) && /sk\.map\(x =>/.test(tech),
  "elles sont tronquées à trois");
t("aucun compteur ne masque de compétence",
  !/skmore/.test(tech.replace(/\/\*[\s\S]*?\*\//g, "")),
  "un « +2 » oblige à survoler pour savoir");

console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
process.exit(ko ? 1 : 0);
