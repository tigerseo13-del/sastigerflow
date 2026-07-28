/* ============================================================================
   base.js — ce qui arrive vraiment dans Supabase
   Écrite le 28/07/2026.

   POURQUOI CETTE SUITE EXISTE
   Question du patron : « Supabase sauvegarde les infos ou pas ? »
   Réponse trouvée en lisant le code : clients, interventions et tâches oui ;
   devis, factures et contrats NON.

     — devis et factures appelaient une fonction qui lisait cinq champs
       inexistants (f-num, f-client, f-titre, f-valid, t-ttc) alors que les
       ateliers emploient v-client, v-objet, v-ttc, v-valid. La première ligne
       levait « Cannot read properties of null », et le catch l'avalait en mode
       silencieux. Aucun signal, aucune ligne en base.
     — la facture insérait de surcroît dans la table DEVIS.
     — les contrats n'avaient AUCUN code d'écriture.

   Ces tests remplissent un formulaire et regardent ce qui part vers la base :
   quelle table, quelles colonnes, quelles valeurs. C'est la seule façon de
   savoir — l'ancienne version « marchait » à l'écran tout en n'écrivant rien.

   Lancement : node tests/base.js   (depuis la racine du dépôt)
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

/* Monte une page avec une session ouverte et espionne les ecritures. */
function page(fichier, url) {
  return new Promise(resolve => {
    const dom = new JSDOM(fs.readFileSync(RACINE(fichier), "utf8"), {
      runScripts: "dangerously", url: "https://x/" + (url || fichier),
      beforeParse(w) {
        w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
        w.HTMLCanvasElement.prototype.getContext = () => null;
        w.Element.prototype.scrollIntoView = function(){};
        w.scrollTo = () => {}; w.print = () => {}; w.confirm = () => true;
        w.__ecrits = [];
        w.supabase = { createClient: () => ({
          auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
          channel: () => ({ on: () => ({ subscribe: () => {} }) }),
          from: table => ({
            select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }),
                             order: async () => ({ data: [], error: null }) }),
            insert: async row => { w.__ecrits.push({ table, op: "insert", row }); return { error: null }; },
            update: row => ({ eq: async () => { w.__ecrits.push({ table, op: "update", row }); return { error: null }; } })
          })
        })};
      }
    });
    setTimeout(() => resolve(dom.window), 800);
  });
}

const ecrit = (w, table) => (w.__ecrits || []).find(x => x.table === table);

(async function () {
  console.log("\nécriture dans Supabase\n");

  /* ===== 1. DEVIS ==================================================== */
  let w = await page("devis.html");
  t("devis.html : la fonction d'écriture existe", typeof w.sbSaveDevis === "function");

  /* On remplit comme un utilisateur, avec les VRAIS identifiants. */
  /* v-client est une LISTE DEROULANTE : poser une valeur absente des options
     ne prend pas. On ajoute l'option, comme le fait le selecteur de client
     quand il charge les clients du logiciel. */
  const put = (w2, id, v) => {
    const e = w2.document.getElementById(id);
    if (!e) return;
    if (e.tagName === "SELECT" && ![...e.options].some(o => o.value === v)) {
      const o = w2.document.createElement("option");
      o.value = o.textContent = v; e.appendChild(o);
    }
    e.value = v;
  };
  put(w, "v-client", "tiger tiger");
  put(w, "v-objet", "Traitement cafards");
  const ttcEl = w.document.getElementById("v-ttc");
  if (ttcEl) ttcEl.textContent = "330,00 €";
  await w.sbSaveDevis("brouillon", true);
  await new Promise(r => setTimeout(r, 60));

  let e = ecrit(w, "devis");
  t("un devis part bien vers la table « devis »", !!e,
    "tables touchées : " + (w.__ecrits || []).map(x => x.table).join(", ") || "aucune");
  if (e) {
    t("il porte son numéro", /^DEV-/.test(e.row.numero || ""), "numero : " + e.row.numero);
    t("il porte le client saisi", e.row.client === "tiger tiger", "client : " + e.row.client);
    t("il porte l'objet saisi", e.row.titre === "Traitement cafards", "titre : " + e.row.titre);
    t("le montant est lu depuis le total affiché", e.row.montant_ttc === 330,
      "montant_ttc : " + e.row.montant_ttc);
    t("la colonne du montant est bien montant_ttc", "montant_ttc" in e.row,
      "colonnes : " + Object.keys(e.row).join(", "));
  }

  /* ===== 2. FACTURE ================================================= */
  w = await page("facture.html");
  put(w, "v-client", "Hôtel du Parc");
  put(w, "v-objet", "Désinfection");
  const ttcF = w.document.getElementById("v-ttc");
  if (ttcF) ttcF.textContent = "616,00 €";
  await w.sbSaveDevis("brouillon", true);
  await new Promise(r => setTimeout(r, 60));

  t("une facture ne part PLUS dans la table devis", !ecrit(w, "devis"),
    "elle partait dans le mauvais tuyau");
  e = ecrit(w, "factures");
  t("une facture part vers la table « factures »", !!e,
    "tables touchées : " + (w.__ecrits || []).map(x => x.table).join(", ") || "aucune");
  if (e) {
    t("elle porte son numéro", /^FAC-/.test(e.row.numero || ""), "numero : " + e.row.numero);
    t("la colonne du montant est « montant », pas « montant_ttc »",
      "montant" in e.row && !("montant_ttc" in e.row),
      "colonnes : " + Object.keys(e.row).join(", "));
    t("l'échéance est dans « echeance »", "echeance" in e.row);
    t("elle porte le client saisi", e.row.client === "Hôtel du Parc", "client : " + e.row.client);
  }

  /* ===== 3. CONTRAT ================================================= */
  w = await page("contrat-nouveau.html");
  t("contrat-nouveau.html : la fonction d'écriture existe",
    typeof w.sbSaveContrat === "function", "cette page n'en avait aucune");

  await w.sbSaveContrat({ ref:"CTR-2026-00042", client:"Syndic Foncia", titre:"Dératisation annuelle",
                          montant:1200, freq:"Annuelle", statut:"actif", fin:"2027-07-28", nbint:12, renouv:true });
  await new Promise(r => setTimeout(r, 60));
  e = ecrit(w, "contrats");
  t("un contrat part vers la table « contrats »", !!e,
    "tables touchées : " + (w.__ecrits || []).map(x => x.table).join(", ") || "aucune");
  if (e) {
    t("il porte son numéro et son client",
      e.row.numero === "CTR-2026-00042" && e.row.client === "Syndic Foncia");
    t("le montant va dans montant_ttc", e.row.montant_ttc === 1200,
      "colonnes : " + Object.keys(e.row).join(", "));
    t("la fréquence et la date de fin suivent",
      e.row.frequence === "Annuelle" && e.row.date_fin === "2027-07-28");
  }

  /* ===== 4. L'ÉCHEC NE DOIT PLUS ÊTRE MUET ========================== */
  /* C'est ce qui a permis au bug de vivre : le catch avalait tout en mode
     silencieux, celui de l'enregistrement automatique. */
  [["devis.html", "devis"], ["facture.html", "facture"], ["contrat-nouveau.html", "contrat"]].forEach(([f]) => {
    const src = fs.readFileSync(RACINE(f), "utf8");
    const bloc = src.slice(src.indexOf("catch(e){", src.indexOf("SB.from(")));
    t(f + " signale un échec d'écriture",
      /toast\(/.test(bloc.slice(0, 220)) && !/if\(!silent\)\s*toast/.test(bloc.slice(0, 220)),
      "un échec silencieux est ce qui a permis au bug de vivre six mois");
  });

  /* ===== 5. PLUS AUCUN CHAMP FANTÔME ================================ */
  ["devis.html", "facture.html"].forEach(f => {
    const src = fs.readFileSync(RACINE(f), "utf8");
    const morts = ["f-num", "f-titre", "t-ttc"].filter(id => src.includes('"' + id + '"'));
    t(f + " n'appelle plus de champ inexistant",
      morts.length === 0, "encore lus : " + morts.join(", "));
  });

  console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
  process.exit(ko ? 1 : 0);
})();
