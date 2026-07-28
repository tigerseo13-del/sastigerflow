/* ============================================================================
   climod.js — modification d'un client
   Écrite le 28/07/2026.

   POURQUOI CETTE SUITE EXISTE
   « Modifier la fiche » n'affichait qu'un message : le bouton n'avait jamais
   été branché, et aucune page ne savait modifier un client. client-nouveau.html
   sert maintenant aux deux, selon qu'elle reçoit ?c=<nom> ou non.

   Le test le plus important est celui du NOM VERROUILLÉ. Tout le logiciel
   désigne un client par son nom : renommer ici détacherait le client de ses
   devis, contrats et factures, sans le moindre message.

   Lancement : node tests/climod.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const RACINE = path.join(__dirname, "..");
const srcNouv = fs.readFileSync(path.join(RACINE, "client-nouveau.html"), "utf8");
const srcFiche = fs.readFileSync(path.join(RACINE, "client.html"), "utf8");

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

const CLIENT = {
  nom: "tiger tiger", type: "particulier", contact: "tiger",
  tel: "04 44 44 44 44", adresse: "3 rue des Lilas",
  cp: "75011", ville: "Paris", siret: null
};

/* Monte client-nouveau.html avec ?c=, bouchonne la base, laisse tourner. */
async function ouvrirEnModification({ nom, local = [CLIENT], session = false, enBase = null }) {
  const dom = new JSDOM(srcNouv, {
    runScripts: "dangerously",
    url: "https://x/client-nouveau.html?c=" + encodeURIComponent(nom),
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.scrollTo = () => {};
      w.supabase = { createClient: () => ({
        auth: { getSession: async () => ({ data: { session: session ? { user: 1 } : null } }) },
        from: () => ({
          select: () => ({ eq: () => ({ limit: async () => ({ data: enBase ? [enBase] : [], error: null }) }) }),
          insert: async r => { w.__ecrit = { op: "insert", r }; return { error: null }; },
          update: r => ({ eq: async (col, v) => { w.__ecrit = { op: "update", r, col, v }; return { error: null }; } })
        })
      })};
      w.localStorage.setItem("tigerflow-inbox-clients", JSON.stringify(local));
    }
  });
  await new Promise(r => setTimeout(r, 120));
  return dom.window;
}

const val = (w, id) => { const e = w.document.getElementById(id); return e ? e.value : null; };

(async function () {
  console.log("\nmodification d'un client\n");

  /* ===== 1. LE BOUTON EST BRANCHÉ ====================================== */
  t("« Modifier la fiche » n'affiche plus un simple message",
    !/toast\('Modification de la fiche/.test(srcFiche));
  t("« Modifier la fiche » mène à la page de modification avec le client",
    /client-nouveau\.html\?c='\+encodeURIComponent/.test(srcFiche));

  /* ===== 2. LA FICHE SE PRÉ-REMPLIT ==================================== */
  let w = await ouvrirEnModification({ nom: CLIENT.nom });

  t("le téléphone est repris", val(w, "f-tel1") === CLIENT.tel, "vu : " + val(w, "f-tel1"));
  t("l'adresse est reprise", val(w, "f-adr") === CLIENT.adresse, "vu : " + val(w, "f-adr"));
  t("le code postal est repris", val(w, "f-cp") === CLIENT.cp);
  t("la ville est reprise", val(w, "f-ville") === CLIENT.ville);
  t("le titre annonce la modification, pas une création",
    /Modifier/.test(w.document.querySelector("h1").textContent),
    "vu : « " + w.document.querySelector("h1").textContent + " »");

  /* ===== 3. LE NOM EST VERROUILLÉ — le test central =================== */
  const champNom = w.document.getElementById("f-nomp");
  t("le nom d'un particulier est en lecture seule", champNom && champNom.readOnly === true);
  t("la raison du verrouillage est écrite à l'écran, pas seulement dans le code",
    /n'est pas modifiable|ne peut pas être changé/.test(w.document.body.textContent),
    "un champ grisé sans explication passe pour une panne");

  /* ===== 4. ON MET À JOUR, ON NE CRÉE PAS UN DOUBLON ================== */
  w = await ouvrirEnModification({ nom: CLIENT.nom, session: true, enBase: CLIENT });
  w.document.getElementById("f-adr").value = "9 avenue Neuve";
  w.saveClient();
  await new Promise(r => setTimeout(r, 60));
  t("l'enregistrement met à jour au lieu d'insérer",
    w.__ecrit && w.__ecrit.op === "update",
    "opération : " + (w.__ecrit ? w.__ecrit.op : "aucune"));
  t("la mise à jour vise bien ce client",
    w.__ecrit && w.__ecrit.v === CLIENT.nom);
  t("la nouvelle adresse part vers la base",
    w.__ecrit && w.__ecrit.r.adresse === "9 avenue Neuve");

  /* LE TEST QUI A ATTRAPE LE PIRE DEFAUT. Le champ etait bien en lecture
     seule, mais pour un particulier le nom est recolle a partir du prenom et
     du nom de famille : la recomposition rallongeait le nom a chaque
     enregistrement (« tiger tiger » -> « tiger tiger tiger »), detachant le
     client de ses devis et contrats sans un message. */
  t("le nom envoye est EXACTEMENT celui d'origine",
    w.__ecrit && w.__ecrit.r.nom === CLIENT.nom,
    "envoye : « " + (w.__ecrit ? w.__ecrit.r.nom : "?") + " » au lieu de « " + CLIENT.nom + " »");

  /* Le doublon était le piège : inboxPush empilait une seconde ligne. */
  const boite = JSON.parse(w.localStorage.getItem("tigerflow-inbox-clients") || "[]");
  t("le client n'apparaît pas deux fois dans la copie locale",
    boite.filter(x => x.nom === CLIENT.nom).length === 1,
    boite.filter(x => x.nom === CLIENT.nom).length + " lignes portent ce nom");

  /* Le cache alimente les sélecteurs des devis et contrats. */
  const cache = JSON.parse(w.localStorage.getItem("tigerflow-clients-cache") || "[]");
  const vu = cache.find(x => x.nom === CLIENT.nom);
  t("le cache des sélecteurs reçoit la nouvelle adresse",
    vu && vu.adresse === "9 avenue Neuve",
    "sinon devis et contrats gardent l'ancienne");

  /* ===== 5. SANS ?c=, C'EST TOUJOURS UNE CRÉATION ===================== */
  const dom = new JSDOM(srcNouv, {
    runScripts: "dangerously", url: "https://x/client-nouveau.html",
    beforeParse(w2) {
      w2.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
      w2.HTMLCanvasElement.prototype.getContext = () => null;
      w2.supabase = { createClient: () => ({ auth:{getSession:async()=>({data:{session:null}})}, from:()=>({}) }) };
    }
  });
  await new Promise(r => setTimeout(r, 120));
  t("sans référence dans l'URL, la page reste une création",
    /Ajouter un client/.test(dom.window.document.querySelector("h1").textContent));
  t("le champ du nom reste modifiable en création",
    dom.window.document.getElementById("f-nom").readOnly === false);

  console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
  process.exit(ko ? 1 : 0);
})();
