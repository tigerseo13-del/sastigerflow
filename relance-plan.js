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
   etat : actif | pause | exclu | coupe | nuisible | plancher | fini | expire | horsjeu */
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
    var M = J("tigerflow-relance-manuel", {}); var L = M[ref] || [];
    L.push(dateIso || iso(new Date())); M[ref] = L;
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
    if((+G.plancher || 0) > 0 && (+d.montant || 0) < +G.plancher){ R.etat = "plancher"; R.motif = "sous " + G.plancher + " €"; return R; }
    var d0 = jour((J("tigerflow-devis-dates", {})[d.ref] || {}).envoye || d.date || ""); if(!d0) return R;
    var v = d.valid ? jour(d.valid) : null;
    if(!v){ v = new Date(d0); v.setDate(v.getDate() + 30); }
    R.valid = v;
    var seq = REL[pub] || REL.part || DEF.part; R.seq = seq;
    var man = (J("tigerflow-relance-manuel", {})[d.ref] || []).map(jour).filter(Boolean).sort(function(a, b){ return a - b; });
    var auj = new Date(); auj.setHours(0, 0, 0, 0);
    var ouvres = G.ouvres !== false;
    var base = d0, baseJ = 0;
    seq.forEach(function(x, i){
      var s = {i:i, n:seq.length, mail:!!x.mail, sms:!!x.sms, rem:+x.rem || 0, fait:false, manuel:false};
      if(i < man.length){ s.date = man[i]; s.fait = true; s.manuel = true; base = man[i]; baseJ = +x.j || 0; }
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
    if(!R.next){ R.etat = "fini"; R.motif = R.steps.length + " relance" + (R.steps.length > 1 ? "s" : "") + " faite" + (R.steps.length > 1 ? "s" : "") + " — au téléphone"; return R; }
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
