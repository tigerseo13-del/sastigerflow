/* ============================================================================
   photos.js — les photos des prestations sur les deux fiches
   Écrite le 28/07/2026.

   POURQUOI CETTE SUITE EXISTE
   La bibliothèque de l'atelier montre une photo par prestation. Les fiches
   récapitulatives, elles, affichaient un emoji : facture-detail.html ne
   regardait que `l.img`, et une ligne née d'un devis ou saisie à la main n'en
   porte pas. Les deux fiches retrouvent maintenant la photo par le NOM de la
   prestation, comme la bibliothèque.

   Le test compare les deux fiches AU CATALOGUE : si une prestation est ajoutée
   dans devis.html sans sa photo, la suite passe au rouge.

   Lancement : node tests/photos.js   (depuis la racine du dépôt)
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const RACINE = f => path.join(__dirname, "..", f);
const dev = fs.readFileSync(RACINE("devis.html"), "utf8");
const dd  = fs.readFileSync(RACINE("devis-detail.html"), "utf8");
const fd  = fs.readFileSync(RACINE("facture-detail.html"), "utf8");

let ok = 0, ko = 0;
const t = (nom, cond, detail) => {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nom); }
  else { ko++; console.log("  \x1b[31m✗\x1b[0m " + nom + (detail ? "\n      → " + detail : "")); }
};

/* Le catalogue de l'atelier fait foi. */
const i = dev.indexOf("const CATALOGUE");
const PRESTATIONS = [...dev.slice(i, dev.indexOf("];", i)).matchAll(/designation:"([^"]+)"/g)].map(m => m[1]);

const cles = src => {
  const j = src.indexOf("const CAT_PHOTO");
  if (j < 0) return null;
  return [...src.slice(j, src.indexOf("};", j)).matchAll(/\n\s*"([^"]+)":/g)].map(m => m[1]);
};

console.log("\nphotos des prestations\n");

t("le catalogue de l'atelier expose " + PRESTATIONS.length + " prestations", PRESTATIONS.length > 0);

[["devis-detail.html", dd], ["facture-detail.html", fd]].forEach(([nom, src]) => {
  const k = cles(src);
  t(nom + " porte une table de photos", !!k, "aucune table CAT_PHOTO");
  if (!k) return;

  /* Le test central : aucune prestation du catalogue ne doit rester sans
     photo sur la fiche. Ajouter une prestation dans devis.html sans sa photo
     fera tomber ce test — c'est exactement ce qu'on veut. */
  const orphelines = PRESTATIONS.filter(p => !k.includes(p));
  t(nom + " couvre les " + PRESTATIONS.length + " prestations du catalogue",
    orphelines.length === 0, "sans photo : " + orphelines.join(" | "));

  /* La ligne peut porter sa propre image (devis anciens) : elle a la priorité,
     la table n'est qu'un dernier recours. */
  t(nom + " préfère l'image portée par la ligne",
    /l\.img \|\| CAT_PHOTO/.test(src),
    "l'image enregistrée doit primer sur la table");

  /* Le repli emoji doit rester : si la photo ne charge pas, on ne veut pas
     d'une case vide. */
  t(nom + " garde le repli emoji si la photo ne charge pas",
    /onerror=[^>]*lemoji/.test(src));
});

/* Les deux fiches doivent montrer LA MÊME vignette pour une prestation
   donnée : deux tables qui divergent, c'est deux écrans qui se contredisent. */
const url = (src, presta) => {
  const j = src.indexOf("const CAT_PHOTO");
  const m = src.slice(j, src.indexOf("};", j)).match(new RegExp('"' + presta.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '":\\s*"([^"]+)"'));
  return m ? m[1] : null;
};
const divergentes = PRESTATIONS.filter(p => url(dd, p) !== url(fd, p));
t("les deux fiches montrent la même photo pour une même prestation",
  divergentes.length === 0, "divergent : " + divergentes.join(" | "));

/* Les vignettes de l'atelier et des fiches viennent du même fonds. */
t("les photos des fiches sont celles de la bibliothèque de l'atelier",
  PRESTATIONS.every(p => {
    const u = url(dd, p);
    if (!u) return false;
    const fichier = u.split("/").pop().replace(/^\d+px-/, "");
    return dev.includes(fichier);
  }),
  "une fiche montre une image absente de la bibliothèque");

console.log("\n  " + ok + " vert" + (ok > 1 ? "s" : "") + ", " + ko + " rouge" + (ko > 1 ? "s" : "") + "\n");
process.exit(ko ? 1 : 0);
