/* ============================================================================
   apercu.js — l'aperçu client montre la vraie pièce
   Écrite le 28/07/2026.

   POURQUOI CETTE SUITE EXISTE
   devis-client.html était une MAQUETTE FIGÉE : aucun localStorage, aucun
   paramètre d'URL, aucun appel à la base — vérifié sur les six mécanismes
   possibles. Le bouton « Aperçu client » ouvrait toujours le même document
   fictif, DEV-2026-01287 pour Pharmacie Centrale, quel que soit le devis à
   l'écran. La facture, elle, n'avait pas d'aperçu du tout.

   La page sert maintenant les deux types. Un devis parle de validité, une
   facture d'échéance de paiement : le vocabulaire suit la pièce.

   Lancement : node tests/apercu.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const RACINE = f => path.join(__dirname, "..", f);
const src = fs.readFileSync(RACINE("devis-client.html"), "utf8");

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

const DEVIS = {
  ref: "DEV-2026-27978", client: "tiger tiger", titre: "Traitement cafards — gel + pulvérisation",
  montant: 242, date: "2026-07-28", valid: "2026-08-27",
  lignes: [{ designation: "Traitement cafards — gel + pulvérisation", desc: "Gel appât ciblé", qte: 1, pu: 220, tva: 10 }]
};
const FACTURE = {
  ref: "FAC-2026-87782", client: "Crèche Les Lutins", titre: "Désinfection locaux — norme HACCP",
  montant: 176, date: "2026-07-28", valid: "2026-08-27",
  lignes: [{ designation: "Désinfection locaux — norme HACCP", qte: 1, pu: 160, tva: 10 }]
};
const CLIENT = { nom: "tiger tiger", adresse: "3 rue des Lilas", cp: "75011", ville: "Paris", tel: "04 44 44 44 44" };

function apercu(ref) {
  return new Promise(resolve => {
    const dom = new JSDOM(src, {
      runScripts: "dangerously",
      url: "https://x/devis-client.html" + (ref ? "?ref=" + encodeURIComponent(ref) : ""),
      beforeParse(w) {
        w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
        w.HTMLCanvasElement.prototype.getContext = () => null;
        w.print = () => {};
        w.localStorage.setItem("tigerflow-inbox-devis", JSON.stringify([DEVIS]));
        w.localStorage.setItem("tigerflow-inbox-factures", JSON.stringify([FACTURE]));
        w.localStorage.setItem("tigerflow-clients-cache", JSON.stringify([CLIENT]));
      }
    });
    setTimeout(() => resolve(dom.window), 400);
  });
}

const txt = (w, n) => { const e = w.document.querySelector('[data-f="' + n + '"]'); return e ? e.textContent.trim() : ""; };
/* body.textContent inclut le contenu des <script> : la premiere version de ce
   test signalait « DEV-2026-01287 » alors que la seule occurrence restante
   etait dans un COMMENTAIRE du code. On ne mesure que ce qui est affiche. */
const corps = w => [...w.document.body.querySelectorAll("*")]
  .filter(e => e.tagName !== "SCRIPT" && e.tagName !== "STYLE")
  .map(e => e.childNodes.length ? [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(" ") : "")
  .join(" ");

(async function () {
  console.log("\naperçu client\n");

  /* ===== 1. UN DEVIS RÉEL ============================================ */
  let w = await apercu(DEVIS.ref);
  t("l'aperçu montre la référence demandée", txt(w, "num").includes(DEVIS.ref),
    "affiché : « " + txt(w, "num") + " »");
  t("il montre le bon client", txt(w, "cli-nom") === DEVIS.client,
    "affiché : « " + txt(w, "cli-nom") + " »");
  t("il montre le bon objet", txt(w, "objet") === DEVIS.titre);
  t("il montre la prestation du devis", corps(w).includes("Traitement cafards"));

  /* LE TEST QUI COMPTE : plus aucune trace de la maquette. */
  t("plus aucune trace du document fictif",
    !corps(w).includes("DEV-2026-01287") && !corps(w).includes("Pharmacie Centrale"),
    "la maquette figée s'affiche encore par-dessus la vraie pièce");

  t("les coordonnées viennent du fichier client",
    corps(w).includes("Lilas") && corps(w).includes("75011"),
    "l'enregistrement ne porte que le nom, le reste vient du cache");

  /* ===== 2. UNE FACTURE, MÊME PAGE =================================== */
  w = await apercu(FACTURE.ref);
  t("la même page sert aussi les factures", txt(w, "num").includes(FACTURE.ref),
    "affiché : « " + txt(w, "num") + " »");
  t("elle s'annonce comme une facture, pas comme un devis",
    txt(w, "lbl-piece") === "Facture" && txt(w, "bar").startsWith("Facture"),
    "vu : « " + txt(w, "bar") + " »");

  /* Le vocabulaire n'est pas le meme : un devis est valable, une facture se regle. */
  t("une facture parle d'échéance de paiement, pas de validité",
    /régler/i.test(txt(w, "lbl-ech")),
    "vu : « " + txt(w, "lbl-ech") + " »");

  w = await apercu(DEVIS.ref);
  t("un devis parle de validité, pas de règlement",
    /Valable/i.test(txt(w, "lbl-ech")),
    "vu : « " + txt(w, "lbl-ech") + " »");

  /* ===== 3. LES CAS LIMITES ========================================= */
  w = await apercu("DEV-2026-00000");
  t("une référence inconnue le dit au lieu de montrer un exemple",
    /introuvable/i.test(txt(w, "bar")) && !corps(w).includes("Pharmacie Centrale"),
    "vu : « " + txt(w, "bar") + " »");

  w = await apercu(null);
  t("sans référence, le gabarit d'origine reste affiché",
    corps(w).includes("DEV-2026-01287"),
    "il sert de page de démonstration");

  /* ===== 4. LES DEUX ATELIERS Y MÈNENT ============================== */
  const dev = fs.readFileSync(RACINE("devis.html"), "utf8");
  const fac = fs.readFileSync(RACINE("facture.html"), "utf8");
  t("l'atelier devis passe la référence à l'aperçu",
    /devis-client\.html" \+ \(r/.test(dev),
    "il ouvrait la maquette sans référence");
  t("l'atelier facture a désormais un bouton Aperçu client",
    /Aperçu client/.test(fac) && /function apercuClient/.test(fac),
    "la facture n'en avait aucun");

  console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
  process.exit(ko ? 1 : 0);
})();
