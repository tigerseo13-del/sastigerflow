/* ═══ CLIENT EXEMPLE (29/10, patron : « mets le client exemple dans la maquette, que je voie tout ») ═══
   François Durand (particulier, payé par sa SCI) + Cabinet Vernet Syndic et ses 3 résidences :
   4 devis, 3 factures, paiements, 7 interventions, 1 contrat, les relations.
   - Chargé UNE fois par navigateur (drapeau tigerflow-exemple-v1) : si on supprime l'exemple, il ne revient pas.
   - FUSIONNE avec ce qui existe (jamais d'écrasement, dédoublonné par ref / uid / nom).
   - Les clients portent sb:1 : la page Clients ne les verse PAS dans la base Supabase.
   Pour retirer l'exemple de la maquette : enlever la ligne <script src="exemple-client.js"> des pages. */
(function(){
  try{
    var S = window.localStorage;
    /* v2 (29/10) : la remise est en EUROS dans l'appli — l'exemple avait 10 (lu
       comme 10 %) au lieu de 28 € sur DEV/FAC-2026-70004. Corrigé une fois. */
    if(S.getItem("tigerflow-exemple-v1") === "1"){
      if(S.getItem("tigerflow-exemple-v2") !== "1"){
        ["tigerflow-inbox-devis","tigerflow-inbox-factures"].forEach(function(k){
          try{ var L = JSON.parse(S.getItem(k)) || [];
            L.forEach(function(x){ if(x && /-70004$/.test(x.ref) && +x.remise === 10) x.remise = 28; });
            S.setItem(k, JSON.stringify(L)); }catch(e){}
        });
        S.setItem("tigerflow-exemple-v2", "1");
      }
      /* v3 (29/10) : la SCI devient le payeur par défaut (★) de François Durand */
      if(S.getItem("tigerflow-exemple-v3") !== "1"){
        try{ var RL = JSON.parse(S.getItem("tigerflow-relations")) || [];
          var aDef = RL.some(function(z){ return z && z.b === "François Durand" && z.def; });
          if(!aDef) RL.forEach(function(z){ if(z && z.a === "SCI Durand Patrimoine" && z.b === "François Durand") z.def = true; });
          S.setItem("tigerflow-relations", JSON.stringify(RL)); }catch(e){}
        S.setItem("tigerflow-exemple-v3", "1");
      }
      return;
    }

  
  const s=(k,v)=>{ let cur=null; try{cur=JSON.parse(S.getItem(k));}catch(e){}
    if(Array.isArray(v)){ const base=Array.isArray(cur)?cur:[]; const key=x=>x&&(x.ref||x.uid||x.nom||JSON.stringify(x)); const seen=new Set(base.map(key)); v.forEach(x=>{ if(!seen.has(key(x))) base.push(x); }); S.setItem(k,JSON.stringify(base)); }
    else if(v&&typeof v==='object'){ const base=(cur&&typeof cur==='object'&&!Array.isArray(cur))?cur:{}; Object.assign(base,v); S.setItem(k,JSON.stringify(base)); }
    else S.setItem(k,JSON.stringify(v)); };
  s('tigerflow-inbox-clients',[
   {sb:1,nom:"François Durand",type:"particulier",adresse:"7 rue des Martyrs, 3e étage gauche",cp:"75009",ville:"Paris",tel:"0612457890",mail:"f.durand@gmail.com"},
   {sb:1,nom:"SCI Durand Patrimoine",type:"entreprise",adresse:"7 rue des Martyrs",cp:"75009",ville:"Paris",tel:"0612457890",mail:"sci.durand@gmail.com",siret:"842 115 673 00014"},
   {sb:1,nom:"Cabinet Vernet Syndic",type:"syndic",adresse:"22 rue de Clichy",cp:"75009",ville:"Paris",tel:"0148740000",mail:"gestion@vernet-syndic.fr",siret:"552 081 317 00042"},
   {sb:1,nom:"Résidence Les Martyrs",type:"pro",adresse:"7 rue des Martyrs",cp:"75009",ville:"Paris",tel:"0148740000",mail:"gestion@vernet-syndic.fr"},
   {sb:1,nom:"Résidence Trudaine",type:"pro",adresse:"15 avenue Trudaine",cp:"75009",ville:"Paris",tel:"0148740000",mail:"gestion@vernet-syndic.fr"},
   {sb:1,nom:"Résidence Rochechouart",type:"pro",adresse:"40 boulevard de Rochechouart",cp:"75009",ville:"Paris",tel:"0148740000",mail:"gestion@vernet-syndic.fr"}]);
  s('tigerflow-relations',[{a:"Cabinet Vernet Syndic",t:"gere",b:"Résidence Les Martyrs"},{a:"Cabinet Vernet Syndic",t:"gere",b:"Résidence Trudaine"},{a:"Cabinet Vernet Syndic",t:"gere",b:"Résidence Rochechouart"},{a:"Cabinet Vernet Syndic",t:"gere",b:"François Durand",site:"Résidence Les Martyrs"},{a:"SCI Durand Patrimoine",t:"possede",b:"François Durand",def:true}]);
  const L=(d,desc,pu,tva,emo,qte=1)=>({designation:d,desc,qte,pu,tva,emo,img:""});
  const devis=[
   {ref:"DEV-2026-70001",client:"François Durand",payeur:"SCI Durand Patrimoine",titre:"Traitement punaises de lit — 2 passages, 3 pièces",date:"2026-10-06",statut:"gagne",remise:0,montant:528,lignes:[L("Traitement punaises de lit — 1er passage","Pulvérisation + vapeur, 3 pièces.",300,10,"🛏️"),L("2e passage à J+15","Contrôle.",150,10,"🔁")],frais:[{n:"Déplacement",m:30,tva:10,img:""}]},
   {ref:"DEV-2026-70002",client:"Résidence Les Martyrs",payeur:"Cabinet Vernet Syndic",titre:"Dératisation des parties communes — Résidence Les Martyrs",date:"2026-10-20",statut:"envoye",remise:0,montant:528,lignes:[L("Dératisation caves et local poubelles","8 postes.",360,20,"🐀"),L("Contrôle à 15 jours","Relevé.",80,20,"📋")],frais:[]},
   {ref:"DEV-2026-70003",client:"Résidence Trudaine",payeur:"Cabinet Vernet Syndic",titre:"Destruction nid de guêpes — toiture",date:"2026-09-15",statut:"gagne",remise:0,montant:216,lignes:[L("Destruction nid de guêpes","Toiture.",180,20,"🐝")],frais:[]},
   {ref:"DEV-2026-70004",client:"Résidence Rochechouart",payeur:"Cabinet Vernet Syndic",titre:"Traitement cafards — local poubelles et gaines",date:"2026-10-13",statut:"gagne",remise:28,montant:302.4,lignes:[L("Traitement cafards — gel + pulvérisation","2 passages.",280,20,"🪳")],frais:[]}];
  s('tigerflow-inbox-devis',devis);
  s('tigerflow-devis-statuts',{"DEV-2026-70001":"gagne","DEV-2026-70002":"envoye","DEV-2026-70003":"gagne","DEV-2026-70004":"gagne"});
  s('tigerflow-inbox-factures',[
   {ref:"FAC-2026-70001",client:"François Durand",payeur:"SCI Durand Patrimoine",titre:"Traitement punaises de lit — 2 passages, 3 pièces",date:"2026-10-25",valid:"2026-11-24",statut:"payee",remise:0,montant:528,acompte:158.4,deduit:true,depuis:"DEV-2026-70001",lignes:devis[0].lignes,frais:devis[0].frais},
   {ref:"FAC-2026-70003",client:"Résidence Trudaine",payeur:"Cabinet Vernet Syndic",titre:"Destruction nid de guêpes — toiture",date:"2026-09-19",valid:"2026-10-19",statut:"envoyee",remise:0,montant:216,depuis:"DEV-2026-70003",lignes:devis[2].lignes,frais:[]},
   {ref:"FAC-2026-70004",client:"Résidence Rochechouart",payeur:"Cabinet Vernet Syndic",titre:"Traitement cafards — local poubelles et gaines",date:"2026-10-16",valid:"2026-11-15",statut:"envoyee",remise:28,montant:302.4,depuis:"DEV-2026-70004",lignes:devis[3].lignes,frais:[]}]);
  s('tigerflow-factures-paiements',{"FAC-2026-70001":[{m:158.4,mode:"CB",t:"acompte",d:"2026-10-07",note:"Acompte 30 %",pj:""},{m:369.6,mode:"CB",t:"solde",d:"2026-10-25",note:"Solde",pj:""}]});
  s('tigerflow-factures-statuts',{"FAC-2026-70001":"payee"});
  const I=(uid,client,rue,cp,ville,date,start,dur,type,mode,tech,note)=>({uid,did:"",client,rue,cp,ville,date,start,dur,type,typeLibre:type==='punaise'?'Punaises de lit':'',mode,tech,montant:"",note});
  s('tigerflow-added-interventions',[
   I("1793100000000-0","François Durand","7 rue des Martyrs","75009","Paris","2026-10-03",10,1,"punaise","devis","Pablo","Visite devis"),
   I("1793100000000-1","François Durand","7 rue des Martyrs","75009","Paris","2026-10-10",9,3,"punaise","encais","Pablo","1er passage"),
   I("1793100000000-2","François Durand","7 rue des Martyrs","75009","Paris","2026-10-24",9,2,"punaise","suite","Pablo","2e passage"),
   I("1793100000000-3","Résidence Trudaine","15 avenue Trudaine","75009","Paris","2026-09-18",14,2,"guepe","encais","Otman","Nid"),
   I("1793100000000-4","Résidence Rochechouart","40 boulevard de Rochechouart","75009","Paris","2026-10-15",8,2,"cafard","encais","Fredo","Local poubelles"),
   I("1793100000000-5","Résidence Rochechouart","40 boulevard de Rochechouart","75009","Paris","2026-10-29",8,1,"cafard","suite","Fredo","2e passage"),
   I("1793100000000-6","Résidence Les Martyrs","7 rue des Martyrs","75009","Paris","2026-11-04",9,2,"rongeur","encais","Pablo","Dératisation caves")]);
  s('tigerflow-inbox-contrats',[{ref:"CTR-2026-70001",client:"Cabinet Vernet Syndic",titre:"Contrat dératisation parties communes — 3 résidences",statut:"actif",deb:"2026-11-01",fin:"2027-10-31",freq:"Trimestrielle",ht:1800,tva:20,montant:2160,cats:[],materiel:[],checklist:[],nbint:12,freqint:"",jours:[],creneaux:[],renouv:true,renech:12,notes:""}]);

    S.setItem("tigerflow-exemple-v1", "1"); S.setItem("tigerflow-exemple-v2", "1"); S.setItem("tigerflow-exemple-v3", "1");
  }catch(e){}
})();
