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
Reste : aligner le vocabulaire de l'appli technicien (4 natures, mêmes mots).

## Les règles d'or du projet
- 25 pages dans le zip canonique, toujours. Patches Python à ancres + assert. Vérif jsdom.
- Zéro emoji dans les pages (que du SVG). Charte : orange #FF5A1F, Sora+Inter, MODE COCKPIT.
- Réponses au patron : français, tutoiement, pédagogique, fin de message :
  fichier → GitHub → Commit → Ctrl+Shift+R ×2 + tigre.
