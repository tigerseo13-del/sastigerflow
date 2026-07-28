/* ============================================================================
   agenda.js — le trajet d'une intervention créée jusqu'au bac « À planifier »
   Écrite le 28/07/2026.

   POURQUOI CETTE SUITE EXISTE
   « J'ai créé une intervention, je ne la vois ni dans l'agenda ni dans À
   planifier. » Elle était pourtant bien enregistrée : le dédoublonnage de
   l'agenda se faisait sur client + code postal, donc la DEUXIÈME visite chez
   un même client disparaissait à l'affichage, en silence. Une entreprise de
   dératisation repasse chez ses clients — un contrat mensuel, c'est douze
   passages à la même adresse.

   Ces tests montent le vrai calendrier dans jsdom, y sèment des interventions
   et comptent ce qui arrive à l'écran.

   Lancement : node tests/agenda.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const src = fs.readFileSync(path.join(__dirname, "..", "calendrier.html"), "utf8");

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

const inter = (o = {}) => ({
  client: "tiger tiger", rue: "3 rue des Lilas", cp: "75011", ville: "Paris",
  date: "2026-08-29", start: 8, dur: 2, type: "rongeur", typeLibre: "",
  mode: "devis", tech: "Pablo", montant: "", note: "", ...o
});

/* Monte le calendrier avec la boîte de réception et le stock qu'on lui donne. */
function agenda({ boite = [], stock = null, maj = null }) {
  return new Promise(resolve => {
    const dom = new JSDOM(src, {
      runScripts: "dangerously", url: "https://x/calendrier.html",
      beforeParse(w) {
        w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
        w.HTMLCanvasElement.prototype.getContext = () => null;
        w.Element.prototype.scrollIntoView = function(){};
        w.scrollTo = () => {};
        w.supabase = { createClient: () => ({
          auth: { getSession: async () => ({ data: { session: null } }) },
          from: () => ({
            select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }),
                             order: async () => ({ data: [], error: null }) }),
            insert: async () => ({ error: null })
          })
        })};
        w.__err = [];
        w.addEventListener("error", e => w.__err.push(String((e.error && e.error.message) || e.message)));
        if (boite.length) w.localStorage.setItem("tigerflow-inbox-interventions", JSON.stringify(boite));
        if (stock)       w.localStorage.setItem("tigerflow-added-interventions", JSON.stringify(stock));
        if (maj)         w.localStorage.setItem("tigerflow-update-intervention", JSON.stringify(maj));
      }
    });
    setTimeout(() => resolve(dom.window), 2200);
  });
}

const bac = w => (w.document.getElementById("traycards") || { textContent: "" }).textContent;
const combien = (w, nom) => (bac(w).match(new RegExp(nom, "g")) || []).length;

(async function () {
  console.log("\nagenda — arrivée des interventions\n");

  /* ===== 1. UNE INTERVENTION ARRIVE ==================================== */
  let w = await agenda({ boite: [inter()] });
  t("une intervention créée arrive dans le bac « À planifier »",
    combien(w, "tiger tiger") === 1, combien(w, "tiger tiger") + " carte(s)");
  t("la boîte de réception est vidée une fois consommée",
    w.localStorage.getItem("tigerflow-inbox-interventions") === null);
  t("elle est conservée dans le stock persistant",
    JSON.parse(w.localStorage.getItem("tigerflow-added-interventions") || "[]").length === 1);
  t("aucune erreur pendant le chargement", w.__err.length === 0, w.__err.slice(0, 2).join(" | "));

  /* ===== 2. LE BUG SIGNALÉ : LA DEUXIÈME VISITE ======================= */
  /* Même client, même code postal, deux dates : c'est le cas NORMAL d'un
     contrat d'entretien. L'ancien dédoublonnage en perdait une. */
  w = await agenda({
    stock: [{ uid: "1000-0", ...inter({ date: "2026-08-20" }) }],
    boite: [inter({ date: "2026-08-29", type: "cafard" })]
  });
  const stock = JSON.parse(w.localStorage.getItem("tigerflow-added-interventions") || "[]");
  t("deux visites chez le même client sont toutes deux enregistrées",
    stock.length === 2, stock.length + " en stock");
  t("deux visites chez le même client s'affichent TOUTES LES DEUX",
    combien(w, "tiger tiger") === 2,
    combien(w, "tiger tiger") + " carte(s) affichée(s) pour " + stock.length + " enregistrée(s)");

  /* ===== 3. PAS DE DOUBLON À CHAQUE RECHARGEMENT ====================== */
  /* Le dédoublonnage doit continuer à faire son travail : le stock est relu à
     chaque chargement, une même intervention ne doit pas s'empiler. */
  w = await agenda({ stock: [{ uid: "2000-0", ...inter() }, { uid: "2000-0", ...inter() }] });
  t("une même intervention n'apparaît pas deux fois",
    combien(w, "tiger tiger") === 1, combien(w, "tiger tiger") + " carte(s)");

  /* ===== 4. LE SAUT DE DATE APRÈS MODIFICATION ======================== */
  /* CUR est déclarée en `let` plus bas dans le fichier : l'affecter depuis le
     bloc d'ingestion levait une ReferenceError avalée par un catch. La mise à
     jour était déjà consommée, donc l'agenda revenait sur la semaine courante
     et on croyait que rien n'avait été enregistré. */
  w = await agenda({ maj: { uid: "9-9", client: "tiger tiger", date: "2026-12-24", cp: "75011", ville: "Paris" } });
  t("une modification ne provoque plus d'erreur de zone morte",
    !w.__err.some(e => /CUR/.test(e)), w.__err.slice(0, 2).join(" | "));
  t("la mise à jour est bien consommée",
    w.localStorage.getItem("tigerflow-update-intervention") === null);

  console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
  process.exit(ko ? 1 : 0);
})();
