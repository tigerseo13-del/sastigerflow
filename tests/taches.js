/* ============================================================================
   taches.js — changer un statut ne doit rien déplacer
   Écrite le 28/07/2026.

   POURQUOI CETTE SUITE EXISTE
   Marquer une tâche « terminée » l'envoyait au fond d'une liste paginée : elle
   passait page 2 et disparaissait de l'écran. Vue du bureau, elle était
   effacée. Deux corrections ont été tentées dans la journée ; la seconde gelait
   la position pendant 60 secondes — passé ce délai la tâche repartait toute
   seule, sans qu'on ait rien fait.

   Un changement d'état ne doit RIEN déplacer. La tâche garde sa place tant
   qu'on est sur la page ; le rangement se fait au prochain chargement, quand
   plus personne ne regarde.

   Deux mécanismes la faisaient bouger, et il fallait traiter les deux :
     — le tri, qui envoie les terminées en bas ;
     — le filtre, qui écarte la tâche dès qu'elle ne correspond plus.

   Lancement : node tests/taches.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const src = fs.readFileSync(path.join(__dirname, "..", "taches.html"), "utf8");

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

function page() {
  return new Promise(resolve => {
    const dom = new JSDOM(src, {
      runScripts: "dangerously", url: "https://x/taches.html",
      beforeParse(w) {
        w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
        w.HTMLCanvasElement.prototype.getContext = () => null;
        w.Element.prototype.scrollIntoView = function(){};
        w.scrollTo = () => {};
        w.supabase = { createClient: () => ({
          auth: { getSession: async () => ({ data: { session: null } }) },
          from: () => ({ select: () => ({ order: async () => ({ data: [], error: null }) }) })
        })};
      }
    });
    setTimeout(() => resolve(dom.window), 900);
  });
}

/* Les titres affichés, dans l'ordre de la liste. */
const ordre = w => [...w.document.querySelectorAll("tbody tr")]
  .map(tr => (tr.querySelector("td") || {}).textContent || "")
  .map(x => x.replace(/\s+/g, " ").trim());

(async function () {
  console.log("\ntâches — le statut ne déplace rien\n");

  const w = await page();
  const avant = ordre(w);
  t("la liste s'affiche", avant.length > 0, "aucune ligne");

  /* On prend une tâche au milieu : le fond de liste ne prouverait rien. */
  /* TASKS est declare en `const` : il vit dans la portee lexicale globale et
     n'est PAS une propriete de window. On passe par eval, qui s'execute dans
     cette meme portee. */
  const T = w.eval("TASKS");
  const cible = T.find(x => x.st === "todo") || T[0];
  const i = avant.findIndex(l => l.includes(cible.titre.slice(0, 18)));
  t("la tâche témoin est visible dans la liste", i > -1,
    "témoin : « " + cible.titre + " »");

  /* ===== LE TEST CENTRAL ============================================== */
  w.cycleStat(cible.id);
  const apres = ordre(w);
  const j = apres.findIndex(l => l.includes(cible.titre.slice(0, 18)));

  t("la tâche est toujours affichée après le changement",
    j > -1, "elle a disparu de l'écran");
  t("elle n'a pas bougé de place",
    i === j, "elle est passée de la ligne " + (i + 1) + " à la ligne " + (j + 1));
  t("les autres lignes n'ont pas bougé non plus",
    JSON.stringify(avant) === JSON.stringify(apres),
    "l'ordre général a change");

  /* Le statut, lui, doit bien avoir change. */
  t("le statut a bien changé", cible.st !== "todo");

  /* ===== TROIS CHANGEMENTS D'AFFILÉE ================================= */
  /* Le cycle todo → prog → done ramene au point de depart : la tache traverse
     tous les etats, y compris « terminee » qui est celui qui la renvoyait au
     fond de la liste. */
  const posBase = ordre(w).findIndex(l => l.includes(cible.titre.slice(0, 18)));
  let bouge = false;
  for (let k = 0; k < 3; k++) {
    w.cycleStat(cible.id);
    if (ordre(w).findIndex(l => l.includes(cible.titre.slice(0, 18))) !== posBase) bouge = true;
  }
  t("elle ne bouge pas non plus en passant par « terminée »",
    !bouge, "un des trois changements l'a deplacee");

  /* ===== PLUS DE DÉLAI DE 60 SECONDES =============================== */
  /* La position ne doit pas dependre de l'heure qu'il est : une tache qui
     repart toute seule au bout d'une minute est pire qu'une qui part tout de
     suite, parce qu'on ne comprend pas pourquoi. */
  t("la position ne depend plus d'un chronometre",
    !/_juste && Date\.now\(\) - x\._juste < 60000/.test(src) && !/60000/.test(src.slice(src.indexOf("const gele"), src.indexOf("const gele") + 200)),
    "un delai fait repartir la tache sans qu'on ait rien fait");

  /* ===== LE FILTRE NE DOIT PAS L'ESCAMOTER ========================== */
  t("une tâche touchée reste visible même si le filtre ne la retient plus",
    /FSTAT === "all" \|\| t\.st === FSTAT \|\| t\._juste/.test(src),
    "sur un filtre « À faire », passer une tache « En cours » la ferait disparaitre");

  console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
  process.exit(ko ? 1 : 0);
})();
