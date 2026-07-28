/* ============================================================================
   contrat.js — contrat.html
   Écrite le 28/07/2026, après le bug « j'ouvre mon contrat, il m'en montre
   un autre ».

   POURQUOI CETTE SUITE EXISTE
   Un contrat créé s'affichait bien dans la liste, mais sa fiche montrait
   « Ironwood Solutions », le contrat de démonstration figé dans le HTML.
   Aucune erreur, aucun écran vide : les données d'un AUTRE client présentées
   comme étant les siennes. C'est la pire forme de panne, parce que rien ne
   la signale.

   Ces tests ne relisent pas le code — ils REJOUENT le scénario : on écrit un
   contrat dans le stockage local, on ouvre la fiche avec sa référence, et on
   regarde ce qui s'affiche à l'écran.

   Lancement : node tests/contrat.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const PAGE = path.join(__dirname, "..", "contrat.html");
const src = fs.readFileSync(PAGE, "utf8");

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

/* Le bloc de chargement, extrait du fichier pour être rejoué avec des
   bouchons. On l'isole par ses bornes plutôt que par des numéros de ligne,
   qui bougeraient à la première retouche. */
const DEBUT = "/* ===== chargement de la fiche (28/07) ===== */".slice(0, 42);
const i = src.indexOf("(async function(){\n  const num = new URLSearchParams");
const j = src.indexOf("\n})();", i);
if (i < 0 || j < 0) { console.log("  \x1b[31m✗\x1b[0m bloc de chargement introuvable dans contrat.html"); process.exit(1); }
const BLOC = src.slice(i, j + 6);

/* Un contrat tel que contrat-nouveau.html l'enregistre réellement. */
const CONTRAT = {
  ref: "CTR-2026-86167", client: "tiger tiger", titre: "CONTRAT PAS CHER",
  montant: 1200, freq: "Annuelle", nbint: 4, fin: "2027-01-28", statut: "actif"
};
const CLIENT = { nom: "tiger tiger", adresse: "3 rue des Lilas", cp: "75011", ville: "Paris" };

/* Monte la page, sème le stockage, rejoue le bloc. `session` dit si la base
   répond : à false on vérifie justement le repli local. */
async function ouvrir({ ref, contrats = [], clients = [], session = false, baseRepond = null }) {
  const dom = new JSDOM(src, { runScripts: "outside-only", url: "https://x/contrat.html?n=" + encodeURIComponent(ref) });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  w.Element.prototype.scrollIntoView = function () {};
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.localStorage.setItem("tigerflow-inbox-contrats", JSON.stringify(contrats));
  w.localStorage.setItem("tigerflow-clients-cache", JSON.stringify(clients));
  w.sbSession = async () => (session ? { user: 1 } : null);
  w.SB = { from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: baseRepond ? [baseRepond] : [], error: null }) }) }) }) };
  w.eval(BLOC);
  await new Promise(r => setTimeout(r, 30));
  return w.document;
}

const txt = (d, sel) => { const e = d.querySelector(sel); return e ? e.textContent.trim() : ""; };
/* On juge sur le CONTENU de la fiche (.page). La palette de recherche globale
   porte aussi des exemples nommant Ironwood, mais c'est un bloc partagé par
   les autres pages et il ne prétend rien sur le contrat ouvert. */
const contenu = d => d.querySelector(".page").textContent;

(async function () {
  console.log("\ncontrat.html\n");

  /* ===== 1. LE SCÉNARIO EXACT DU BUG ==================================== */
  /* Contrat créé (donc en local, pas en base) + pas de session : c'est le cas
     qui affichait Ironwood. */
  let d = await ouvrir({ ref: CONTRAT.ref, contrats: [CONTRAT], clients: [CLIENT] });

  t("le contrat créé s'affiche à la place de la démonstration",
    txt(d, ".hero h1").startsWith("tiger tiger"), "vu : « " + txt(d, ".hero h1") + " »");

  /* Le test le plus important de la suite. */
  t("« Ironwood » n'apparaît nulle part sur la fiche",
    !contenu(d).includes("Ironwood"),
    "le contrat de démonstration est encore à l'écran");

  t("la référence affichée est celle demandée",
    txt(d, ".hids .copyref") === CONTRAT.ref, "vu : " + txt(d, ".hids .copyref"));
  t("l'objet du contrat est le bon", d.body.textContent.includes("CONTRAT PAS CHER"));
  t("le montant est celui du contrat",
    txt(d, ".hero .quick .q b").includes("1"), "vu : " + txt(d, ".hero .quick .q b"));
  t("l'adresse est celle du client, pas celle de la démonstration",
    txt(d, ".hadr").includes("Lilas"), "vu : « " + txt(d, ".hadr") + " »");

  /* ===== 1 bis. LE RESTE DE LA DÉMONSTRATION ========================== */
  /* Le contrat vient d'être créé : aucune intervention n'est programmée,
     aucun document n'est joint. Annoncer « Prochaine intervention : samedi
     29 août » ou un « contrat-signe.pdf » est pire qu'une carte vide. */
  const nx = d.querySelector(".next");
  t("aucun bandeau « Prochaine intervention » sans date programmée",
    !nx || nx.style.display === "none",
    "le bandeau de démonstration est encore affiché");
  t("les interventions de démonstration ont disparu",
    !contenu(d).includes("Contrôle mensuel"),
    "quatre contrôles signés Pablo étaient encore listés");
  t("les documents de démonstration ont disparu",
    !contenu(d).includes("contrat-signe.pdf"),
    "un contrat signé qui n'existe pas est pire qu'une liste vide");
  t("les compteurs d'onglets sont remis à zéro",
    [...d.querySelectorAll(".tn")].every(n => n.textContent === "0"),
    "vus : " + [...d.querySelectorAll(".tn")].map(n => n.textContent).join(", "));
  t("le sous-texte de facturation n'annonce plus 62,54 € / mois",
    !contenu(d).includes("62,54"),
    "montant du contrat de démonstration, sous une facturation annuelle");
  t("une facturation annuelle est décrite comme telle",
    contenu(d).includes("1 facture / an"));

  /* ===== 2. RÉFÉRENCE INCONNUE : ON LE DIT ============================= */
  /* Avant, une référence inconnue laissait la démonstration : on présentait
     le contrat d'un autre client comme étant celui demandé. */
  d = await ouvrir({ ref: "CTR-2026-00000", contrats: [CONTRAT], clients: [CLIENT] });
  t("une référence inconnue annonce « Contrat introuvable »",
    txt(d, ".hero h1").includes("introuvable"), "vu : « " + txt(d, ".hero h1") + " »");
  t("une référence inconnue n'affiche AUCUN contrat de démonstration",
    !contenu(d).includes("Ironwood"));

  /* L'historique portait « signé par John Thompson (Ironwood Solutions) »
     sous le nom du contrat ouvert : encore les données d'un autre client. */
  t("l'historique de démonstration ne survit pas au chargement",
    !contenu(d).includes("John Thompson"));
  t("la référence demandée est rappelée à l'écran",
    d.body.textContent.includes("CTR-2026-00000"));

  /* ===== 3. LA BASE A LA PRIORITÉ ====================================== */
  /* Quand la base répond, c'est elle qui fait foi : le local n'est qu'un
     repli, pas une source concurrente. */
  d = await ouvrir({
    ref: CONTRAT.ref, contrats: [CONTRAT], clients: [CLIENT], session: true,
    baseRepond: { numero: CONTRAT.ref, client: "Version base", titre: "Titre base",
                  montant_ttc: 999, frequence: "Mensuelle", passages_faits: 7,
                  passages_prevus: 12, renouvellement: "2026-01-12" }
  });
  t("quand la base répond, c'est elle qui fait foi",
    txt(d, ".hero h1").startsWith("Version base"), "vu : « " + txt(d, ".hero h1") + " »");
  t("les passages viennent bien de la base",
    d.body.textContent.includes("7 / 12"));

  /* ===== 4. SANS ?n=, LA DÉMONSTRATION RESTE ========================== */
  /* On arrive par « ＋ Contrat » : la page de démonstration a le droit
     d'exister, c'est sa raison d'être. */
  const dom = new JSDOM(src, { runScripts: "outside-only", url: "https://x/contrat.html" });
  dom.window.sbSession = async () => null;
  dom.window.eval(BLOC);
  await new Promise(r => setTimeout(r, 30));
  t("sans référence dans l'URL, la page de démonstration est laissée intacte",
    dom.window.document.querySelector(".page").textContent.includes("Ironwood"));

  /* ===== 5. RÈGLE DU PROJET ============================================ */
  /* fin2.js : espace insécable avant €, commentaires compris. */
  const euros = [...src.matchAll(/(.)€/g)].filter(m => !["\u00a0", ">", "-"].includes(m[1]));
  t("aucun € précédé d'une espace ordinaire", euros.length === 0,
    euros.slice(0, 3).map(m => JSON.stringify(m[0])).join(" "));

  console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
  process.exit(ko ? 1 : 0);
})();
