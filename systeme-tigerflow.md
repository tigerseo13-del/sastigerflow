# MÉMOIRE TIGERFLOW — à donner à toute nouvelle session Claude

Ce zip contient TOUT l'état du projet au 24/07/2026 :
- les 25 pages HTML du SaaS (l'état exact publié sur GitHub)
- le script serveur OVH (installe-tigerflow-ovh-v2.sh) + le logo (logo-tigre.png)
- ce dossier memoire/ : le mode d'emploi complet

## Pour reprendre le travail (n'importe quel ordi)
1. Ouvrir une session Claude dans le projet « processus 2 »
2. Dire : « reprends TigerFlow » (la mémoire vit AUSSI dans le projet Claude :
   claude/systeme-tigerflow.md + claude/mode-cockpit.md + claude/parcours-technicien.md)
3. Ou uploader CE zip à la session : il contient tout.

## Le circuit
GitHub (tigerseo13-del/sastigerflow) = source de vérité → commit du zip = publication.
GitHub Pages : https://tigerseo13-del.github.io/sastigerflow/
VPS OVH 51.79.147.235 : patrimoine sur port 80 (NE PAS TOUCHER), TigerFlow sur :8080,
synchro git pull auto toutes les 5 min une fois le script v2 lancé.

## Il reste à faire (noté en fin de session)
1. Aligner l'ordre exact des barres d'outils sur les 4 listes (recherche/chips/tri/export)
2. Généraliser le flash ambre après chaque action réussie
3. Re-design UX complet du formulaire « Créer un contrat » — EN COURS :
   DÉCISION PATRON 24/07 : formulaire PLEINE PAGE, rail Récapitulatif SUPPRIMÉ (jugé
   moche). À la place : barre d'action fixe en bas (Montant annuel TTC + Brouillon +
   Enregistrer et envoyer), recap() allégé au seul TTC. Ne pas ressusciter le rail.
   Passe UX du 24/07 FAITE : champs à la recette sobre (fond #F6F7F9, bordure
   transparente, focus #FFEFE6), 9 cartes regroupées sous 4 étapes numérotées
   (1 Le contrat / 2 Le contenu / 3 La planification / 4 Finalisation), topbar
   dédoublonnée (Annuler seul en haut, la barre du bas commande). Passe ERGONOMIE du 24/07 FAITE : dates intelligentes (début=aujourd'hui,
   fin=+1 an, recalage auto si fin<=début), raccourcis « Durée rapide » 6 mois/1 an/2 ans,
   bouton « Lun → Ven » (jours ouvrés en un clic), Ctrl+Entrée = Enregistrer et envoyer
   (Ctrl+S brouillon existait). Vérif jsdom 10/10. Passe DESIGN du 24/07 FAITE : zéro emoji
   (charte SVG respectée — calendrier/euro/alerte/trombone en SVG inline .bic),
   14 pastilles couleur du langage nuisibles sur les chips, encart TTC en dégradé,
   badges alignés sur le style des champs. Vérif jsdom 10/10.
   Formulaire contrat : TERMINÉ (structure + UX + ergonomie + design).

## Fait le 24/07/2026 (session grisage)
- tech-mobile accueil v2 : « Bonjour Thomas » avec « En service » en pastille verte
  arrondie + tuile date (ven. 24 mai, liseré orange) à droite pour combler le vide de
  l'avatar retiré. Vérif 7/7.
- tech-mobile accueil : topbar épurée (roundel tigre seul, wordmark TIGERFLOW + badge TEC
  retirés), avatar TM supprimé de l'accueil (conservé dans Réglages), « Bonjour Thomas »
  prénom seul, bloc aéré (marges 10/20px). Vérif jsdom 9/9.
- Taille d'affichage unifiée : base html{font-size:15px} posée sur les 5 pages qui n'en
  avaient pas (dashboard, paiements, technicien, contrat-nouveau, connexion) — elles
  rendaient à 16px navigateur, ~7 % plus grandes que le reste. Les 24 pages bureau sont
  désormais à 15px (tech-mobile reste à part, appli téléphone). Vérif 24/24.
- Appli technicien (tech-mobile) : bloc « Clôturer l'intervention : » à deux choix porté
  depuis le cockpit — Intervention terminée (→ encaissement) + Devis sur place (→ atelier
  devis, la fiche attend). Le parcours visite-devis reste inchangé. Vérif jsdom 9/9.
- Formulaire « Ajouter un client » : champs adoucis — bordure transparente au repos sur
  fond #F6F7F9, liseré discret au survol, halo de focus orange pâli (#FFEFE6), placeholders
  #CDD2DA en .84rem. L'état erreur rouge est conservé. Vérif 8/8. NB : même recette à
  appliquer au futur re-design du formulaire Contrat (tâche restante n°3).
- Factures : trio d'actions sur chaque ligne (œil Voir → tiroir, avion Envoyer par e-mail
  → mailto pré-rédigé, flèche Télécharger → fichier HTML de la facture généré en Blob).
  « Marquer payée » et « Finaliser → » conservés ; l'enveloppe Relancer des lignes est
  remplacée par l'avion (la relance juridique reste dans le tiroir). Vérif jsdom 9/9.
- Listes : survol ORANGE uniforme sur tous les boutons d'action (clients, devis, factures,
  contrats, tâches, paiements, techniciens). Exception assumée : Supprimer / Refuser
  restent rouges au survol (signal destructif). Vérif 23/23.
- Logo : correction du flash « ancien logo » au changement d'onglet — toutes les pages
  chargeaient src="logotigre.png" (fichier INEXISTANT, le vrai = logo-tigre.png) → 404 →
  le vieux tigre SVG s'affichait le temps du secours onerror. Corrigé partout + preload
  dans le head. Brand uniformisé en grand (46 px / 1.28 rem) : connexion, devis-client,
  plan-appatage (roundel standard) et tech-mobile (roundel 32 px en topbar). Vérif jsdom
  123/123 sur les 25 pages.
- Calendrier : créneaux occupés grisés (hachures) pendant tout glisser-déposer
  (cartouche déplacé OU carte du bac « À planifier »), l'intervention déplacée exclue.
  Implémentation : CSS .busyzone + busyShow/busyHide, vérif jsdom 12/12.

## LE MODÈLE MÉTIER DES INTERVENTIONS (tranché avec le patron le 24/07 — NE PAS REDISCUTER)
4 axes indépendants :
1. LE QUOI = nuisible (langage couleur : ambre rats, violet punaises, etc.)
2. LE POURQUOI = « TYPE D'INTERVENTION » (mot choisi par le patron le 24/07 —
   « nature » jugé moche ; attention : « type » ne désigne JAMAIS le nuisible dans l'UI,
   le nuisible s'appelle « Nuisible »), 4 valeurs :
   ORDRE des cartes voulu par le patron : 1 Visite devis (défaut) · 2 Vente ponctuelle ·
   3 Sous contrat · 4 2ᵉ passage/garantie.
   « TRAITEMENT PONCTUEL » (renommé le 24/07 — « Vente » jugé trompeur, tout est un
   passage ; chip agenda : « Ponctuel · € ») (€ à récupérer — PAS de choix encaisser/facture à la création,
   jugé embrouillant : le mode d'encaissement se décide à la clôture ; juste le champ
   montant). La NOTE est de l'info opérationnelle (position du patron : « il y a toujours des
   notes ») : section 5 « Note pour le technicien » AVANT le technicien (6), placeholder
   avec exemples concrets, plus de mention facultatif. Cartouche agenda : pastille jaune
   crayon quand une note existe (survol = texte). Chips nuisibles du formulaire : icônes SVG dessinées (vraie punaise violette,
   pigeon bleu, mite rose — plus de lit 🛏️) aux couleurs du langage nuisible, zéro emoji.
   « + Autre » fonctionnel : champ inline → le nuisible tapé devient une chip cochée qui
   part dans le colis, dé-cochable. Vérif 8/8.
   BUG pré-existant corrigé au passage :
   le code attrapait « la 1re textarea de la page » = les consignes d'accès, la vraie
   note n'était JAMAIS enregistrée → textarea id=f-note branchée aux 3 endroits.
   Sous-titres des 4 cartes voulus ULTRA COURTS par le patron :
   devis sur place / € à encaisser / déjà payé / solde éventuel.
   Visite devis (0 € ce jour-là, le devis signé = la vente),
   Sous contrat (0 €, couvert),
   2ᵉ passage / garantie (0 € par défaut + champ SOLDE éventuel).
3. L'ARGENT se DÉDUIT de la nature — jamais une question séparée.
4. LE STATUT avance seul : Planifiée → En cours → Terminée → Encaissée. Jamais choisi.
   AFFICHAGE des terminées (tranché 24/07) : PAS d'onglet « Terminé » séparé (façon
   Saigon, jugé illisible) — la terminée reste EN PLACE sur le planning : carte estompée
   fond verdâtre, titre barré, sceau vert « ✓ Terminée » ou « ✓ Encaissée », badge
   rapport 📋✓/📋!. Le compteur ✓ n/n en haut filtre si besoin.
   Résumé d'intervention réorganisé (24/07) : Détails → « Note pour le technicien »
   (ex-« Commentaire », remontée sous les détails) → Technicien → Facturation.
   Ligne Type détaillée comme les cartes de création : chip couleur + sous-titre
   (devis sur place / € à encaisser / déjà payé / solde éventuel / repassage gratuit).
Couleur agenda = TECHNICIEN (pas le nuisible). Type = chip sur le cartouche.
IMPORTANT (colère du patron 24/07) : « Garantie » n'est PAS un 5e type — c'est le MÊME
type que « 2ᵉ passage / garantie ». Dans calendrier.html : MODES.gar = alias de suite,
NMODE() normalise gar→suite partout (tirage démo, colis, modifications), un seul chip
violet, un seul encart Résumé. Ne JAMAIS réintroduire un type Garantie séparé.
Fait : intervention-nouvelle.html (carte « Nature de l'intervention » + panneau paiement
déduit, data-v internes inchangés, vérif 11/11). Testé en réel : 4 créations complètes de bout en bout (vide→blocage propre,
rempli→inbox agenda avec mode + montant/solde + mode d'encaissement désormais transmis),
22/22. FAIT calendrier 24/07 : chips nature sur cartouches + cartes du bac (vocabulaire
Visite devis / Vente · € / Sous contrat / 2ᵉ passage / Garantie, .m-suite violet ajouté),
montant réel plombé de bout en bout (inbox → PENDING → IV au drop, la nature réelle bat
le tirage démo), Résumé : encart « 2ᵉ passage — solde restant dû X € » + bouton Encaisser
le solde quand montant présent. Vérif chaîne complète 10/10. Détails de l'intervention : la ligne
« Règlement » est devenue « Nature » (chip couleur + montant) — le mot Règlement est
banni du calendrier. La ligne Référence a quitté le tableau des détails → petite ligne
grise discrète SOUS la carte (clic = copier). Le badge « Référent » du technicien est
supprimé (jugé inutile par le patron). Statuts alignés sur le modèle : « À faire » →
« Planifiée » partout (statusOf + puces filtres + compteur), « Encaissée » quand
done+paid. Cartouches (décision FINALE 24/07) : TITRE = « 📍 CP · Ville · Nuisible »
sur TOUT l'agenda (jour + semaine), client en dessous, chip type + horaire en bas.
Plus de ligne type séparée (fusionnée dans le titre). Pas de client en titre.
LOT ERGONOMIE 24/07 (validé 14/14) : toast(msg, undoFn) → bouton ANNULER 5 s sur
terminer/décaler/supprimer/pose-au-planning (ivDelete n'a PLUS de confirm() bloquant :
suppression immédiate + Annuler) ; appui long 0,5 s sur cartouche = menu rapide
(parité tablette, pointerdown non-souris) ; raccourcis J/S = vue jour/semaine (←→ T N
Échap existaient) ; Échap unifié : ferme ctxm > palette > tiroirs ivm/nvm > détail ;
Ctrl+K = palette de recherche globale (client/ville/CP/réf/nuisible → saute à la date
+ ouvre le détail, palOpen/palFilter/palGo) ; cibles tactiles ~44px (::after inset:-12px
sur .chk/.dclose/.cclose/.ipx/.tca et badge Retard).
LOT UX 24/07 (tout validé 14/14) : tuile « 💶 À encaisser : X € » dans la barre du
jour (montants réels + « rentrés » après encaissement) ; jauge de charge par technicien
(existait déjà) ; DOUBLE-CLIC sur un trou de colonne → intervention-nouvelle.html?d&h&t
pré-rempli (date+créneau+technicien, géré au chargement) ; badge « Retard ↷ » cliquable
→ shiftLate() décale au prochain trou libre du même technicien ; clic droit sur
cartouche → menu rapide Démarrer/Terminer/Ouvrir/Appeler/Itinéraire (ctxAct) ; tampon
trajet ~25 min hachuré après chaque intervention (.buf) ; menu durée du tiroir limité
à 3 h (4 h retiré à la demande du patron). Récap : « à faire » → « planifiées ».
Chips de type RENFORCÉES (24/07, « ça ressort pas assez ») : couleurs PLEINES texte
blanc (devis bleu #2E5CE6, encais ambre #B45309, suite/gar violet #7C3AED), Sous
contrat reste blanc bordé (neutre voulu), .71rem + léger relief. Contrastes ≥ 4.5:1. NE PAS remettre
le client en titre. Le titre du panneau détail reste « Client — Type ». Les nouveautés
conservées : chips type, sceau ✓ Terminée/Encaissée, pastille note. Natures rendues STABLES par client (hash du nom, fini la loterie par
intervention) — clients sous contrat restent ctr. Vérif 8/8.
AUDIT COMPLET 24/07 (les 25 pages au scanner jsdom) : zéro erreur JS, zéro image
cassée, zéro id en double, zéro onclick mort. Corrections d'affichage : tech-mobile
statuts « À faire » → « Planifiées » (onglet, tuile, toast, re-render) + dates/réfs
2024 → 2026 (11 corr.) ; technicien/techniciens/tournee : « Retour de garantie » →
« 2ᵉ passage garantie » (7 corr.). GARDÉS volontairement : « À faire » dans
taches.html (ce sont des tâches, pas des interventions) et « 2ᵉ passage inclus »
dans devis/facture (description commerciale d'une ligne de prestation). Le warning
jsdom « Could not parse CSS » = :has() moderne (contrat-nouveau, techniciens),
parfaitement géré par les vrais navigateurs — pas un bug.
FAIT 24/07 — PORTE UNIQUE : le modal « Planifier une intervention » du calendrier
(code mort, openNew jamais appelé, mais addIv fonctionnait encore et créait des inters
sans type) est SUPPRIMÉ (markup nvm + openNew/closeNew/addIv + branche Échap).
La seule porte de création = intervention-nouvelle.html (pré-remplissable ?d&h&t).
FAIT 24/07 — APPLI TECHNICIEN (tech-mobile.html, vérif 12/12) : ITYPES = mêmes 4 mots
(Visite devis / Traitement ponctuel / Sous contrat / 2ᵉ passage-garantie), missions
avec itype + solde, chips .itchip (mêmes couleurs pleines que l'agenda) sur liste et
fiche + ligne type avec sous-titre, statut « PLANIFIÉE(S) ». CLÔTURE PILOTÉE PAR LE
TYPE : ctr → finCtr() terminée SANS encaissement + rapport direct ; suite avec solde →
finSolde() encaisse LE SOLDE ; suite sans solde → comme ctr ; encais → finTrait
(encaisser puis rapport) ; devis → atelier (inchangés). RÈGLE D'OR ENCAISSEMENT (le nœud Saigon, démêlé 25/07) : chez Saigon on encaisse
APRÈS le rapport (écran cassé) ; chez TigerFlow l'ENCAISSEMENT VIENT AVANT LE RAPPORT,
piloté par le TYPE (ponctuel → encaisser puis rapport ; contrat → rapport direct ;
2ᵉ passage → solde puis rapport ; devis → signature/email puis rapport). Aucun écran
« Que souhaitez-vous faire ? » après le rapport — ne jamais en créer un.
TITRE DU PANNEAU DÉTAIL (25/07) : « CP · Ville · Nuisible » (ex « Client — Nuisible »)
— le client reste en lien orange dans Détails. Renommage manuel (v.titre) conservé.
MENU RÉCAP ÉPURÉ (25/07) : tuile « 💶 À encaisser : X € » SUPPRIMÉE du récap ;
sous-titre du bac « À planifier » SANS la mention rouge « N rappels en retard »
(juste « — glisse une carte sur l'agenda »). Le chip filtre « N en retard » du récap
jour est conservé (utile pour filtrer).
AGENDA PROPRE (25/07, « ça bug » = données sales, vérif 7/7) : seedReports() au
chargement — CHAQUE intervention done reçoit un rapport complet et crédible par
nuisible (obs/zones/signes/urgence/méthode/produits/matériel/actions/temps/recos/
signé, _suiviFait+_quoteFait pour ne pas régénérer de cartes). Plus aucun badge
« 📋 ! » au chargement ; les planifiées restent vierges (normal). Zéro bug de code
au stress-test 46 IV × 5 onglets + rapport.
NOUVEL ORDRE CARTOUCHE (25/07, remplace le précédent — décision patron) :
ligne 1 = NUISIBLE (icône + libellé), ligne 2 = CLIENT (gras), ligne 3 = « 📍 CP ·
Ville » (.ladr, masquée sur cartouches sm/xs). Appliqué vues Jour, Semaine et Bac.
ANCIEN ordre (ex-décision) :
TITRE « 📍 CP · Ville · Nuisible » GÉNÉRALISÉ (25/07) : vue Jour ✓ (déjà fait),
vue SEMAINE corrigée (séparateur « cp · ville »), BAC corrigé (le titre .l1 = CP ·
Ville · Nuisible ; le chip mode/montant passe en ligne 2, client en ligne 3). La vue
Mois reste une vue de densité (points + compteur, pas de cartouches).
En-tête colonne technicien SIMPLIFIÉ (25/07) : « N interv. » seul — les heures
(« · 4 h ») et la barre de progression .tbar sont SUPPRIMÉES. La note de création
s'affiche déjà en encart jaune au-dessus du bloc Technicien dans le Résumé (vérifié).
Menu Actions du panneau : « 🔁 Dupliquer → semaine prochaine » SUPPRIMÉ (patron
25/07 — dupInt reste en code mais plus aucun bouton ne l'appelle).
SUIVANT LIBÉRÉ (25/07, ordre patron) : le niveau d'infestation n'est PLUS obligatoire
— rapNext (mobile) et rNav (PC) passent sans blocage. NE PAS remettre le verrou.
ONGLET RAPPORTS PC = VUE DE CONSULTATION (25/07, calquée sur la capture Saigon en
mieux) : boutons « ⬇ Exporter le rapport » (rPdf) + « 📧 Envoyer par e-mail » (rMail)
en tête, puis 3 cartes Étape 1/2/3 en lecture (tous les champs, tirets « — » si vide,
devis compl. « Oui — desc »/« Non », signature « ✓ Signée »), bouton Modifier en pied.
RAPPORT PC ét.1 (25/07) : zone PHOTOS remontée juste après Signes de présence
(.rdrop2 grande zone pointillée, icône appareil SVG, hover orange, « elles partiront
sur le rapport client ») — l'ancienne ligne fine du bas supprimée. AÉRATION : .rlab
padding-top 24px + margin-bottom 13px, chips gap 8px, marges textarea.
ENCAISSEMENT PC v2 (25/07, « ça bloque niveau ergonomie », vérif 8/8) : module carté
.encv2 — contexte (chip type + client + nuisible), montant GROS pré-rempli du VRAI
v.montant (Sora 1.55rem + « € TTC »), 5 modes en tuiles SVG (Chèque AJOUTÉ), bouton
principal PARLANT mis à jour en direct (« ✓ Encaisser 179,00 € par carte bancaire —
puis rapport », encLbl sur input + mode), « Encaisser plus tard » = vrai bouton
secondaire bordé. encDone lit .emt.on.
Panneau PC : le bouton « Intervention terminée » du bloc de clôture s'appelle
désormais « Clôturer l'intervention » (patron 25/07 — évite la confusion avec le
statut ; sous-titre « encaisser le client, puis faire le rapport » conservé).
PIÈCES JOINTES PAR ÉTAT (25/07, bug « toutes pareilles » corrigé, vérif 6/6) :
l'onglet PJ suit l'état de CHAQUE intervention — Planifiée : vide (« Rien pour le
moment ») ; En cours : 1 photo de constat ; Terminée : photo + bon signé ; Terminée
AVEC rapport : + signature + rapport PDF. Noms de fichiers avec la référence de
l'intervention, tailles variées par id.
CORRECTION PATRON (25/07) : les chips de délai (1 sem/2 sem/1 mois…) sont
SUPPRIMÉES mobile ET PC — le prochain passage est JUSTE un champ date qui ouvre le
calendrier au clic. NE PAS les remettre. HIÉRARCHIE titres/champs refaite (l'illisible
signalé) : .rlab = MAJUSCULES .7rem espacées gris #6B7180 + barre orange + séparateur
border-top au-dessus de chaque section (sauf la première) — les titres commandent, les
champs suivent. Appliqué mobile + rapport PC. Cartes devis Oui/Non conservées.
ÉTAPE SUITES FUN (25/07, vérif 10/10, « c'est ennuyeux le rapport ») : mobile —
prochain passage EN UN TAP (chips 1 sem/2 sem/1 mois/3 mois/Aucun → rapNextIn calcule
la date, ligne « 📅 suivi noté au … » ; date précise repliée derrière un lien) ; devis
complémentaire en 2 GRANDES CARTES (Non vert « tout est réglé » / Oui bleu « travaux à
chiffrer », .qcards) ; compteur vivant sous les conseils ; intitulés humains (« Les
conseils au client », « On revient quand ? », ét.4 « Beau boulot — relis, puis fais
signer »). PC : mêmes chips de délai (rNextIn + toast).
ERGONOMIE RAPPORT PC (25/07, vérif 8/8, parité mobile) : niveau d'infestation
requis en douceur (rNav bloque + .rerr secousse + toast) ; changement d'étape →
drawer.scrollTop=0 ; stepper cliquable sur étapes passées (RID global) ; « Suivant —
Traitement/Clôture » ; nav collante .rapnavpc sticky bottom fond blur.
ERGONOMIE RAPPORT (25/07, vérif 9/9) : changement d'étape → scroll haut ; barre
Suivant COLLANTE (.rapnav sticky, fond blur) avec destination annoncée (« Suivant —
Traitement/Suites/Signature ») ; niveau d'infestation = SEULE case obligatoire (blocage
doux : secousse .rerr + toast) ; « Enregistrer et continuer plus tard » sous le CTA
(rapLater → brouillon + retour fiche) ; bouton Effacer sur la signature mobile. Bouton « ‹ Précédent » AJOUTÉ à la barre
collante mobile dès l'étape 2 (.bprev, .rapnavrow) — la flèche du haut et le stepper
cliquable existaient mais un vrai bouton manquait.
DESIGN RAPPORT (25/07, vérif 9/9) : stepper mobile NOMMÉ (Constat·Traitement·
Suites·Signature, pastilles numérotées, ✓ vert sur l'acquis, trait orange, clic sur
étape passée = navigation) ; bandeau contexte .rctx (chip type + client + nuisible +
heure) ; niveaux infestation ET urgence en pastilles couleur 4 valeurs (vert/bleu/
ambre/rouge, + Critique ajouté) mobile + PC ; corps du rapport carté blanc, labels
.rlab à barre orange signature.
UX RAPPORT (25/07, vérif 8/8) : 1) BROUILLONS mobiles par mission (RAPDRAFTS) —
quitter le rapport ne perd RIEN, retour = « Brouillon repris », finishRap purge.
2) RÉCAP AVANT SIGNATURE : mobile ét.4 « Relire, puis signer » + PC « Relecture avant
signature » (.rsums condensé niveau/urgence/méthode/produits/zones/recos/devis/passage).
3) SUGGESTIONS PRODUITS par nuisible (PSUGG regex → chips, tap = ligne remplie :
punaises CimexOut/K-Othrine/Diatomée, rats Brodifacoum…, cafards Goliath/Maxforce…).
RAPPORT AMÉLIORÉ v2 (25/07, vérif 14/14, réf = maquettes envoyées par le patron à
Saigon) : PC déjà conforme, ajouts = « Temps passé sur place » (étape 2, r.temps) +
encart « brouillon de devis créé automatiquement » + toast rSave. MOBILE enrichi :
ét.1 + Signes de présence + Urgence client ; ét.2 Méthode en chips + Produits lignes
nom/qté (+Ajouter/✕, .rprod) + Matériel chips + Actions ; ét.3 + Devis complémentaire
Oui/Non (Oui → description + VRAI brouillon poussé dans DEVIS à finishRap) + suivi.
RAPPORT MOBILE ALIGNÉ PC (24/07, vérif 11/11) : 4 étapes = 1 Constat (niveau
Faible/Modérée/Forte + observation) · 2 Méthode & produits + Zones traitées (chips) +
photos · 3 Recommandations (chips) + Prochain passage (date) · 4 Signature — mêmes
rubriques que le rapport PC du calendrier. BANDEAU DU SORT DU DEVIS en tête (m.devout) :
« ✍️ signé sur place — X € · encaissé/à encaisser » ou « ✉️ envoyé par email — X € ·
en attente ». RAPD conserve les saisies entre étapes (rapKeep). « Envoyer par email »
clôture DÉSORMAIS la visite (done + rapport) comme la signature — plus de wait.
PARCOURS DEVIS CORRIGÉ (bug signalé par le patron 24/07, vérif 11/11) :
atelier = CATALOGUE COMPLET 12 prestations + recherche instantanée (#blq) + « + Ligne
libre » (désignation+prix, cochée d'office). sigOK() crée le devis dans l'onglet Devis
(« Signé sur place — en attente d'encaissement »). RÈGLE : après signature, la VISITE
se clôture TOUJOURS (st=done) et le RAPPORT s'ouvre — encaissé maintenant (paid=true)
OU plus tard (paid=false, le devis attend dans l'onglet Devis). Plus AUCUNE fiche
suspendue en « wait ». Hero mobile v2 (24/07) : rond logo SUPPRIMÉ de la topbar accueil (espaceur/vide/
cloche) ; « Bonjour Thomas » = prénom en DÉGRADÉ orange (background-clip:text, Sora
1.52rem) + méta en 3 pilules (verte « ● En service », blanches « ven. 24 mai » et
« 4 interventions ») ; avatar TH 54px anneau conservé. FAB + : 64px avec anneau de
découpe border 5px #F7F8FA (flotte proprement au-dessus du contenu).
Topbar mobile : bouton menu hamburger SUPPRIMÉ (patron 24/07 — tout passe par la
barre du bas ; remplacé par un espaceur 40px pour garder le logo centré). Atelier
devis : Qté + Prix MODIFIABLES par ligne cochée (BLQP {i:{q,p}}, blUpd recalcule
total + ligne verte, décocher réinitialise, openAtelier remet à zéro). Vérif 8/8.
Accueil mobile refait (24/07, « Bonjour Thomas c'est moche ») : hero = avatar TH
dégradé orange à anneau + « Bonjour Thomas » Sora + sous-ligne unique « ● En service ·
ven. 24 mai · 4 interventions » — la tuile date .dchip est SUPPRIMÉE. Médaillon logo :
fond dégradé orange + « T » de secours (fini le rond noir quand logo-tigre.png ne
charge pas). .scr padding-bottom 118px : le bouton + n'écrase plus le contenu.
Onglet Devis mobile : bouton « Relancer » SUPPRIMÉ (décision
patron 24/07 — la relance est un travail de bureau, pas du technicien). Texte fiche devis mis à jour (plus de « pas de rapport »).
Clôture EXPLICITE (retour
patron) : le titre « Clôturer l'intervention » porte le chip du type, le bouton
ponctuel affiche le montant (« encaisser 260 €, puis faire le rapport »), le repli
devis s'appelle « Finalement un devis ? » (changement de situation sur place).

## Les règles d'or du projet
- 25 pages dans le zip canonique, toujours. Patches Python à ancres + assert. Vérif jsdom.
- Zéro emoji dans les pages (que du SVG). Charte : orange #FF5A1F, Sora+Inter, MODE COCKPIT.
- Réponses au patron : français, tutoiement, pédagogique, fin de message :
  fichier → GitHub → Commit → Ctrl+Shift+R ×2 + tigre.
