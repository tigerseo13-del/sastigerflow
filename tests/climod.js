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

  /* ===== 4 bis. LE FORMULAIRE S'OUVRE VIERGE ========================= */
  /* Le brouillon automatique pre-remplissait « Ajouter un client » avec la
     saisie precedente. Il etait enregistre PAR POSITION de champ : au moindre
     changement de forme du formulaire — type de client, blocs deplies — tout
     se decalait d'un cran et l'adresse recevait le code postal. */
  const vierge = await new Promise(resolve => {
    const dom = new JSDOM(srcNouv, {
      runScripts: "dangerously", url: "https://x/client-nouveau.html",
      beforeParse(w) {
        w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
        w.HTMLCanvasElement.prototype.getContext = () => null;
        w.supabase = { createClient: () => ({ auth:{getSession:async()=>({data:{session:null}})}, from:()=>({}) }) };
        /* un brouillon comme il en trainait dans les navigateurs */
        w.localStorage.setItem("tigerflow-client-brouillon", JSON.stringify(
          {vals:["francis","UNDERWOOD","04 44 44 44 44","75011","Paris","France"], TYPE:"part", revealed:[]}));
      }
    });
    setTimeout(() => resolve(dom.window), 120);
  });
  t("le formulaire de creation s'ouvre vierge",
    ["f-nom","f-nomp","f-prenom","f-tel1","f-adr","f-cp","f-ville"]
      .every(id => { const e = vierge.document.getElementById(id); return !e || !e.value; }),
    "champs remplis : " + ["f-nom","f-nomp","f-prenom","f-tel1","f-adr","f-cp","f-ville"]
      .filter(id => { const e = vierge.document.getElementById(id); return e && e.value; }).join(", "));
  t("le brouillon qui trainait est efface du navigateur",
    vierge.localStorage.getItem("tigerflow-client-brouillon") === null);
  t("plus aucune restauration par position dans le code",
    !/els\[i\]/.test(srcNouv),
    "c'est la restauration par index qui decalait les champs");

  /* ===== 4 ter. LA SOURCE DU CLIENT ================================== */
  /* 28/07 — le formulaire demandait « Source du client » et jetait la reponse :
     elle n'etait enregistree nulle part. La fiche affichait donc un badge
     « Cree a la main », qui parle de la SAISIE et non du client, a la place
     d'une information commerciale utile. */
  const srcW = await ouvrirEnModification({
    nom: CLIENT.nom, session: true,
    enBase: { ...CLIENT, source: "Recommandation" }
  });
  t("le champ Source porte un identifiant explicite",
    !!srcW.document.getElementById("f-source"),
    "il s'appelait f-clientn-7, un identifiant genere");
  t("la source est reproposee en modification",
    val(srcW, "f-source") === "Recommandation",
    "vu : " + val(srcW, "f-source"));

  srcW.document.getElementById("f-source").value = "Partenaire";
  srcW.saveClient();
  await new Promise(r => setTimeout(r, 60));
  t("la source part vers la base",
    srcW.__ecrit && srcW.__ecrit.r.source === "Partenaire",
    "envoye : " + JSON.stringify(srcW.__ecrit && srcW.__ecrit.r.source));

  const cacheSrc = JSON.parse(srcW.localStorage.getItem("tigerflow-clients-cache") || "[]");
  t("la copie locale transporte aussi la source",
    (cacheSrc.find(x => x.nom === CLIENT.nom) || {}).source === "Partenaire");

  /* Le badge de la fiche ne doit plus jamais annoncer le mode de saisie. */
  t("la fiche client n'affiche plus « Créé à la main »",
    !/Cr\\u00e9\\u00e9 \\u00e0 la main|Créé à la main/.test(srcFiche),
    "ce badge parle de la saisie, pas du client");
  t("le badge est masqué quand aucune source n'est renseignée",
    /srcb\.style\.display = "none"/.test(srcFiche),
    "un badge vide vaut mieux qu'un badge creux");

  /* ===== 4 quater. LA FICHE CLIENT ================================== */
  const ficheClient = (c, seed) => new Promise(resolve => {
    const dom = new JSDOM(srcFiche, {
      runScripts: "dangerously", url: "https://x/client.html?c=" + encodeURIComponent(c),
      beforeParse(w) {
        w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
        w.HTMLCanvasElement.prototype.getContext = () => null;
        w.Element.prototype.scrollIntoView = function(){}; w.scrollTo = () => {};
        w.supabase = { createClient: () => ({ auth:{getSession:async()=>({data:{session:null}})}, from:()=>({select:()=>({eq:()=>({limit:async()=>({data:[],error:null})})})}) }) };
        Object.keys(seed || {}).forEach(k => w.localStorage.setItem(k, JSON.stringify(seed[k])));
      }
    });
    setTimeout(() => resolve(dom.window), 600);
  });

  const SEED = {
    "tigerflow-inbox-devis": [{ ref:"DEV-1", client:"belfort jordan", titre:"Cafards", date:"2026-07-28" }],
    "tigerflow-inbox-factures": [{ ref:"FAC-1", client:"belfort jordan", titre:"Désinfection", date:"2026-07-26" }],
    "tigerflow-added-interventions": [{ client:"belfort jordan", ville:"Versailles", type:"rongeur", date:"2026-08-02" }]
  };

  /* LA FUITE DES NOTES. La cle etait figee sur un seul identifiant : toutes
     les fiches partageaient les memes notes internes, codes d'acces compris. */
  const wA = await ficheClient("belfort jordan", SEED);
  const wB = await ficheClient("Hôtel du Parc", SEED);
  t("la clé des notes suit le client affiché",
    wA.eval("NKEY") !== wB.eval("NKEY"),
    "deux clients partagent le même carnet : " + wA.eval("NKEY"));
  t("un client réel démarre avec un carnet vide",
    wA.eval("notesGet()").length === 0,
    "il héritait des notes de démonstration d'un autre dossier");

  /* Le resume d'activite, construit sur les vraies pieces. */
  const lignes = [...wA.document.querySelectorAll("#actlist li")];
  t("la fiche client montre un résumé d'activité", lignes.length === 3,
    lignes.length + " ligne(s) au lieu de 3");
  t("le résumé est trié du plus récent au plus ancien",
    /Intervention/.test(lignes[0].textContent) && /Facture/.test(lignes[2].textContent),
    lignes.map(l => l.textContent.replace(/\s+/g, " ").trim().slice(0, 24)).join(" | "));
  t("chaque ligne mène à sa pièce",
    lignes.every(l => /location\.href/.test(l.getAttribute("onclick") || "")));

  const vide = await ficheClient("client sans rien", SEED);
  t("un client sans historique le dit au lieu d'un exemple",
    /Rien encore/.test(vide.document.querySelector("#actlist li").textContent));

  /* 28/07 — « !nom || … » laissait TOUT passer quand l'URL ne portait pas de
     client : la fiche affichait les devis et factures de TOUS les clients,
     alors que ses propres compteurs annonçaient zéro. */
  const sansC = await new Promise(resolve => {
    const dom = new JSDOM(srcFiche, {
      runScripts: "dangerously", url: "https://x/client.html",
      beforeParse(w) {
        w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
        w.HTMLCanvasElement.prototype.getContext = () => null;
        w.Element.prototype.scrollIntoView = function(){}; w.scrollTo = () => {};
        w.supabase = { createClient: () => ({ auth:{getSession:async()=>({data:{session:null}})}, from:()=>({select:()=>({eq:()=>({limit:async()=>({data:[],error:null})})})}) }) };
        Object.keys(SEED).forEach(k => w.localStorage.setItem(k, JSON.stringify(SEED[k])));
      }
    });
    setTimeout(() => resolve(dom.window), 600);
  });
  const lig = [...sansC.document.querySelectorAll("#actlist li")];
  t("sans client dans l'URL, aucune pièce d'autrui n'est affichée",
    lig.length === 1 && /Ouvrez la fiche/.test(lig[0].textContent),
    lig.length + " ligne(s) : " + lig.map(l => l.textContent.trim().slice(0, 22)).join(" | "));

  /* Les noms de classes generiques (.ic, .tx, .dt, .vide) entraient en
     collision avec le reste de la page — .dt habille aussi les tableaux. */
  t("les classes du résumé sont préfixées",
    /\.act-ic|\.act-tx|\.act-dt/.test(srcFiche) && !/\.actl \.dt\{/.test(srcFiche),
    "des noms génériques entrent en collision dans une page de cette taille");

  /* Les cartes ne s'etirent plus l'une sur l'autre. */
  t("les cartes prennent leur hauteur naturelle",
    /\.grid\{[^}]*align-items:start/.test(srcFiche),
    "la carte Contacts s'etirait a la hauteur des notes");

  /* ===== 4 quinquies. LE RESTE À ENCAISSER ========================== */
  /* Rien n'affichait cette information sur la fiche : il fallait ouvrir
     l'onglet Factures et faire le compte a la main. */
  const FACT = {
    "tigerflow-inbox-factures": [
      { ref:"FAC-1", client:"Hôtel du Parc", montant:1596, date:"2026-07-01", valid:"2026-07-20" },
      { ref:"FAC-2", client:"Hôtel du Parc", montant:500,  date:"2026-07-10", valid:"2026-09-01" },
      { ref:"FAC-3", client:"Bon Payeur",    montant:300,  date:"2026-07-01", valid:"2026-08-01" },
      { ref:"FAC-4", client:"Pro Forma SA",  montant:900,  date:"2026-07-01", valid:"2026-08-01" }],
    "tigerflow-factures-paiements": { "FAC-1":[{m:596}], "FAC-3":[{m:300}] },
    "tigerflow-factures-statuts": { "FAC-1":"attente", "FAC-2":"attente", "FAC-3":"payee", "FAC-4":"brouillon" }
  };
  const du = async c => {
    const w2 = await ficheClient(c, FACT);
    const b2 = w2.document.getElementById("q-du");
    return { visible: b2 && b2.style.display !== "none",
             txt: (w2.document.getElementById("q-du-m") || {}).textContent || "",
             w: w2 };
  };

  let r = await du("Hôtel du Parc");
  t("un client qui doit de l'argent voit son reste à encaisser", r.visible);
  t("le montant déduit les paiements déjà reçus",
    /1\s*500,00/.test(r.txt), "affiché : « " + r.txt.replace(/\s+/g, " ").trim() + " »");
  t("le nombre de factures concernées est indiqué", /2 factures/.test(r.txt));
  t("le retard est signalé quand une échéance est dépassée", /en retard/.test(r.txt));

  r = await du("Bon Payeur");
  t("un client à jour ne voit aucune cartouche",
    !r.visible, "une cartouche à zéro occuperait la place sans rien dire");

  r = await du("Pro Forma SA");
  t("une pro forma n'est pas réclamée", !r.visible,
    "un document non validé ne se réclame pas");

  /* LE PIÈGE : la fiche réécrit les cartouches PAR POSITION. Ajouter une
     cartouche en tête décalait tout d'un cran — le CA total atterrissait
     dans « À encaisser ». Même piège que le brouillon du formulaire. */
  const cart = [...r.w.document.querySelectorAll(".hero .quick .q")]
    .map(x => (x.querySelector("small") || {}).textContent);
  t("les autres cartouches n'ont pas été décalées",
    cart[1] === "CA total" && cart[2] === "Interventions",
    "vues : " + cart.join(" | "));

  /* ===== 4 sexies. LES ONGLETS D'UN CLIENT NEUF ==================== */
  /* 28/07 — les onglets d'un client sans historique etaient ECRASES en entier :
     l'en-tete de la carte partait avec le contenu, donc plus de titre, plus de
     « Tous les devis », plus de « + Creer un devis ». Le bouton d'action
     changeait de place d'un client a l'autre — en haut a droite chez les uns,
     au milieu du vide chez les autres. */
  const neuf = await ficheClient("jordan belfort", {});
  const ONGLETS = ["devis", "ctr", "fact", "histint", "equip"];
  const sansTete = ONGLETS.filter(k => {
    const p = neuf.document.querySelector('[data-tab="' + k + '"]');
    return !p || !p.querySelector(".card-h");
  });
  t("chaque onglet garde son en-tête, même sans contenu",
    sansTete.length === 0, "sans en-tête : " + sansTete.join(", "));

  const sansBouton = ONGLETS.filter(k => {
    const te = neuf.document.querySelector('[data-tab="' + k + '"] .card-h');
    return !te || !te.querySelector(".addbtn");
  });
  t("le bouton d'action reste en haut de la carte",
    sansBouton.length <= 1, "sans bouton : " + sansBouton.join(", "));

  t("le message « aucun … » vient sous l'en-tête, pas à sa place",
    ONGLETS.every(k => neuf.document.querySelector('[data-tab="' + k + '"] .vinner')));

  const lien = neuf.document.querySelector('[data-tab="devis"] .card-h .addbtn');
  t("le bouton emporte le client courant",
    /devis\.html\?c=jordan/.test(lien.getAttribute("href") || ""),
    "lien : " + lien.getAttribute("href"));

  /* Un href="#" ne doit pas devenir "#?c=…". */
  const liens = [...neuf.document.querySelectorAll('.card-h a')].map(a2 => a2.getAttribute("href") || "");
  t("aucun lien creux n'a reçu le paramètre",
    !liens.some(h => h.startsWith("#?")), liens.filter(h => h.startsWith("#?")).join(" "));

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
