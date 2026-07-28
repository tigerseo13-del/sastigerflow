/* ============================================================================
   contnouv.js — contrat-nouveau.html
   Écrite le 28/07/2026, après la remise à plat de la mise en page.

   POURQUOI CETTE SUITE EXISTE
   La page affichait deux étapes en grille 2 colonnes et deux étapes hors
   grille, sur le même écran. La cause n'était PAS le CSS : chacune des trois
   cartes repliables portait une balise de fermeture en trop, qui refermait le
   conteneur `.col` avant les étapes 3 et 4. Le navigateur corrige tout seul
   et n'affiche aucune erreur — seul l'arbre DOM le dit. D'où le test 1, qui
   est le seul qui aurait attrapé ce bug.

   Lancement : node tests/contnouv.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const PAGE = path.join(__dirname, "..", "contrat-nouveau.html");
const src = fs.readFileSync(PAGE, "utf8");

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

/* --- bouchons jsdom : sans eux les `let` restent en zone morte et le test
       croit à un bug de la page alors que c'est l'environnement --- */
const dom = new JSDOM(src, { runScripts: "outside-only", url: "https://x/contrat-nouveau.html" });
const w = dom.window, d = w.document;
w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
w.Element.prototype.scrollIntoView = function () {};
w.HTMLCanvasElement.prototype.getContext = () => null;
w.supabase = { createClient: () => ({ from: () => ({ select: async () => ({ data: [], error: null }) }) }) };

console.log("\ncontrat-nouveau.html\n");

/* ===== 1. STRUCTURE — le test qui manquait ============================== */
const col = d.querySelector(".col");
t("le conteneur .col existe", !!col);

if (col) {
  const enfants = [...col.children];
  const steps = enfants.filter(e => e.classList.contains("steph"));
  /* Les 4 étapes doivent être FRÈRES dans .col. Si une balise se ferme trop
     tôt, les dernières étapes sortent du conteneur et la mise en page se
     casse en deux moitiés qui n'obéissent plus aux mêmes règles. */
  t("les 4 étapes numérotées sont enfants directs de .col",
    steps.length === 4, "trouvé " + steps.length + " au lieu de 4");

  const orphelines = [...d.querySelectorAll(".steph, .card")].filter(e => e.parentElement !== col);
  t("aucune étape ni carte n'est sortie de .col",
    orphelines.length === 0,
    orphelines.map(e => e.className + " → parent " + (e.parentElement.className || e.parentElement.tagName)).join(" | "));

  /* L'ordre raconte le formulaire : on ne veut pas que Finalisation remonte
     avant Le contenu à la faveur d'une correction future. */
  t("les étapes sont dans l'ordre 1 → 2 → 3 → 4",
    steps.map(s => s.querySelector("span").textContent.trim()).join("") === "1234");
}

/* ===== 2. LES DEUX CARTES QUE LE PATRON VEUT VOIR OUVERTES ============== */
const mat = d.getElementById("fold-mat");
const rec = d.getElementById("fold-rec");
const pj  = d.getElementById("fold-pj");

/* Demande du 28/07 : le technicien lit le matériel et la checklist avant de
   partir. Repliées, elles étaient oubliées. Le chevron reste : on peut les
   refermer, mais l'état d'ARRIVÉE est ouvert. */
t("« Matériel à apporter » est ouverte au chargement", mat && mat.classList.contains("open"));
t("« Récapitulatif d'intervention » est ouverte au chargement", rec && rec.classList.contains("open"));
/* Pièces jointes reste repliée : c'est le seul bloc vraiment accessoire, et
   il faut qu'au moins un repli subsiste pour que le mécanisme garde un sens. */
t("« Pièces jointes » reste repliée au chargement", pj && !pj.classList.contains("open"));

/* Le corps repliable doit être DANS la carte, pas à côté : c'était
   précisément l'erreur d'imbrication. */
[["fold-mat", mat], ["fold-rec", rec], ["fold-pj", pj]].forEach(([nom, el]) => {
  const b = el && el.querySelector(":scope > .fold-b");
  t(nom + " : son corps .fold-b est bien à l'intérieur de la carte", !!b);
});

/* ===== 3. RÈGLES DU PROJET À NE PAS CASSER ============================= */
/* profil.js verrouille la marge intérieure des cartes sur les 26 pages :
   la changer ici seulement désaligne la page du reste du logiciel. */
t("marge intérieure des cartes toujours 20px 22px",
  /\.card\{[^}]*padding:20px 22px/.test(src));

/* Espace insécable avant € — fin2.js le contrôle, commentaires compris.
   Un € précédé d'une espace ordinaire peut passer à la ligne tout seul. */
const euros = [...src.matchAll(/(.)€/g)].filter(m => m[1] !== "\u00a0" && m[1] !== ">" && m[1] !== "-");
t("aucun € précédé d'une espace ordinaire",
  euros.length === 0, euros.slice(0, 3).map(m => JSON.stringify(m[0])).join(" "));

/* ===== 4. CSS ORPHELIN (le travail de vite.js, version locale) ========== */
/* Le rail récapitulatif a été retiré du HTML il y a longtemps ; ses règles
   étaient restées. Une règle qui ne vise plus rien est du poids mort et
   trompe le prochain lecteur. */
["\\.rcard", "\\.rline", "\\.rbtns", "\\.card\\.wide"].forEach(sel => {
  t("plus de règle CSS orpheline pour " + sel.replace(/\\/g, ""),
    !new RegExp("^" + sel + "[\\s{,]", "m").test(src));
});

/* ===== 5. LA PAGE NE DOIT PLUS PROPOSER DE GRILLE 2 COLONNES =========== */
/* C'est la grille qui creusait un trou sous chaque carte courte. Si elle
   revient, le trou revient avec elle. */
t("plus de grille 2 colonnes sur .col",
  !/\.col\{[^}]*grid-template-columns/.test(src));

/* ===== 6. INTÉGRITÉ : rien n'a disparu au passage ====================== */
const attendus = ["v-client", "v-titre", "v-type", "v-deb", "v-fin", "v-freqfac",
                  "v-ht", "v-tva", "v-ttc", "v-freqint", "v-renouv", "v-renech",
                  "v-signature", "v-cats", "v-mats", "v-cks", "v-pjs", "r-ttc"];
const manquants = attendus.filter(id => !d.getElementById(id));
t("les " + attendus.length + " champs du formulaire sont tous présents",
  manquants.length === 0, "manquants : " + manquants.join(", "));

const boutons = ["saveContrat('brouillon')", "saveContrat('actif')"];
t("les deux boutons d'enregistrement sont toujours câblés",
  boutons.every(b => src.includes(b)));

console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
process.exit(ko ? 1 : 0);
