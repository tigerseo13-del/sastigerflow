/* ============================================================================
   facstat.js — un mot par état de facture
   Écrite le 28/07/2026, décision du patron.

   POURQUOI CETTE SUITE EXISTE
   Le logiciel avait DEUX mots pour un seul état : « Brouillon » et
   « Pro forma ». Or une facture non validée EST une pro forma — c'est ce que
   dit le panneau de validation lui-même. Les deux mots se mélangeaient selon
   l'écran, d'où des « Brouillon » affichés à côté d'un « envoyé le 28/07 ».
   Impossible de s'y retrouver.

   Un mot par état :
     Pro forma            — pas validée, modifiable, ne vaut pas facture
     À payer              — validée et envoyée, pas encore soldée
     Partiellement payée  — un acompte est tombé
     Payée                — solde à zéro

   « En retard » n'est plus un statut : c'est « À payer » + échéance dépassée,
   calculé par effStatut(). Un état qu'on ne choisit jamais n'a rien à faire
   dans un menu de choix.

   Les CLÉS internes ne changent pas : les factures déjà enregistrées
   continuent de s'afficher. Seuls les libellés changent.

   Lancement : node tests/facstat.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const RACINE = f => path.join(__dirname, "..", f);
const PAGES = ["facture.html", "facture-liste.html", "facture-detail.html"];

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

/* On ne juge que ce qui s'AFFICHE : les clés internes et les commentaires
   contiennent encore « brouillon », c'est voulu. */
const visible = f => {
  let s = fs.readFileSync(RACINE(f), "utf8");
  s = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "");
  return s;
};

console.log("\nvocabulaire des statuts de facture\n");

/* ===== 1. LES MOTS ÉCARTÉS ========================================== */
const PERIMES = [
  [/>\s*Brouillon|"Brouillon"|Brouillon\s*</, "« Brouillon » — une facture non validée est une pro forma"],
  [/"En attente"|>\s*En attente\s*</, "« En attente » — dit « À payer », qui nomme l'action"],
  [/"Partielle"/, "« Partielle » — dit « Partiellement payée »"],
];
PAGES.forEach(f => {
  const s = visible(f);
  const restants = PERIMES.filter(([re]) => re.test(s));
  t(f + " n'affiche plus de libellé périmé",
    restants.length === 0, restants.map(x => x[1]).join(" | "));
});

/* ===== 2. LES MOTS RETENUS ========================================== */
t("la liste affiche « Pro forma » et « À payer »",
  /Pro forma/.test(visible("facture-liste.html")) && /À payer/.test(visible("facture-liste.html")));
t("la fiche affiche « Pro forma », « À payer » et « Partiellement payée »",
  ["Pro forma", "À payer", "Partiellement payée"].every(m => visible("facture-detail.html").includes(m)));
t("l'atelier affiche « Pro forma » sur sa pastille",
  /dstatb2[^>]*>[^<]*<i><\/i>Pro forma/.test(visible("facture.html")));

/* ===== 3. « EN RETARD » N'EST PLUS UN CHOIX ======================== */
/* C'est le point qui compte : un statut qu'on ne choisit jamais encombrait le
   menu, et laissait croire qu'on pouvait declarer un retard a la main. */
t("« En retard » a quitté le menu de statut",
  !/data-s="retard"/.test(visible("facture.html")),
  "il reste proposé comme un choix");
t("mais il est toujours calculé sur la fiche",
  /st === "attente" && j !== null && j < 0\) return "retard"/.test(fs.readFileSync(RACINE("facture-detail.html"), "utf8")),
  "le retard automatique a disparu avec le menu");
t("et il garde son libellé pour l'affichage",
  /retard:.*En retard/.test(fs.readFileSync(RACINE("facture-detail.html"), "utf8")));

/* ===== 4. LES CLÉS INTERNES SONT INTACTES ========================== */
/* Renommer les cles aurait rendu illisibles toutes les factures deja
   enregistrees : leur statut est stocke sous l'ancien nom. */
["brouillon", "attente", "payee", "retard"].forEach(k => {
  t("la clé interne « " + k + " » est conservée",
    new RegExp('"' + k + '"|' + k + ':').test(fs.readFileSync(RACINE("facture-detail.html"), "utf8")),
    "les factures déjà enregistrées ne s'afficheraient plus");
});

/* ===== 5. LES DEUX CLÉS MÈNENT AU MÊME MOT ======================== */
/* C'est la fusion, vue de l'ecran : qu'une facture porte « brouillon » ou
   « proforma », elle affiche « Pro forma ». */
const det = fs.readFileSync(RACINE("facture-detail.html"), "utf8");
const stl = det.slice(det.indexOf("const STL"), det.indexOf("};", det.indexOf("const STL")));
t("les clés « brouillon » et « proforma » affichent le même mot",
  (stl.match(/"Pro forma"/g) || []).length >= 2,
  "une facture enregistrée sous l'une des deux clés afficherait autre chose");

/* ===== 6. LE DEVIS N'EST PAS TOUCHÉ ================================ */
/* Un devis a bien un brouillon : c'est un document commercial, pas une piece
   comptable. Le renommage ne devait concerner que les factures. */
t("les devis gardent leur « Brouillon »",
  /Brouillon/.test(fs.readFileSync(RACINE("devis-detail.html"), "utf8")),
  "le renommage a débordé sur les devis");

console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
process.exit(ko ? 1 : 0);
