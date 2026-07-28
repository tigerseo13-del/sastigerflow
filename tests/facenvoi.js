/* ============================================================================
   facenvoi.js — une facture doit toujours pouvoir partir chez le client
   Écrite le 28/07/2026.

   POURQUOI CETTE SUITE EXISTE
   « Un client appelle, il veut sa facture, comment je l'envoie ? »

   Sur une facture soldée, le bouton principal devenait « Télécharger le reçu »
   et l'envoi disparaissait de l'écran. Le menu « ⋯ » ne proposait que Dupliquer
   et Supprimer. Il n'existait plus aucun moyen d'envoyer la facture.

   Et le cas n'est pas théorique : une facture peut être payée sans avoir jamais
   été envoyée — paiement sur place, encaissement par le technicien, virement
   d'avance. La capture qui a déclenché cette correction montrait exactement
   ça : « Payée » et « Pas encore envoyée » sur le même écran.

   Envoyer la facture est une obligation ; télécharger un reçu est un confort.

   Lancement : node tests/facenvoi.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const src = fs.readFileSync(path.join(__dirname, "..", "facture-detail.html"), "utf8");

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

const REF = "FAC-2026-45472";
const FACTURE = {
  ref: REF, client: "Hôtel du Parc", objet: "Traitement chimique — 2 passages",
  montant: 616, ht: 560, tva: 10, valid: "2026-08-23", lignes: []
};

/* `paiements` solde la facture, `envois` dit si elle est partie. */
/* 28/07 — ces essais posaient des paiements SANS valider la facture. Depuis
   la separation des deux modes, une facture non validee reste une pro forma :
   elle ne s'encaisse pas et son bouton propose la validation. Les jeux d'essai
   valident donc explicitement, ce qui correspond au parcours reel — on ne
   recoit pas d'argent sur un document qui ne vaut pas facture. */
function fiche({ paiements = [], envois = {}, statut = "attente" } = {}) {
  return new Promise(resolve => {
    const dom = new JSDOM(src, {
      runScripts: "dangerously", url: "https://x/facture-detail.html?ref=" + encodeURIComponent(REF),
      beforeParse(w) {
        w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
        w.HTMLCanvasElement.prototype.getContext = () => null;
        w.Element.prototype.scrollIntoView = function(){};
        w.scrollTo = () => {};
        w.print = () => {};
        w.supabase = { createClient: () => ({
          auth: { getSession: async () => ({ data: { session: null } }) },
          from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) })
        })};
        w.localStorage.setItem("tigerflow-inbox-factures", JSON.stringify([FACTURE]));
        w.localStorage.setItem("tigerflow-factures-paiements", JSON.stringify({ [REF]: paiements }));
        w.localStorage.setItem("tigerflow-factures-envois", JSON.stringify(envois));
        w.localStorage.setItem("tigerflow-factures-statuts", JSON.stringify(statut ? { [REF]: statut } : {}));
      }
    });
    setTimeout(() => resolve(dom.window), 700);
  });
}

const primaire = w => w.document.getElementById("a-primary");
const menu = w => (w.document.getElementById("fmenu") || { textContent: "" }).textContent;

(async function () {
  console.log("\nfacture — l'envoi au client\n");

  /* ===== 1. LE CAS SIGNALÉ ============================================ */
  /* Payée intégralement, jamais envoyée. */
  let w = await fiche({ paiements: [{ m: 616, d: "2026-07-25" }] });
  const p = primaire(w);
  t("une facture payée mais jamais envoyée propose d'abord l'ENVOI",
    p && /Envoyer/.test(p.textContent),
    "bouton : « " + (p ? p.textContent.trim() : "?") + " » — le reçu passe après");
  t("le bouton déclenche bien l'envoi",
    p && /envoyer/.test(p.getAttribute("onclick") || ""));

  /* ===== 2. L'ENVOI RESTE TOUJOURS ATTEIGNABLE ======================= */
  /* Facture payée ET déjà envoyée : le bouton principal peut proposer le
     reçu, mais l'envoi doit rester quelque part. */
  w = await fiche({
    paiements: [{ m: 616, d: "2026-07-25" }],
    envois: { [REF]: { date: "24/07/2026", to: "contact@hotelduparc.fr" } }
  });
  t("une facture soldée et envoyée propose le reçu en bouton principal",
    /reçu/i.test((primaire(w) || {}).textContent || ""),
    "bouton : « " + ((primaire(w) || {}).textContent || "?").trim() + " »");
  t("mais l'envoi reste disponible dans le menu",
    /envoyer/i.test(menu(w)),
    "un client qui rappelle six mois plus tard est un cas courant");
  t("le menu dit « Renvoyer » quand elle est déjà partie",
    /Renvoyer/.test(menu(w)), "menu : " + menu(w).replace(/\s+/g, " ").trim().slice(0, 70));

  /* ===== 3. LE MOT SUIT L'ÉTAT ====================================== */
  w = await fiche({ statut: "attente" });
  t("le menu dit « Envoyer » tant qu'elle n'est pas partie",
    /Envoyer la facture/.test(menu(w)) && !/Renvoyer/.test(menu(w)),
    "menu : " + menu(w).replace(/\s+/g, " ").trim().slice(0, 70));

  /* ===== 4. LES AUTRES SITUATIONS NE SONT PAS CASSÉES =============== */
  /* Envoyée, non soldée, échéance dépassée : la relance reste la bonne action. */
  w = await fiche({ envois: { [REF]: { date: "24/05/2026" } } });
  const p4 = primaire(w);
  t("une facture envoyée et impayée propose l'envoi ou la relance",
    p4 && /Envoyer|Relanc/i.test(p4.textContent),
    "bouton : « " + (p4 ? p4.textContent.trim() : "?") + " »");

  /* ===== 5. AUCUN BOUTON MUET ====================================== */
  /* Le bouton principal de la fiche devis a deja ete trouve vide un jour. */
  t("le bouton principal n'est jamais vide",
    (primaire(w) || {}).textContent.trim().length > 0);
  t("il porte une icône", primaire(w) && primaire(w).querySelector("svg"));

  /* ===== 6. L'ORDRE DES ONGLETS ==================================== */
  /* 28/07 — Avoirs passait en deuxieme position alors qu'il affiche 0 sur la
     quasi-totalite des factures : l'exception occupait la place de la question
     quotidienne, « est-ce paye, combien, quand ». Les onglets se rangent par
     frequence d'usage. */
  const onglets = [...w.document.querySelectorAll(".tab")]
    .map(b2 => (b2.getAttribute("onclick") || "").match(/showTab\('([a-z]+)'/))
    .filter(Boolean).map(m => m[1]);
  t("les onglets suivent l'ordre Détails · Paiements · Historique · Avoirs",
    JSON.stringify(onglets.slice(0, 4)) === JSON.stringify(["det", "pai", "hist", "avoirs"]),
    "ordre vu : " + onglets.join(" · "));
  t("Paiements passe avant Avoirs",
    onglets.indexOf("pai") < onglets.indexOf("avoirs"),
    "un onglet a zero ne doit pas preceder celui qu'on consulte tous les jours");

  /* Et le cas inverse : une facture NON validee ne propose pas l'envoi mais
     la validation — c'est le mode pro forma. */
  const pf = await fiche({ statut: "brouillon" });
  t("une pro forma propose la validation, pas l'envoi",
    /Valider/.test((primaire(pf) || {}).textContent || ""),
    "bouton : « " + (primaire(pf) || {}).textContent + " »");
  t("mais l'envoi en pro forma reste dans le menu",
    /Envoyer/i.test(menu(pf)));

  console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
  process.exit(ko ? 1 : 0);
})();
