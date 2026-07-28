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

  /* ===== 5. LA CARTOUCHE REFONDUE (28/07) ============================ */
  /* Ce qu'on scanne depuis le bureau : ou, quel nuisible, quel type. */
  w = await agenda({ boite: [inter({ client: "Roger Seguin", cp: "77860", ville: "Xouilluy Pont au Dame" })] });
  const src = fs.readFileSync(path.join(__dirname, "..", "calendrier.html"), "utf8");

  t("la cartouche porte le code postal ET la ville sur la meme ligne",
    /<div class="lloc"><b>\$\{v\.cp\}<\/b> \$\{v\.ville\}/.test(src),
    "la ville etait reléguée sous le type");
  t("le nuisible a sa propre ligne", /<div class="lnui">/.test(src));
  t("le type d'intervention a la sienne", /<div class="ltyp">/.test(src));
  t("le client vient en dernier dans le DOM",
    src.indexOf('<div class="lcli">') > src.indexOf('<div class="ltyp">'),
    "l'ordre du DOM doit suivre l'ordre visuel, pour les lecteurs d'ecran");

  /* LE TEST QUI COMPTE : l'ordre de disparition. Avant, un creneau d'une heure
     masquait le type puis le client, en gardant le code postal seul — on
     perdait d'abord ce qui compte. */
  t("sur une heure, c'est le CLIENT qui disparait",
    /\.ev\.sm \.lcli\{display:none\}/.test(src),
    "le moins important doit partir en premier");
  t("sur trente minutes, il reste « ou » et « quoi »",
    /\.ev\.xs \.lcli,\.ev\.xs \.ltyp\{display:none\}/.test(src));
  t("le code postal n'est jamais masque",
    !/\.ev\.(sm|xs)[^{]*\.lloc\{display:none\}/.test(src));

  /* Les regles `order` faisaient diverger l'ordre lu de l'ordre affiche. */
  t("plus aucune regle `order` sur la cartouche",
    !/\.ev \.[a-z0-9]+\{order:/.test(src));

  /* Le code postal s'aligne d'une carte a l'autre : c'est ce qui remplace la
     pastille coloree des maquettes. */
  t("le code postal est en chiffres a largeur fixe",
    /\.ev \.lloc b\{[^}]*tabular-nums/.test(src),
    "sans cela les codes postaux ne s'alignent pas en colonne");

  /* ===== 6. LE MONTANT EN DOUBLE ==================================== */
  /* Le champ Montant se formate en « 80,00 € » a la saisie, et l'affichage
     rajoutait un euro : « 80,00 € € ». */
  const evM = new Function("m", src.match(/function evMontant\(m\)\{[\s\S]*?\n\}/)[0].replace(/^function evMontant\(m\)\{/, "").replace(/\n\}$/, ""));
  t("un montant deja formate ne recoit pas un second euro",
    evM("80,00 €") === " · 80,00\u00a0€", "obtenu : " + JSON.stringify(evM("80,00 €")));
  t("un montant nu recoit son euro",
    evM("80,00") === " · 80,00\u00a0€", "obtenu : " + JSON.stringify(evM("80,00")));
  t("un montant vide n'affiche rien", evM("") === "" && evM(null) === "");

  /* ===== 7. LE BAC EST REPLIE AU CHARGEMENT ======================== */
  w = await agenda({ boite: [inter()] });
  const tray = w.document.getElementById("tray");
  t("le bac s'ouvre replie", tray && tray.classList.contains("collapsed"),
    "deploye, il prend 140 px en permanence");
  t("le resume du bac annonce ce qu'il contient",
    /clique pour ouvrir/.test((w.document.getElementById("traysub") || {}).innerHTML || ""),
    "replie, cette ligne est tout ce qu'on voit du bac");

  /* ===== 8. LES PIECES JOINTES VIENNENT DU RAPPORT ================= */
  /* 28/07 — l'onglet fabriquait sa liste a partir de l'ETAT de l'intervention :
     une photo de stock choisie sur le type de nuisible, une signature dessinee
     en SVG, deux PDF inexistants. On remplissait un rapport avec ses propres
     photos et l'onglet montrait un rat d'archive. */
  const srcCal = fs.readFileSync(path.join(__dirname, "..", "calendrier.html"), "utf8");

  t("les pieces jointes lisent les photos du rapport",
    /REPORTS\[v\.id\]/.test(srcCal) && /R\.photos/.test(srcCal),
    "elles etaient fabriquees a partir de l'etat de l'intervention");
  t("les photos du rapport passent AVANT le jeu de demonstration",
    srcCal.indexOf("if(mesPhotos.length)") < srcCal.indexOf('else if(v.done && rapOk)'),
    "sinon la demonstration continuerait a masquer les vraies photos");
  t("la taille affichee est deduite du fichier",
    /function pjTaille/.test(srcCal),
    "afficher « 2,4 Mo » en dur sous une photo de 180 Ko est un mensonge de plus");

  /* On verifie le calcul de taille : c'est la seule partie qui produit un
     chiffre montre a l'utilisateur. */
  const pjT = new Function("return " + srcCal.match(/function pjTaille[\s\S]*?\n\}/)[0])();
  const faux = (n) => "data:image/jpeg;base64," + "A".repeat(Math.ceil(n * 4 / 3));
  t("une photo de 180 Ko s'annonce en Ko", /Ko$/.test(pjT(faux(180 * 1024))),
    "obtenu : " + pjT(faux(180 * 1024)));
  t("une photo de 2 Mo s'annonce en Mo", /Mo$/.test(pjT(faux(2 * 1048576))),
    "obtenu : " + pjT(faux(2 * 1048576)));
  t("une source vide ne produit pas de taille", pjT("") === "" && pjT(null) === "");

  console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
  process.exit(ko ? 1 : 0);
})();
