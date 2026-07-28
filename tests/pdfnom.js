/* ============================================================================
   pdfnom.js — le nom du fichier PDF d'un devis
   Écrite le 28/07/2026, décision du patron.

   POURQUOI CETTE SUITE EXISTE
   Le bouton PDF ouvre l'impression du navigateur, et le nom proposé pour le
   fichier est celui du TITRE DE LA PAGE. Tous les devis arrivaient donc dans
   le dossier de téléchargements sous « TigerFlow — Devis.pdf », impossibles à
   distinguer les uns des autres.

   Le nom voulu : numéro de devis, nom du client, montant.

   Les trois pages devis sont traitées — l'atelier, la fiche et la vue client.
   Une seule oubliée, et le devis téléchargé depuis celle-là reste anonyme.

   Lancement : node tests/pdfnom.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const RACINE = f => path.join(__dirname, "..", f);
const PAGES = ["devis.html", "devis-detail.html", "devis-client.html"];

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

console.log("\nnom du fichier PDF\n");

/* ===== 1. LES TROIS PAGES SONT TRAITÉES ============================== */
PAGES.forEach(f => {
  const src = fs.readFileSync(RACINE(f), "utf8");
  t(f + " nomme son PDF avant d'imprimer",
    /pdfImprimer\(/.test(src) && /function pdfNom/.test(src),
    "le fichier sortirait sous le titre de la page");

  /* Un window.print() nu remettrait le titre de la page comme nom. */
  t(f + " n'appelle plus window.print() a nu",
    !/onclick="window\.print\(\)"/.test(src),
    "un bouton court-circuite encore le nommage");
});

/* ===== 2. LE NOM PRODUIT ============================================ */
const pdfNom = new Function("return " +
  fs.readFileSync(RACINE("devis.html"), "utf8").match(/function pdfNom[\s\S]*?\n\}/)[0])();

t("le nom contient numero, client et montant",
  pdfNom("DEV-2026-27978", "tiger tiger", "330,00\u00a0€") === "DEV-2026-27978 - tiger tiger - 330,00 €",
  "obtenu : " + JSON.stringify(pdfNom("DEV-2026-27978", "tiger tiger", "330,00\u00a0€")));

/* L'espace insecable du montant devient une espace ordinaire, VOLONTAIREMENT :
   la regle du \u00a0 avant l'euro sert a empecher une coupure en fin de ligne
   a l'ecran. Dans un nom de fichier elle n'a aucun sens et rend le nom
   impossible a retaper ou a rechercher. */
t("l'espace insecable du montant devient une espace ordinaire",
  !pdfNom("DEV-1", "X", "330,00\u00a0€").includes("\u00a0"));

/* Un nom de client avec une barre oblique creerait un sous-dossier fantome
   ou ferait echouer l'enregistrement selon le systeme. */
t("les caracteres interdits dans un nom de fichier sont retires",
  !/[\\/:*?"<>|]/.test(pdfNom("DEV-1", 'Dupont / Fils : "Le Fournil"', "10,00\u00a0€")),
  "obtenu : " + JSON.stringify(pdfNom("DEV-1", 'Dupont / Fils : "Le Fournil"', "10,00\u00a0€")));

t("les espaces multiples sont resserres",
  pdfNom("DEV-1", "Syndic  Foncia   Lilas", "1,00\u00a0€") === "DEV-1 - Syndic Foncia Lilas - 1,00 €");

/* Un devis sans client encore choisi ne doit pas produire « DEV-1 -  - ». */
t("un champ vide ne laisse pas de tiret orphelin",
  pdfNom("DEV-2026-00007", "", "") === "DEV-2026-00007",
  "obtenu : " + JSON.stringify(pdfNom("DEV-2026-00007", "", "")));

/* ===== 3. LE TITRE DE L'ONGLET EST RENDU ========================== */
/* Sans restauration, l'onglet garderait le nom du fichier pour le reste de la
   session — et le PDF suivant sortirait sous le nom du precedent. */
PAGES.forEach(f => {
  const src = fs.readFileSync(RACINE(f), "utf8");
  const bloc = src.match(/function pdfImprimer[\s\S]*?\n\}/);
  t(f + " remet le titre de l'onglet apres impression",
    bloc && /document\.title = avant/.test(bloc[0]),
    "sinon le PDF suivant sortirait sous le nom du precedent");
});

console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
process.exit(ko ? 1 : 0);
