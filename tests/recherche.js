/* ============================================================================
   recherche.js — la barre de recherche globale
   Écrite le 28/07/2026.

   POURQUOI CETTE SUITE EXISTE
   « Aucun résultat pour UND » alors que le client venait d'être créé. La
   recherche ne consultait pas les données du logiciel : elle parcourait deux
   listes écrites en dur dans chaque page — onze clients et quatre documents de
   démonstration. Tout ce qui avait été créé depuis était invisible.

   Le bloc est recopié sur 23 pages : le test vérifie les 23, parce qu'une
   seule page oubliée redonne « aucun résultat » à qui cherche depuis elle.

   Lancement : node tests/recherche.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const glob = require("fs").readdirSync;
const { JSDOM } = require("jsdom");

const RACINE = path.join(__dirname, "..");
const PAGES = glob(RACINE).filter(f => f.endsWith(".html"))
  .filter(f => fs.readFileSync(path.join(RACINE, f), "utf8").includes('id="gs-pal"'));

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

console.log("\nrecherche globale — " + PAGES.length + " pages la portent\n");

/* ===== 1. PLUS AUCUNE DONNÉE DE DÉMONSTRATION ======================== */
/* Le symptôme était qu'on trouvait Ironwood mais pas ses propres clients. */
const restes = PAGES.filter(f => {
  const s = fs.readFileSync(path.join(RACINE, f), "utf8");
  const i = s.indexOf("var CL = "), j = s.indexOf("var PG = ");
  return i > -1 && j > i && /Ironwood|Boulangerie Dupont|Pharmacie Centrale/.test(s.slice(i, j));
});
t("aucune page ne cherche encore dans les clients de démonstration",
  restes.length === 0, restes.join(", "));

const sansLecture = PAGES.filter(f =>
  !/tigerflow-inbox-clients/.test(fs.readFileSync(path.join(RACINE, f), "utf8")
    .slice(fs.readFileSync(path.join(RACINE, f), "utf8").indexOf("var CL = "),
           fs.readFileSync(path.join(RACINE, f), "utf8").indexOf("var PG = "))));
t("les " + PAGES.length + " pages lisent le vrai stock de clients",
  sansLecture.length === 0, "oubliées : " + sansLecture.join(", "));

/* ===== 2. LA RECHERCHE TROUVE VRAIMENT ============================== */
function chercher(page, terme, donnees) {
  return new Promise(resolve => {
    const dom = new JSDOM(fs.readFileSync(path.join(RACINE, page), "utf8"), {
      runScripts: "dangerously", url: "https://x/" + page,
      beforeParse(w) {
        w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
        w.HTMLCanvasElement.prototype.getContext = () => null;
        w.Element.prototype.scrollIntoView = function(){};
        w.scrollTo = () => {};
        w.supabase = { createClient: () => ({
          auth: { getSession: async () => ({ data: { session: null } }) },
          from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }),
                                          order: async () => ({ data: [], error: null }) }) })
        })};
        Object.entries(donnees).forEach(([k, v]) => w.localStorage.setItem(k, JSON.stringify(v)));
      }
    });
    setTimeout(() => {
      const w = dom.window;
      const inp = w.document.getElementById("gs-inp") || w.document.querySelector(".gs-pal input");
      if (!inp) return resolve({ err: "champ de recherche introuvable" });
      inp.value = terme;
      inp.dispatchEvent(new w.Event("input", { bubbles: true }));
      resolve({ res: (w.document.getElementById("gs-res") || {}).textContent || "" });
    }, 900);
  });
}

const DONNEES = {
  "tigerflow-inbox-clients":   [{ nom: "Undercroft Immobilier", ville: "Paris", tel: "06 11 22 33 44" }],
  /* Les montants sont renseignes parce que les listes formatent sans filet :
     `eur = n => n.toLocaleString(...)` casse sur une valeur absente, et une
     seule ligne incomplete fait tomber tout le rendu. Fragilite reelle, hors
     du sujet de cette suite — mais un jeu de test irrealiste produirait une
     trace d erreur qui n a rien a voir avec la recherche. */
  "tigerflow-inbox-devis":     [{ ref: "DEV-2026-28331", client: "Undercroft Immobilier", montant: 1200 }],
  "tigerflow-inbox-contrats":  [{ ref: "CTR-2026-86167", client: "Undercroft Immobilier", montant: 1200 }],
  "tigerflow-inbox-factures":  [{ ref: "FAC-2026-00042", client: "Undercroft Immobilier", montant: 1200, ht: 1000, tva: 20 }]
};

(async function () {
  /* Le terme exact de la capture d'écran : « UND ». */
  let r = await chercher("clients.html", "UND", DONNEES);
  t("un client créé est trouvé (le cas signalé : « UND »)",
    !r.err && r.res.includes("Undercroft"), r.err || "résultat : « " + r.res.trim().slice(0, 60) + " »");

  r = await chercher("clients.html", "DEV-2026-28331", DONNEES);
  t("un devis est trouvé par sa référence", !r.err && r.res.includes("DEV-2026-28331"), r.err);

  r = await chercher("clients.html", "CTR-2026-86167", DONNEES);
  t("un contrat est trouvé par sa référence", !r.err && r.res.includes("CTR-2026-86167"), r.err);

  r = await chercher("clients.html", "FAC-2026-00042", DONNEES);
  t("une facture est trouvée par sa référence", !r.err && r.res.includes("FAC-2026-00042"), r.err);

  /* Les pages du logiciel restent atteignables : c'est l'autre moitié du
     service rendu par cette barre. */
  r = await chercher("clients.html", "reglages", DONNEES);
  t("les pages du logiciel restent trouvables", !r.err && /glages/i.test(r.res), r.err);

  /* Une recherche qui ne donne rien doit le dire, pas planter. */
  r = await chercher("clients.html", "zzzzzz", DONNEES);
  t("une recherche sans résultat l'annonce", !r.err && /ucun/i.test(r.res), r.err);

  /* Depuis une AUTRE page : le bloc est recopié, il doit se comporter pareil. */
  r = await chercher("facture-liste.html", "UND", DONNEES);
  t("la recherche marche aussi depuis une autre page",
    !r.err && r.res.includes("Undercroft"), r.err);

  console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
  process.exit(ko ? 1 : 0);
})();
