/* ============================================================================
   nav.js — l'entrée de menu qui dit « vous êtes ici »
   Écrite le 28/07/2026.

   POURQUOI CETTE SUITE EXISTE
   On enregistrait un devis, le résumé s'affichait bien — mais le menu latéral
   allumait « Factures ». devis-detail.html a été créée le 28/07 en clonant
   facture-detail.html, et son entrée active est partie avec le clone.
   Personne ne relit un menu ; on ne voit que la surbrillance au mauvais
   endroit, et on croit s'être trompé de page.

   Ce test compare, sur les 27 pages, l'entrée allumée à la famille de la page.
   Toute page clonée à l'avenir sera prise en flagrant délit.

   Lancement : node tests/nav.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

/* La page attend telle entrée de menu allumée.
   « # » est la convention des pages qui SONT une entrée du menu : leur propre
   lien ne mène nulle part et porte la surbrillance. Les autres pages allument
   l'entrée de leur famille, en gardant le lien cliquable. */
const ATTENDU = {
  "index.html":            "index.html",
  "calendrier.html":       "#",
  "clients.html":          "#",
  "client.html":           "clients.html",
  "client-nouveau.html":   "clients.html",
  "plan-appatage.html":    "clients.html",
  "devis-liste.html":      "#",
  "devis.html":            "devis-liste.html",
  "devis-detail.html":     "devis-liste.html",
  "contrats-liste.html":   "#",
  "contrat.html":          "contrats-liste.html",
  "contrat-nouveau.html":  "contrats-liste.html",
  "facture-liste.html":    "#",
  "facture.html":          "facture-liste.html",
  "facture-detail.html":   "facture-liste.html",
  "paiements.html":        "paiements.html",
  "taches.html":           "taches.html",
  "techniciens.html":      "#",
  "technicien.html":       "techniciens.html",
  "reglages.html":         "reglages.html",
};

/* Pages sans entrée allumée, en connaissance de cause : aucune entrée du menu
   ne leur correspond, et deviner serait pire que ne rien allumer. Elles sont
   listées ici pour que l'absence soit un CHOIX consigné, pas un oubli. */
const SANS_ENTREE = ["intervention-nouvelle.html", "rapports.html", "tournee.html"];

const actif = src => {
  const i = src.indexOf('class="sidebar"');
  if (i < 0) return null;                       /* page sans menu latéral */
  const seg = src.slice(i, i + 7000);
  const m = [...seg.matchAll(/<a href="([^"]+)"[^>]*class="[^"]*\bactive\b/g)].map(x => x[1]);
  return m;
};

console.log("\nentrée de menu « vous êtes ici »\n");

Object.entries(ATTENDU).forEach(([page, cible]) => {
  const p = path.join(RACINE, page);
  if (!fs.existsSync(p)) { t(page + " existe", false); return; }
  const m = actif(fs.readFileSync(p, "utf8"));
  if (m === null) { t(page + " a un menu latéral", false); return; }
  t(page.padEnd(22) + " allume « " + cible + " »",
    m.length === 1 && m[0] === cible,
    m.length === 0 ? "aucune entrée allumée"
      : m.length > 1 ? "plusieurs entrées allumées : " + m.join(", ")
      : "allume « " + m[0] + " »");
});

/* Le cas qui a motivé la suite, énoncé pour lui-même. */
const dd = fs.readFileSync(path.join(RACINE, "devis-detail.html"), "utf8");
t("la fiche devis n'allume PAS l'entrée Factures",
  !actif(dd).includes("facture-liste.html"),
  "c'était le bug : la page a été clonée de facture-detail.html");

SANS_ENTREE.forEach(page => {
  const m = actif(fs.readFileSync(path.join(RACINE, page), "utf8"));
  t(page.padEnd(22) + " n'allume rien, et c'est assumé",
    m !== null && m.length === 0,
    m && m.length ? "allume « " + m.join(", ") + " » : soit c'est juste et il faut " +
                    "l'inscrire dans ATTENDU, soit c'est un clone oublié" : "");
});

console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
process.exit(ko ? 1 : 0);
