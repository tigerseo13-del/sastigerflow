/* ============================================================================
   facparcours.js — le trajet complet d'une facture
   Écrite le 28/07/2026, à la demande du patron : « simule une facture,
   pro forma, envoi, validation, encaissement, avoir — y a des bugs ? »

   Oui, il y en avait trois, et le premier expliquait les deux autres.

   1. Une facture neuve s'annonçait « À payer ». Le statut par défaut était
      « attente » : un document jamais validé se présentait comme payable.
   2. Conséquence directe : la bascule de l'envoi, « si brouillon alors à
      payer », n'était JAMAIS vraie. Le registre des statuts restait vide de
      bout en bout, et le statut ne suivait jamais le parcours.
   3. Un acompte ne changeait rien. « Partiellement payée » existait dans les
      libellés et dans le calcul du reste à encaisser, mais personne ne le
      posait jamais.

   Cette suite parcourt le trajet du début à la fin. Elle ne teste pas des
   fonctions isolées : elle suit UNE facture, comme un utilisateur.

   Lancement : node tests/facparcours.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const RACINE = f => path.join(__dirname, "..", f);

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

const REF = "FAC-2026-90001";
const FACTURE = {
  ref: REF, client: "Hôtel du Parc", titre: "Désinfection locaux",
  montant: 242, ht: 220, tva: 10, date: "2026-07-28", valid: "2026-08-27",
  lignes: [{ designation: "Désinfection locaux", qte: 1, pu: 220, tva: 10 }]
};

/* Le stockage survit d'une page à l'autre, comme dans un vrai navigateur. */
const S = {
  "tigerflow-inbox-factures": JSON.stringify([FACTURE]),
  "tigerflow-clients-cache": JSON.stringify([{ nom: "Hôtel du Parc", adresse: "1 avenue", cp: "94300", ville: "Vincennes" }])
};

function ouvrir(fichier, url) {
  return new Promise(resolve => {
    const dom = new JSDOM(fs.readFileSync(RACINE(fichier), "utf8"), {
      runScripts: "dangerously", url: "https://x/" + url,
      beforeParse(w) {
        w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
        w.HTMLCanvasElement.prototype.getContext = () => null;
        w.Element.prototype.scrollIntoView = function(){};
        w.scrollTo = () => {}; w.print = () => {};
        w.supabase = { createClient: () => ({
          auth: { getSession: async () => ({ data: { session: null } }) },
          from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) })
        })};
        Object.keys(S).forEach(k => w.localStorage.setItem(k, S[k]));
        w.__err = [];
        w.addEventListener("error", e => w.__err.push(String((e.error && e.error.message) || e.message)));
      }
    });
    setTimeout(() => resolve(dom.window), 700);
  });
}

/* On recopie le stockage AU MOMENT de changer de page, pas au chargement :
   sinon tout ce que l'utilisateur fait sur la page est perdu au passage a la
   suivante. La premiere version de ce banc d'essai capturait a l'ouverture et
   signalait trois bugs inexistants. */
function sauver(w){
  if(!w) return;
  for (let i = 0; i < w.localStorage.length; i++) {
    const k = w.localStorage.key(i);
    S[k] = w.localStorage.getItem(k);
  }
}
let W = null;
const fiche = async () => { sauver(W); W = await ouvrir("facture-detail.html", "facture-detail.html?ref=" + REF); return W; };
const badge = w => { const b = w.document.getElementById("h-badge"); return b ? b.querySelector("span").textContent.trim() : "?"; };
const primaire = w => { const p = w.document.getElementById("a-primary"); return p ? p.textContent.trim() : "?"; };

(async function () {
  console.log("\ntrajet complet d'une facture\n");

  /* ===== 1. FACTURE NEUVE : PRO FORMA ================================ */
  let w = await fiche();
  t("aucune erreur au chargement", w.__err.length === 0, w.__err.slice(0, 2).join(" | "));
  t("une facture jamais validée s'annonce « Pro forma »",
    badge(w) === "Pro forma",
    "elle affichait « À payer » : un document non validé se présentait comme payable");
  /* Cette attente disait « et elle propose l'envoi ». Elle datait d'avant la
     separation des deux modes : sur une pro forma, le geste qui compte est la
     VALIDATION, pas l'envoi. L'envoi en pro forma reste dans le menu. */
  t("et elle propose de la valider", /Valider/.test(primaire(w)),
    "bouton : « " + primaire(w) + " »");

  /* ===== 1 bis. UNE PRO FORMA N'EST PAS UNE FACTURE ================= */
  /* 28/07 — la fiche affichait toute la machinerie d'une facture sur un
     document non valide : « Encaisser la facture », les onglets Paiements et
     Avoirs, un « solde du a encaisser ». Une pro forma ne se paie pas, ne
     recoit pas d'avoir, et ne doit rien. C'est ce melange qui rendait le
     parcours incomprehensible. */
  const vu = (w2, id) => { const e = w2.document.getElementById(id); return e && e.style.display !== "none"; };

  t("sur une pro forma, le bouton principal propose de VALIDER",
    /Valider la facture/.test(primaire(w)), "bouton : « " + primaire(w) + " »");
  t("« Encaisser » est masqué sur une pro forma", !vu(w, "a-encaisser"),
    "on ne peut pas encaisser un document qui ne vaut pas facture");
  t("l'onglet Paiements est masqué", !vu(w, "tab-pai"));
  t("l'onglet Avoirs est masqué", !vu(w, "tab-avoirs"),
    "un avoir corrige une facture emise, pas une pro forma");
  t("le « solde dû » est masqué", !vu(w, "k-solde-tile"),
    "une pro forma ne doit rien");

  /* Validation depuis la fiche. */
  w.validerFacture2();
  await new Promise(r => setTimeout(r, 60));
  t("après validation, la facture passe « À payer »", badge(w) === "À payer",
    "affiché : « " + badge(w) + " »");
  t("« Encaisser » réapparaît", vu(w, "a-encaisser"));
  t("les onglets Paiements et Avoirs réapparaissent",
    vu(w, "tab-pai") && vu(w, "tab-avoirs"));
  t("le bouton principal redevient l'envoi", /Envoyer/.test(primaire(w)),
    "bouton : « " + primaire(w) + " »");

  /* On repart d'une fiche neuve pour la suite du parcours. */
  w = await fiche();

  /* ===== 2. ENVOI ==================================================== */
  w.envoyer();
  w.document.getElementById("s-to").value = "contact@hotelduparc.fr";
  w.document.getElementById("s-obj").value = "Votre facture";
  w.sendConfirm();
  await new Promise(r => setTimeout(r, 80));

  t("après envoi, la facture passe « À payer »",
    badge(w) === "À payer", "affiché : « " + badge(w) + " »");

  const reg = JSON.parse(w.localStorage.getItem("tigerflow-factures-statuts") || "{}");
  t("le registre des statuts enregistre le passage",
    reg[REF] === "attente",
    "il restait vide de bout en bout : registre = " + JSON.stringify(reg));

  const env = JSON.parse(w.localStorage.getItem("tigerflow-factures-envois") || "{}");
  t("l'envoi est tracé avec sa date et son destinataire",
    env[REF] && env[REF].date && env[REF].to === "contact@hotelduparc.fr");

  /* ===== 3. ACOMPTE ================================================= */
  /* On rouvre la fiche : c'est ce que fait l'utilisateur, et ça vérifie que
     le statut a bien été retenu et pas seulement affiché. */
  w = await fiche();
  t("le statut « À payer » survit au rechargement", badge(w) === "À payer");

  w.payAdd(100);
  await new Promise(r => setTimeout(r, 80));
  t("un acompte fait passer la facture « Partiellement payée »",
    badge(w) === "Partiellement payée",
    "elle restait « À payer » comme si rien n'était tombé — affiché : « " + badge(w) + " »");

  /* ===== 4. SOLDE =================================================== */
  w.payAdd(142);
  await new Promise(r => setTimeout(r, 80));
  t("le solde fait passer la facture « Payée »",
    badge(w) === "Payée", "affiché : « " + badge(w) + " »");
  t("une facture soldée propose le reçu",
    /reçu/i.test(primaire(w)), "bouton : « " + primaire(w) + " »");
  t("mais l'envoi reste accessible dans le menu",
    /envoyer/i.test((w.document.getElementById("fmenu") || { textContent: "" }).textContent));

  /* ===== 5. AVOIR =================================================== */
  w = await fiche();
  const av = JSON.parse(w.localStorage.getItem("tigerflow-factures-avoirs") || "{}");
  t("le registre des avoirs est joignable", typeof av === "object");
  t("l'onglet Avoirs existe sur la fiche",
    [...w.document.querySelectorAll(".tab")].some(b => /Avoirs/.test(b.textContent)));

  /* ===== 6. COHÉRENCE DU VOCABULAIRE ================================ */
  /* Les quatre mots du parcours, et aucun autre. */
  const vus = ["Pro forma", "À payer", "Partiellement payée", "Payée"];
  const src = fs.readFileSync(RACINE("facture-detail.html"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  t("les quatre états du parcours portent leur nom définitif",
    vus.every(m => src.includes(m)), "manquant : " + vus.filter(m => !src.includes(m)).join(", "));
  t("plus aucun « Brouillon » ni « En attente » sur la fiche facture",
    !/"Brouillon"|"En attente"/.test(src));

  console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
  process.exit(ko ? 1 : 0);
})();
