/* ============================================================================
   devstat.js — le statut sur la fiche devis
   Écrite le 28/07/2026.

   POURQUOI CETTE SUITE EXISTE
   La fiche devis était le seul écran où l'on voyait le statut sans pouvoir le
   corriger. En l'ajoutant, un second défaut est apparu : la table des statuts
   de la page était celle des FACTURES (brouillon / attente / payée / en
   retard), venue du clonage de facture-detail.html. Les statuts de devis —
   envoyé, gagné, perdu, expiré — n'y figuraient pas, donc la pastille
   retombait sur « En attente ». Un devis GAGNÉ s'affichait « En attente ».

   Lancement : node tests/devstat.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const src = fs.readFileSync(path.join(__dirname, "..", "devis-detail.html"), "utf8");

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

const REF = "DEV-2026-28331";
const DEVIS = {
  ref: REF, client: "tiger tiger", objet: "Dératisation",
  montant: 1200, statut: "brouillon",
  valid: "2027-01-28", lignes: []
};

function fiche({ statuts = {} } = {}) {
  return new Promise(resolve => {
    const dom = new JSDOM(src, {
      runScripts: "dangerously", url: "https://x/devis-detail.html?ref=" + encodeURIComponent(REF),
      beforeParse(w) {
        w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
        w.HTMLCanvasElement.prototype.getContext = () => null;
        w.Element.prototype.scrollIntoView = function(){};
        w.scrollTo = () => {};
        w.supabase = { createClient: () => ({
          auth: { getSession: async () => ({ data: { session: null } }) },
          from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) })
        })};
        w.localStorage.setItem("tigerflow-inbox-devis", JSON.stringify([DEVIS]));
        w.localStorage.setItem("tigerflow-devis-statuts", JSON.stringify(statuts));
        w.__err = [];
        w.addEventListener("error", e => w.__err.push(String((e.error && e.error.message) || e.message)));
      }
    });
    setTimeout(() => resolve(dom.window), 700);
  });
}

const libelle = w => {
  const b = w.document.getElementById("h-badge");
  return b ? b.querySelector("span").textContent.trim() : "";
};

(async function () {
  console.log("\nfiche devis — statut\n");

  /* ===== 1. LE MENU EXISTE ============================================= */
  let w = await fiche();
  t("la pastille de statut est un bouton, pas un simple texte",
    (w.document.getElementById("h-badge") || {}).tagName === "BUTTON");
  const choix = [...w.document.querySelectorAll("#stmenu .stc")].map(b => b.dataset.s);
  t("les quatre statuts sont proposés",
    ["brouillon","envoye","gagne","perdu"].every(s => choix.includes(s)),
    "proposés : " + choix.join(", "));
  t("aucune erreur au chargement", w.__err.length === 0, w.__err.slice(0,2).join(" | "));

  /* ===== 2. LE DÉFAUT DÉCOUVERT EN CHEMIN ============================= */
  /* Chaque statut de devis doit avoir son libellé. Avec la table des factures,
     tout ce qui n'était pas « brouillon » retombait sur « En attente ». */
  for (const [st, attendu] of [["brouillon","Brouillon"], ["envoye","Envoyé"], ["gagne","Gagné"], ["perdu","Perdu"]]) {
    w = await fiche({ statuts: { [REF]: st } });
    t("un devis « " + attendu + " » affiche « " + attendu + " »",
      libelle(w) === attendu, "affiche « " + libelle(w) + " »");
  }
  t("le mot « En attente » ne peut plus apparaître sur un devis",
    !/["']En attente["']/.test(src),
    "c'est un statut de facture, il n'a rien à faire ici");

  /* ===== 3. CHANGER LE STATUT ========================================= */
  w = await fiche();
  t("au départ, le devis est un brouillon", libelle(w) === "Brouillon");
  w.statutPick("gagne");
  t("le statut choisi s'affiche aussitôt", libelle(w) === "Gagné",
    "affiche « " + libelle(w) + " »");

  /* Le registre est partagé avec la liste et l'atelier : les trois écrans
     doivent dire la même chose. */
  const reg = JSON.parse(w.localStorage.getItem("tigerflow-devis-statuts") || "{}");
  t("le changement est écrit dans le registre partagé",
    reg[REF] === "gagne", "registre : " + JSON.stringify(reg));

  /* Le statut commande aussi le bouton principal de l'en-tête. */
  const ap = w.document.getElementById("a-primary");
  t("le bouton principal suit le nouveau statut",
    ap && /facture/i.test(ap.textContent),
    "bouton : « " + (ap ? ap.textContent.trim() : "?") + " »");

  /* 28/07 — il etait le seul bouton de la barre sans icone. */
  t("le bouton principal porte une icone",
    ap && ap.querySelector("svg"), "aucun svg dans le bouton");
  t("l'icone correspond a l'action : carte pour la transformation en facture",
    ap && /rect/.test(ap.innerHTML), "l'avion en papier n'a rien a faire ici");

  w.statutPick("brouillon");
  const ap2 = w.document.getElementById("a-primary");
  t("un brouillon propose l'envoi, avec l'avion en papier",
    ap2 && /Envoyer/.test(ap2.textContent) && /M22 2L11 13/.test(ap2.innerHTML),
    "bouton : « " + (ap2 ? ap2.textContent.trim() : "?") + " »");
  t("l'icone est la meme que dans l'atelier",
    fs.readFileSync(path.join(__dirname, "..", "devis.html"), "utf8").includes("M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"),
    "les deux ecrans doivent montrer le meme avion");

  /* ===== 4. LE MENU S'OUVRE ET SE FERME =============================== */
  w = await fiche();
  const menu = w.document.getElementById("stmenu");
  t("le menu est fermé au départ", !menu.classList.contains("open"));
  w.stMenu({ stopPropagation(){} });
  t("un clic sur la pastille ouvre le menu", menu.classList.contains("open"));
  /* Un vrai clic sur un element : un `new Event("click")` envoye au document
     n'a pas de cible, et un autre ecouteur de la page appelle e.target.closest.
     Le test crachait une trace qui n'etait pas un defaut de la page. */
  w.document.body.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  t("un clic ailleurs referme le menu", !menu.classList.contains("open"));

  /* ===== 5. ENVOYER FAIT PASSER LE DEVIS EN « ENVOYÉ » ============== */
  /* 28/07 — on envoyait le devis et il restait affiche « Brouillon » : le
     statut passait a "attente", qui est un statut de FACTURE et n'existe pas
     dans la table des devis. */
  w = await fiche();
  t("un devis neuf est bien un brouillon", libelle(w) === "Brouillon");
  w.document.getElementById("s-to").value = "tiger.tiger@exemple.fr";
  w.document.getElementById("s-obj").value = "Votre devis";
  w.sendConfirm();
  await new Promise(r => setTimeout(r, 60));
  t("apres envoi, le devis passe en « Envoyé »",
    libelle(w) === "Envoyé", "affiche « " + libelle(w) + " »");
  t("le statut « attente » (facture) n'est plus jamais pose",
    !/statutSet\("attente"\)/.test(src));

  const reg2 = JSON.parse(w.localStorage.getItem("tigerflow-devis-statuts") || "{}");
  t("le registre partage recoit « envoye »", reg2[REF] === "envoye",
    "registre : " + JSON.stringify(reg2));

  /* ===== 6. L'HISTORIQUE PARLE DE DEVIS, PAS DE FACTURE ============ */
  const hist = (w.document.getElementById("histlist") || {}).textContent || "";
  t("l'historique trace l'envoi", /Envoyé au client/.test(hist),
    "historique : " + hist.replace(/\s+/g, " ").trim().slice(0, 70));
  t("plus d'avoirs ni de paiements dans l'historique d'un devis",
    !/Avoir|Paiement reçu|soldée/.test(hist),
    "un devis ne se paie pas et ne recoit pas d'avoir");
  t("« Devis créé » est accorde au masculin",
    /Devis créé/.test(hist) && !/Devis créée/.test(hist));

  console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
  process.exit(ko ? 1 : 0);
})();
