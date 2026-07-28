/* ============================================================================
   montants.js — le formatage de l'argent
   Écrite le 28/07/2026.

   POURQUOI CETTE SUITE EXISTE
   La colonne « CA total » de la liste des clients affichait 3840,00 € et
   11260,00 € — sans séparateur de milliers, donc illisibles d'un coup d'œil.

   La cause n'était ni le code ni le CSS : toLocaleString("fr-FR") produit
   bien un séparateur, mais c'est U+202F, une ESPACE FINE INSÉCABLE. Les
   montants sont affichés en Sora, et cette police ne contient pas ce
   caractère : le navigateur n'affiche rien du tout. Le séparateur était là,
   simplement invisible.

   On le remplace par U+00A0, l'espace insécable ordinaire, que Sora possède.

   Lancement : node tests/montants.js   (depuis la racine du dépôt)
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

console.log("\nformatage des montants\n");

/* ===== 1. LE COMPORTEMENT ATTENDU ================================== */
/* On rejoue la formule telle qu'elle est écrite dans les pages. */
const eur = n => n.toLocaleString("fr-FR", {minimumFractionDigits:2, maximumFractionDigits:2})
                  .replace(/\u202f/g, "\u00a0") + "\u00a0\u20AC";

t("mille et plus reçoit un séparateur visible",
  eur(3840) === "3\u00a0840,00\u00a0€", "obtenu : " + JSON.stringify(eur(3840)));
t("les dizaines de milliers aussi",
  eur(11260) === "11\u00a0260,00\u00a0€", "obtenu : " + JSON.stringify(eur(11260)));
t("un montant nul reste simple",
  eur(0) === "0,00\u00a0€", "obtenu : " + JSON.stringify(eur(0)));
t("plus aucune espace fine U+202F en sortie",
  !eur(1234567).includes("\u202f"),
  "Sora ne dessine pas ce caractère : le séparateur devient invisible");
t("le séparateur est bien insécable",
  eur(3840).includes("\u00a0"),
  "une espace ordinaire laisserait le nombre se couper en fin de ligne");

/* ===== 2. TOUTES LES PAGES SONT TRAITÉES ========================== */
/* Une page oubliée, et une seule colonne du logiciel affiche des milliers
   collés : c'est exactement ce qu'on vient de corriger. */
const formatent = PAGES.filter(f => /toLocaleString\((["'])fr-FR\1/.test(lire(f)));
const oubliees = formatent.filter(f => {
  const src = lire(f);
  const appels = [...src.matchAll(/\.toLocaleString\((["'])fr-FR\1(\s*,\s*\{[^}]*\})?\)/g)];
  return appels.some(m => !src.slice(m.index, m.index + m[0].length + 34).includes("u202f"));
});
t("les " + formatent.length + " pages qui formatent de l'argent sont toutes traitées",
  oubliees.length === 0, "oubliées : " + oubliees.join(", "));

/* ===== 3. L'ALIGNEMENT DE LA COLONNE ============================== */
/* Des chiffres à largeur variable font onduler une colonne de montants.
   tabular-nums leur donne à tous la même largeur. */
["clients.html", "devis-liste.html", "facture-liste.html", "contrats-liste.html"].forEach(f => {
  const src = lire(f);
  t(f + " aligne ses montants à droite",
    /\.amt\{[^}]*text-align:right|td\.amt\{[^}]*text-align:right/.test(src));
  t(f + " emploie des chiffres à largeur fixe",
    /\.amt[^{]*\{[^}]*tabular-nums|td, *\.amt[^{]*\{[^}]*tabular-nums/.test(src),
    "sans tabular-nums la colonne ondule");
});

/* ===== 4. RÈGLE DU PROJET ========================================= */
/* fin2.js : espace insécable avant l'euro. Le correctif ne doit pas l'avoir
   cassée au passage. */
/* Le critere ne vise QUE l'espace ordinaire. Un premier jet signalait onze
   pages a tort : le « ; » de &nbsp;€, les parentheses de « CA total (€) », et
   des € dans des chaines ou des expressions regulieres. Un test qui crie au
   loup sur des cas corrects apprend a ignorer sa sortie. */
const fautives = PAGES.filter(f => /[ ]€/.test(lire(f)));
t("l'espace avant l'euro reste insécable partout",
  fautives.length === 0, "à vérifier : " + fautives.join(", "));

console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
process.exit(ko ? 1 : 0);
