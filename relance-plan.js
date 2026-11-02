/* 29/10 (patron, « FAIS TOUT » après le parcours relance devis) — LE CALENDRIER
   DES RELANCES D'UN DEVIS, écrit UNE fois et lu par les 4 écrans : liste des
   devis, fiche du devis, fiche client, page Relance devis. Avant, chaque écran
   avait sa copie du calcul et ils ne disaient pas la même chose.
   Trois règles nouvelles :
   1. une relance faite À LA MAIN compte comme la prochaine relance ; les
      suivantes se décalent d'autant (clé tigerflow-relance-manuel {ref:[iso]}) ;
   2. aucune relance après la fin de validité (valid, sinon envoi + 30 j) ;
      la dernière qui reste avant l'échéance est marquée « derniere » ;
   3. un samedi / dimanche glisse au lundi (réglage « jours ouvrés »).
   relPlan(d) → {etat, motif, pub, seq, steps:[{i,n,date,iso,mail,sms,rem,fait,manuel,derniere}], next, valid}
   etat : actif | pause | exclu | coupe | nuisible | plancher | fini | expire | contact | horsjeu */
(function(){
  var J = function(k, df){ try{ var v = JSON.parse(localStorage.getItem(k)); return v == null ? df : v; }catch(e){ return df; } };
  var iso = function(x){ return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
  var jour = function(s){ var x = new Date(String(s).slice(0, 10) + "T00:00:00"); return isNaN(x) ? null : x; };
  var DEF = {part:[{j:3,rem:0,mail:true,sms:true},{j:7,rem:5,mail:true,sms:true},{j:14,rem:10,mail:true,sms:false}],
             pro:[{j:5,rem:0,mail:true},{j:12,rem:5,mail:true},{j:21,rem:8,mail:true}],
             syn:[{j:7,rem:0,mail:true},{j:15,rem:0,mail:true},{j:28,rem:5,mail:true}]};
  var CATS = [["rongeur","Rongeurs",/rongeur|rat\b|rats\b|souris|d[ée]ratis|mulot|taupe/i],["cafard","Cafards",/cafard|blatte/i],["punaise","Punaises",/punaise/i],["guepe","Guêpes",/gu[êe]pe|frelon|nid/i],["desinf","Désinfection",/d[ée]sinfect|bact[ée]r|virus|covid|nettoyage/i],["pigeon","Pigeons",/pigeon|volatile|oiseau/i],["chenille","Chenilles",/chenille|processionnaire/i],["fourmi","Fourmis",/fourmi/i]];
  window.relPub = function(nom, d){
    var f = (J("tigerflow-inbox-clients", []).concat(J("tigerflow-clients-cache", []))).find(function(c){ return c && c.nom === nom; });
    var t = f ? String(f.type || "").toLowerCase() : "";
    if(t.indexOf("synd") === 0) return "syn";
    if(t.indexOf("part") === 0) return "part";
    if(t) return "pro";
    if(d && d.pro) return "pro";   /* jeu de démo de la liste : le drapeau « pro » */
    return /syndic|copropri|r[ée]sidence/i.test(nom || "") ? "syn" : "part";
  };
  window.relCat = function(d){
    var txt = [d.titre].concat((d.lignes || []).map(function(l){ return (l.designation || "") + " " + (l.desc || ""); })).join(" ");
    return CATS.find(function(c){ return c[2].test(txt); }) || null;
  };
  window.relManuel = function(ref, dateIso){
    /* 02/11 (test complet) : la relance à la main remplace la PROCHAINE relance prévue
       (k), pas forcément la 1re — si la relance 1 auto est déjà partie, elle compte comme la 2. */
    var M = J("tigerflow-relance-manuel", {}); var L = M[ref] || [];
    var dv = (J("tigerflow-inbox-devis", [])).find(function(x){ return x && x.ref === ref; });
    var k = L.length;
    if(dv){ var R0 = relPlan(dv, "envoye"); k = R0.next ? R0.next.i : (R0.seq ? R0.seq.length : L.length); }
    L.push({d: dateIso || iso(new Date()), k: k}); M[ref] = L;
    try{ localStorage.setItem("tigerflow-relance-manuel", JSON.stringify(M)); }catch(e){}
  };
  window.relJour = function(x){ return x.toLocaleDateString("fr-FR", {weekday:"short", day:"2-digit", month:"2-digit"}); };
  window.relPlan = function(d, statut){
    var R = {etat:"horsjeu", motif:"", steps:[], next:null};
    if(!d || !d.ref) return R;
    var st = statut || (J("tigerflow-devis-statuts", {})[d.ref]) || d.statut;
    if(st !== "envoye") return R;
    var REL = J("tigerflow-relance-devis-v2", null) || DEF;
    if(REL.on === false){ R.etat = "coupe"; R.motif = "relance devis éteinte"; return R; }
    var ON = J("tigerflow-relance-on", {}), G = J("tigerflow-relance-garde-v1", {}), RC = J("tigerflow-relance-cat-v1", {});
    var qui = d.payeur || d.client || ""; R.qui = qui;
    var pub = relPub(qui, d); R.pub = pub;
    var EX = J("tigerflow-relance-exclus", []);
    if(EX.indexOf(qui) > -1 || EX.indexOf(d.client) > -1){ R.etat = "exclu"; R.motif = "client exclu"; return R; }
    if(ON[pub] === false){ R.etat = "coupe"; R.motif = "relance coupée pour ce type de client"; return R; }
    var c = relCat(d);
    if(c && RC[c[0]] && RC[c[0]].off){ R.etat = "nuisible"; R.motif = c[1] + " — pas de relance"; return R; }
    /* 02/11 (test complet) : les seuils sont en € HT — on compare le HT du devis
       (somme des lignes), pas le TTC. Sans lignes : TTC / 1,2 comme la page Relance. */
    var ht = (d.lignes || []).reduce(function(a, l){ return a + (+l.qte || 0) * (+l.pu || 0); }, 0) || ((+d.montant || 0) / 1.2);
    R.ht = ht;
    if((+G.plancher || 0) > 0 && ht < +G.plancher){ R.etat = "plancher"; R.motif = "sous " + G.plancher + " €"; return R; }
    var d0 = jour((J("tigerflow-devis-dates", {})[d.ref] || {}).envoye || d.date || ""); if(!d0) return R;
    var v = d.valid ? jour(d.valid) : null;
    if(!v){ v = new Date(d0); v.setDate(v.getDate() + 30); }
    R.valid = v;
    var seq = REL[pub] || REL.part || DEF.part; R.seq = seq;
    /* relances à la main : {d, k} (k = relance remplacée) ; ancien format = dates seules, dans l'ordre */
    var manMap = {};
    (J("tigerflow-relance-manuel", {})[d.ref] || []).forEach(function(m, idx){
      var dd = jour(typeof m === "string" ? m : m && m.d), k = typeof m === "string" ? idx : (m && m.k != null ? m.k : idx);
      if(dd) manMap[k] = dd;
    });
    var auj = new Date(); auj.setHours(0, 0, 0, 0);
    var ouvres = G.ouvres !== false;
    var base = d0, baseJ = 0; var remAcq = 0;
    /* 02/11 (test complet : la fiche affichait −5 % là où la règle « Cafards : 3 % max »
       ou « aucune remise au-dessus de 1 500 € » s'appliquait) — les MÊMES garde-fous
       que la page Relance devis : plafond, gros devis, prix minimum, règle par nuisible. */
    var AV = J("tigerflow-relance-avance-v1", {}), rcr = c && RC[c[0]] ? RC[c[0]] : null;
    var remEff = function(raw){
      var r = +raw || 0; if(!(r > 0)) return 0;
      if(rcr && rcr.plaf > 0 && ht > rcr.plaf) return 0;
      if((+G.plafond || 0) > 0 && ht > +G.plafond) return 0;
      if((+AV.grosSeuil || 0) > 0 && ht > +AV.grosSeuil) r = Math.min(r, +AV.grosRem || 0);
      if((+AV.prixMin || 0) > 0 && ht > 0) r = Math.min(r, Math.max(0, (1 - AV.prixMin / ht) * 100));
      if(rcr && rcr.rem !== undefined && rcr.rem !== "") r = Math.min(r, +rcr.rem);
      return Math.max(0, Math.round(r * 100) / 100);
    };
    seq.forEach(function(x, i){
      /* une remise déjà proposée reste acquise : jamais moins que la relance précédente */
      remAcq = Math.max(remAcq, +x.rem || 0);
      var s = {i:i, n:seq.length, mail:!!x.mail, sms:!!x.sms, rem:remEff(remAcq), fait:false, manuel:false};
      if(manMap[i]){ s.date = manMap[i]; s.fait = true; s.manuel = true; base = manMap[i]; baseJ = +x.j || 0; }
      else {
        var q = new Date(base); q.setDate(q.getDate() + (+x.j || 0) - baseJ);
        if(ouvres){ while(q.getDay() === 0 || q.getDay() === 6) q.setDate(q.getDate() + 1); }
        s.date = q; s.fait = q < auj;
      }
      s.iso = iso(s.date);
      if(!s.manuel && s.date > v) return;          /* jamais après l'échéance */
      R.steps.push(s);
    });
    if(R.steps.length) R.steps[R.steps.length - 1].derniere = true;
    R.steps.forEach(function(s){ s.n = R.steps.length; });
    var P = J("tigerflow-relance-devis-v2-pause", []);
    R.next = R.steps.find(function(s){ return !s.fait; }) || null;
    R.coupees = seq.length - R.steps.length;      /* relances retirées car après l'échéance */
    if(auj > v){ R.etat = "expire"; R.motif = "devis expiré"; return R; }
    if(P.indexOf(d.ref) > -1){ R.etat = "pause"; R.motif = "en pause"; return R; }
    /* 02/11 : validité trop courte — aucune relance ne tombe avant l'échéance */
    if(!R.steps.length){ R.etat = "court"; R.motif = "validité trop courte : aucune relance avant l'échéance"; return R; }
    if(!R.next){ R.etat = "fini"; R.motif = R.steps.length + " relance" + (R.steps.length > 1 ? "s" : "") + " faite" + (R.steps.length > 1 ? "s" : "") + " — au téléphone"; return R; }
    /* 02/11 (patron) : client sans e-mail ni mobile — la relance ne peut pas partir.
       On ne bloque que si la fiche du client existe (sinon on ne sait pas). */
    var fc = (J("tigerflow-inbox-clients", []).concat(J("tigerflow-clients-cache", []))).find(function(c){ return c && c.nom === qui; });
    if(fc){
      var mail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(fc.mail || "").trim());
      var mob = /^(\+33|0033|0)[67]\d{8}$/.test(String(fc.tel || fc.mobile || "").replace(/[\s.\-]/g, ""));
      var s0 = R.next, peut = (s0.mail && mail) || (s0.sms && mob);
      R.contact = {mail: mail, mob: mob};
      if(!peut){
        R.etat = "contact";
        R.motif = !mail && !mob ? "pas d'e-mail ni de mobile" : !mail ? "pas d'e-mail" : "pas de mobile";
        return R;
      }
    }
    R.etat = "actif";
    return R;
  };
  /* le libellé court, le MÊME partout : « Relance 1/3 · ven. 30/10 » */
  window.relLabel = function(R){
    if(!R || R.etat === "horsjeu") return "";
    if(R.etat !== "actif") return "⏸ " + R.motif;
    var s = R.next;
    return "🔁 Relance " + (s.i + 1) + "/" + s.n + " · " + relJour(s.date) + (s.derniere ? " · dernière" : "");
  };
  /* RÉSULTATS : devis signés rangés par nombre de relances parties avant la signature
     (page Relance devis + tableau de bord). per : mois | 3m | 12m */
  window.relStats = function(PER){
    var box = J("tigerflow-inbox-devis", []), stx = J("tigerflow-devis-statuts", {}), dts = J("tigerflow-devis-dates", {});
    var auj = new Date(); auj.setHours(0, 0, 0, 0);
    var deb = new Date(auj); if(PER === "mois") deb.setDate(1); else if(PER === "3m") deb.setMonth(deb.getMonth() - 3); else deb.setFullYear(deb.getFullYear() - 1);
    var B = [0, 1, 2, 3].map(function(){ return {n:0, m:0}; }), rem = 0, env = 0, att = 0, sig = 0;
    box.forEach(function(d){
      if(!d || !d.ref) return;
      var st = stx[d.ref] || d.statut, dd = dts[d.ref] || {};
      var e = jour(dd.envoye || d.date);
      if(e && e >= deb && st !== "brouillon") env++;
      if(st === "envoye") att++;
      if(st !== "gagne") return;
      var g = jour(dd.gagne) || e; if(!g || g < deb) return;
      sig++;
      var R = relPlan(d, "envoye");
      var avant = (R.steps || []).filter(function(s){ return s.date <= g; });
      var k = Math.min(avant.length, 3);
      B[k].n++; B[k].m += +d.montant || 0;
      if(k > 0 && avant[k - 1].rem) rem += (+d.montant || 0) * avant[k - 1].rem / (100 - avant[k - 1].rem);
    });
    return {B:B, rem:rem, env:env, att:att, sig:sig, gr:B[1].n + B[2].n + B[3].n, grm:B[1].m + B[2].m + B[3].m};
  };
})();
