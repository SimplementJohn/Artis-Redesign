# Changelog — Artis Redesign

> Journal des versions. Le code ne garde que `ARTIS_VERSION` (`app-content.js`) ;
> toute nouvelle version = entrée ICI + bump `ARTIS_VERSION` + `manifest.json`.

## 2.1.0 — 2026-06-13

- Gilles multi-provider : Gemini · OpenAI GPT · Anthropic Claude · DAI (Ollama). Sélecteur fournisseur + clé par provider + URL serveur DAI + liste modèles dynamique DAI via `/api/tags`. Ferme #5.
- Ping `GILES_PING` et fallback multi-modèles adaptés par provider.
- Export JSON exclut désormais les clés API (sécurité).
- `manifest.json` : host_permissions `api.openai.com`, `api.anthropic.com`, `localhost`.

## 2.0.1 — 2026-06-13

- Typographie renouvelée : corps → **DM Sans** (meilleure lisibilité ERP, tables denses), titres → **Space Grotesk** (hiérarchie visuelle tech). Polices déjà bundlées localement — zéro requête réseau supplémentaire. Ferme #6.

## 2.0.0 — 2026-06-11

> Passage en versioning sémantique : MAJEUR.MINEUR.PATCH (grosse refonte = 3.0.0, modif moyenne = 2.1.0, petite modif/fix = 2.0.1).

- Gilles : préprompts spécifiques Digithall (`GILLES.md`, `GILLES_REFORM.md`) gitignorés ; modèles génériques publiés (`GILLES.example.md`, `GILLES_REFORM.example.md`) utilisés en fallback si les spécifiques absents (le spécifique prime toujours)
- Gilles : réponses plus jamais tronquées en plein mot — `maxOutputTokens` 1024→8192 + `thinkingBudget: 0` (les tokens de réflexion des modèles 2.5 mangeaient le budget de sortie → `MAX_TOKENS`)
- Popup : simplifiée — thème (Sombre/Auto/Clair, icônes SVG) + bouton « Paramètres avancés » uniquement ; master switch, Gilles, partage pages, notifs, clé API, état API → page paramètres
- Gilles : escalade dans GILLES.md — question non résolue → orienter vers Alexandre (Avant-vente) ou Geoffrey LASCOMBE (GEO, N+1 support)
- Gilles : anti double présentation (bloc « présentation déjà faite » injecté en systemInstruction — ne se représente plus sur « salut »), liste de LIENS ARTIS FIABLES injectée (interdiction d'inventer URL/menu/bouton), bouton ↺ réinitialiser la conversation courante dans le header du panel
- Page paramètres : refonte lisibilité/accessibilité — base 16px (textes +20–30 %), contrastes AA, focus clavier visibles, cibles ≥44px (switches 52px, nav 46px), icônes SVG à la place des emojis, navigation clavier (Tab + Entrée, `role=tab`/`aria-selected`), `prefers-reduced-motion`, responsive < 760px
- Gilles : préprompts EXCLUSIVEMENT en fichiers .md bundlés — `extension/GILLES.md` (système, ex `prompts/giles-system-prompt.txt`) + `extension/GILLES_REFORM.md` (bouton Reformuler, ex constante `CR_SYSTEM` dans le JS) ; app-content envoie `systemPreset:'reform'`, giles-bg charge le .md
- Gilles : mémoire de conversation réglable 5–30 messages (défaut 15, ex 5 fixe) — slider page paramètres, clé `giles_mem_limit`, appliqué live
- Gilles : avatar robot `gilles.png` (image 128px bundlée, web_accessible) dans le header du panel à la place de l'icône SVG bulle
- Gilles : polices agrandies (lisibilité) — bulles + input `.98rem`, onglets `.9rem`, titre `1.1rem`, statut/notice/conversations relevés en proportion
- Menu popup : garde anti-reload — clic sur un lien `href` = page courante + `#` (toggles accordéon, « Accueil ») ne déclenche plus de rechargement complet quand le handler Artis n'a pas `preventDefault` (capture, navigation bloquée seulement, handlers Artis intacts)
- Défauts : thème CLAIR par défaut (un choix dark explicite déjà enregistré est respecté) + notifications navigateur activées par défaut (`notif_enabled !== false`) — app-content, popup, options, giles-bg
- Menu navigation = POPUP dédié `#artis-menu-popup` (style Gilles) : le workspace natif `#kt_aside_workspace` (recherche + tabs + menu) est déplacé dans un panneau flottant body-level (fixed, 330px, glass dark / blanc clair, coins arrondis) — fini le volet natif qui rendait mal (transparent sur accueil, contenu visible derrière) ; ancien `.aside-secondary` = coquille vide hors écran
- Bouton MENU sidebar `#artis-menu-btn` (icône grille 4 carrés, en tête des icônes, comme le bouton Gilles) : popup ouvert au survol du bouton ou du popup (classe `html.artis-menu-open`, grâce de fermeture 250 ms) — plus d'ouverture au survol global de la sidebar
- Flyout menu : sous-menus (Services, Biens et configurations, Logistique et stocks) en POPUP flottant au survol — plus d'accordéon, zéro décalage de layout ; popup ancré à droite de l'item (`position:absolute; left:100%`), scrollable (70vh max), thèmes dark/clair ; `.aside-secondary` passe en `overflow:visible`

## 1.9.57 — 2026-06-11
- Thème clair : blocs planning/DIT plus jamais rendus transparents — strips de fonds inline (couleurs métier), canvas dark et nuclear CSS ne tournent QU'EN sombre ; classe `artis-light` posée en tout début d'init (`applyThemePreference()`)
- Thème clair : icônes des 3 boutons sidebar injectés (theme, Gilles, version GitHub) en blanc sur la sidebar native bleue
- Page DIT `ccPlanningV2/entreeVisualiser` : flyout menu plus transparent — le tag `artis-page-entree` (bande accueil transparente) ne s'applique plus qu'à l'accueil `commun/accueil/entreeVisualiser` ; fond blanc opaque du flyout en thème clair
- Toggle theme sidebar : recharge la page (un switch live laissait un état mixte strips/canvas)

## 1.9.56 — 2026-06-11
- Bouton Reformuler : même taille que boutons TinyMCE natifs (`width:34px` inline + dimensions hauteur gérées par skin CSS) ; couleur indigo via `#artis-reformuler-btn` dans app-override.css (override propre des `!important` globaux)

## 1.9.55 — 2026-06-11
- Bouton Reformuler : inséré dans le 1er groupe `[role="toolbar"]` (à côté de Plein écran) plutôt qu'en nouveau groupe à la fin — plus de wrap sur 2e ligne

## 1.9.54 — 2026-06-11
- Bouton Reformuler : icon-only (34×34px, classe `tox-tbtn`) → tient sur la même ligne que les boutons TinyMCE natifs sans wrap ; états spinner/succès/erreur restent dans l'icône (tooltip pour les messages)

## 1.9.53 — 2026-06-11
- Bouton Reformuler (CRIT DIT) : MutationObserver remplace le polling `focusin`+setTimeout — bouton remonté automatiquement dès que TinyMCE recrée la toolbar (disparition aléatoire corrigée) ; hauteur fixée à 28px pour s'aligner sur la même ligne que les boutons natifs

## 1.9.52 — 2026-06-10
- Planning : le volet menu ne redimensionne plus brutalement le planning — overlay fixe qui glisse au survol (même animation fluide que les autres pages), le contenu ne bouge plus du tout

## 1.9.51 — 2026-06-10
- Éditeur compte rendu : toolbar TinyMCE affichée EN PERMANENCE (plus seulement au focus) — rendu forcé au chargement + display maintenu
- Bouton Reformuler toujours présent dans la barre dès le chargement de la page

## 1.9.50 — 2026-06-10
- Bandeau sticky des pages intervention (titre + onglets Dit/Compte-rendu…) : fond dark opaque — n'était plus que transparent, le contenu apparaissait derrière le titre au scroll

## 1.9.49 — 2026-06-10
- Éditeur compte rendu : toolbar TinyMCE remontée AU-DESSUS du bloc (ne chevauche plus le texte) et centrée dessus, suit le scroll/resize
- Bouton Reformuler remonté si TinyMCE recrée la barre (mount à chaque focus, plus seulement le premier)

## 1.9.48 — 2026-06-10
- Perf : strips blanc/bleu ne parcourent plus tout le DOM, seulement les éléments avec style inline (`[style]`) — app + login
- Perf : observer login batché par frame + déconnexion pendant nos écritures (aligné sur le pattern app)
- Perf : journal des versions déplacé du JS vers `CHANGELOG.md` (~250 lignes de données en moins à parser par page)
- Perf : bouton Reformuler monté au `focusin` de l'éditeur (plus d'observer permanent sur le body)
- Perf : contexte pages → Gilles envoyé en delta (le service worker met en cache par onglet, seules les pages nouvelles/modifiées transitent)
- Perf : favicon = `icon-32.png` (1,6 Ko) au lieu de `justejohn.png` (165 Ko)

## 1.9.47 — 2026-06-10
- Pop-up « Ma page d'accueil » : s'ouvre sur toute la hauteur de l'écran (plus tronqué à 75%)

## 1.9.46 — 2026-06-10
- Volet menu : plus de bloc bleu moche au survol des liens (tooltips redondants supprimés + tooltip jQuery UI thémé dark)

## 1.9.45 — 2026-06-10
- Reformuler : lit le bloc détail DIT (client, site, demandeur, dates, détail demande) → Gilles comprend la demande initiale et explicite les étapes logiques raccord
- Bouton Reformuler déplacé DANS la barre d'outils du compte rendu (à côté des boutons police/gras)

## 1.9.44 — 2026-06-10
- Éditeur compte rendu : barre d'outils TinyMCE (gras/italique…) en barre solide dark intégrée au bandeau — plus de boutons transparents par-dessus le titre
- Menus TinyMCE (listes, « … ») thémés dark + focus indigo sur la zone d'édition

## 1.9.43 — 2026-06-10
- Perf : canvas pré-rendu (grille/orbes statiques), pause onglet caché, 30 fps, connexions par buckets
- Perf : MutationObserver batché par frame + déconnexion pendant nos écritures (fin des boucles)
- Perf : balayage initial du DOM en un seul parcours ; capture page Gilles mémoïsée
- Perf : artis.txt caché côté service worker, budget connaissance 80k → 50k chars, blur réduits
- Sécu : token de session jamais envoyé à Gemini (URLs nettoyées), clé API en header (plus en URL)
- Sécu : permission « tabs » retirée, extension limitée à artis.digithall.org
- Sécu : polices bundlées en local (plus de requête Google Fonts), conversations purgées après 30 j
- Popup : nouveau réglage « Partage pages → Gilles » (désactive l'envoi du contenu des pages)
- Nettoyage : code mort supprimé (showChangelog, injectWatermark)

## 1.9.42 — 2026-06-10
- Login : boutons SSO / Entrer / i sur leur propre ligne pleine largeur — texte plus jamais coupé (« Entre »)
- Login : case « Rester connecté » centrée au-dessus des boutons

## 1.9.41 — 2026-06-09
- Volet menu : vrai déroulé glissé de gauche à droite (sort de derrière la sidebar) au lieu de « popper »

## 1.9.40 — 2026-06-09
- Toolbar haut-droite : retour des rectangles arrondis clairs sur les boutons (fond plus visible)

## 1.9.39 — 2026-06-09
- Menu de gauche : se déroule au SURVOL de la zone (animation lente et organique), plus besoin de cliquer
- Menu de gauche : bouton flèche de déroulement retiré

## 1.9.38 — 2026-06-09
- Volet menu : VRAI correctif des trous — sous-menus repliés via max-height (le grid 0fr ne marchait pas avec plusieurs enfants)

## 1.9.37 — 2026-06-09
- Volet menu : items collés à la queue leu leu (sous-menus repliés ne laissent plus de gros trous)
- Volet menu : replié par défaut au chargement — se déplie via le bouton flèche natif (#kt_aside_toggle)

## 1.9.36 — 2026-06-09
- Chargement : suppression du carré noir résiduel derrière le loader (fond/boîte d'origine masqués)

## 1.9.35 — 2026-06-09
- Gilles : clic en dehors du pop-up → il se réduit automatiquement

## 1.9.34 — 2026-06-09
- Gilles : champ de saisie centré + effet dégradé/glow assorti au bouton flèche, hauteurs réalignées

## 1.9.33 — 2026-06-09
- Toolbar haut-droite : textes « Insérer DIT / action » + flèches + croix en BLANC (comme les icônes)
- Bouton Gilles : nouveau logo (bulle de chat IA) plus clair

## 1.9.32 — 2026-06-09
- Popups de confirmation (SweetAlert) centrés au milieu de l'écran au lieu d'en haut

## 1.9.31 — 2026-06-09
- Loader chargement : fin du doublon (injectait 2 loaders quand .chgtContent contenait .box-rotate-loader) + logo Artis résiduel masqué

## 1.9.30 — 2026-06-09
- CORRECTIF : l'overlay de chargement ne bloque plus le site (ne forçait plus display → restait permanent)
- Loader chargement : centré dans l'écran (position fixe) au lieu de forcer le display de l'overlay
- Chargement : bouton « Annuler la recherche » retiré

## 1.9.29 — 2026-06-09
- Login : texte des boutons SSO / Entrer / i réduit (tient mieux)

## 1.9.28 — 2026-06-09
- Login : boutons SSO / Entrer / i côte à côte, case « Rester connecté » centrée au-dessus
- Login : case à cocher arrondie + coche violette

## 1.9.27 — 2026-06-09
- Login : boutons SSO / Entrer / i ne débordent plus de la carte (largeur auto, rangée flex)
- Login : logo artis.net agrandi (220px)
- Chargement entre pages : overlay plein écran quasi-opaque (masque le contenu) + loader centré, plus gros et plus lumineux, fade propre
- Toolbar haut-droite : boutons et libellés éclaircis (Insérer DIT/action, date, engrenage, flèches) — texte plus lisible

## 1.9.26 — 2026-06-09
- Tableaux DIT : fin des lignes blanches illisibles (override de --bs-table-bg-type, pas juste background-color)
- Gilles : lit le texte LIVE de la page (onglet visible) au lieu d'un clone détaché → ne dit plus « aucune donnée » alors que le tableau est rempli

## 1.9.25 — 2026-06-09
- Menu utilisateur (clic sur la photo) : texte des liens rendu lisible (Mon profil, Aide, Déconnexion…)

## 1.9.24 — 2026-06-09
- Login : espacement entre les boutons SSO / Entrer / i (plus collés)

## 1.9.23 — 2026-06-09
- Gilles : réponses rendues en Markdown (gras, italique, souligné, listes, titres, code) — noms de clients en gras, dates soulignées
- Autoreload entreeVisualiser : seulement quand l'onglet n'est pas affiché (pas de reload sous tes yeux)

## 1.9.22 — 2026-06-09
- Notifications : Gilles prévient quand il répond et que tu n'es pas sur la page
- Notifications : nouvelles DIT du tableau Clients/Problèmes (page entreeVisualiser) → notif Client + Problème
- Page entreeVisualiser : autoreload toutes les 60 s pour détecter les nouvelles DIT
- Gilles : si aucune clé API configurée → message « Configurez votre clé API dans l'extension ! »

## 1.9.21 — 2026-06-09
- Renommage : « Giles » → « Gilles » partout
- Gilles : pop-up retravaillée — onglets en segmented control discret, bulles plus aérées
- Gilles : bandeau de connexion (chargement / hors-ligne) + bouton Réessayer, saisie bloquée si indisponible

## 1.9.20 — 2026-06-09
- Popup : nouveau réglage « Notifications » (décoché par défaut) — demande l'autorisation au navigateur pour recevoir des notifs futures

## 1.9.19 — 2026-06-09
- Gilles : mémoire locale des pages visitées (sessionStorage) — visite le Planning puis une autre page et demande ce qu'il y avait
- Gilles : si l'info manque, demande de visiter la page ; précise l'heure de dernière récupération des données
- Données rafraîchies à chaque chargement de page

## 1.9.18 — 2026-06-09
- Sidebar : animation d'entrée encore ralentie (1.3s + stagger 0.22s)
- Gilles : lit le texte de la page affichée (DOM entier, hors-écran inclus) comme contexte

## 1.9.17 — 2026-06-09
- Boutons breadcrumb (Précédent/Suivant/Fermer) : icônes noires → violet clair + hover glow

## 1.9.16 — 2026-06-09
- Login : watermark JusteJohn bas-droite retiré
- Login : fond éclairci (canvas + surfaces)

## 1.9.15 — 2026-06-09
- Login : logo JusteJohn en haut à gauche + bloc connexion centré
- Sidebar : animation d'entrée ralentie (plus douce)
- Reload : fade-in du contenu (fin des saccades au rechargement)
- Bouton version → logo GitHub : ouvre le repo dans un nouvel onglet
- Effet brillance (glow) au survol garanti sur tous les boutons toolbar
- Icônes injectées (theme/version/Gilles) à la même taille que les natives (30px)

## 1.9.14 — 2026-06-09
- Planning : panel menu docké remis en flux (ne dépasse plus derrière le contenu)

## 1.9.13 — 2026-06-09
- Gilles : bouton flottant (FAB) retiré — ouverture uniquement via le bouton sidebar

## 1.9.12 — 2026-06-09
- Gilles connaît toute la doc Artis (93 fichiers) via récupération ciblée par question
- Correction encodage (BOM/accents) de la base de connaissance

## 1.9.11 — 2026-06-09
- Plus de lift/zoom parasite au survol du gros bloc de fond de l'EDT/planning

## 1.9.10 — 2026-06-09
- Sélecteur de semaine/période (daterangepicker) : thème dark complet (calendrier, raccourcis, boutons)

## 1.9.9 — 2026-06-09
- Gilles : modèles par défaut = gemini-2.5-flash-lite/2.5-flash (2.0 = quota 0 sur la clé)
- Correction : retrait de gemini-1.5-flash (inexistant pour la clé)
- Fallback aussi sur surcharge (503 "high demand"), plus seulement quota

## 1.9.8 — 2026-06-09
- Gilles : pop-up déplacée en bas à gauche

## 1.9.7 — 2026-06-09
- Gilles : fallback multi-modèles Gemini + code QUOTA dédié (quota dépassé)
- Ping API léger (liste modèles) → ne consomme plus de quota à chaque ouverture
- Pastille état API verte/rouge dans le header de Gilles

## 1.9.6 — 2026-06-09
- Icônes sidebar agrandies : theme 80px, version 66px, Gilles 64px

## 1.9.5 — 2026-06-09
- Popup : pastille état API (vert = connectée, rouge = vérifier API + code)

## 1.9.4 — 2026-06-09
- Gilles : logo IA (robot), bouton dans la sidebar (vert) en plus de la bulle
- Gilles : codes d'erreur détaillés dans le chat (NO_KEY, API, NETWORK…)
- Planning : ✅/❌ réservé aux interventions ; temps non productif (réservation…) sans emoji rouge
- Popup extension : interrupteurs séparés Mode sombre + Bouton version

## 1.9.3 — 2026-06-09
- Blocs réunion (rendez-vous agenda) : préfixe ⏳ dans le titre, prioritaire sur ✅/❌

## 1.9.2 — 2026-06-09
- Icône extension : skull JusteJohn sur fond dark arrondi (16/32/48/128), visible en barre claire

## 1.9.1 — 2026-06-09
- Blocs planning : préfixe d'état dans le titre (✅ crité/grisé, ❌ non crité)
- Mise à jour automatique de l'emoji si l'état du bloc change

## 1.9.0 — 2026-06-09
- Assistant IA Gilles (pop-up bas de page, Gemini, base artis.txt)
- Mémoire 5 messages + onglet Conversations (stockage local uniquement)
- Slider activer/désactiver dans la popup de l'extension

## 1.8.0 — 2026-06-09
- Barre de recherche masquée sur les pages planning
- Pictos theme/version encore agrandis
- Publication GitHub + README

## 1.7.5 — 2026-06-09
- Zoom DIT au survol ralenti (0.42s) pour un effet plus doux

## 1.7.4 — 2026-06-09
- Hover favoris + checklist plus fluide (slide, glow, étoile pulse)
- Carte profil agrandie (plus de scrollbar)
- Pictos theme/version agrandis

## 1.7.3 — 2026-06-09
- Entrée sidebar : stagger piloté en JS (1 seule timeline) → boutons theme/version parfaitement raccord avec les natifs

## 1.7.2 — 2026-06-09
- Boutons theme/version : plus de pop en retard (animation d'entrée retirée)

## 1.7.1 — 2026-06-09
- Lignes planning : striping permanent (différence de couleur toujours visible)

## 1.7.0 — 2026-06-09
- Zoom DIT planning passe au-dessus de tout (z-index + overflow)
- Description DIT apparaît après 500ms au survol
- Icône lune/soleil agrandie (46px)

## 1.6.0 — 2026-06-09
- Bouton Version + changelog ajouté
- Logo JusteJohn login agrandi (x2)
- Tooltips passent au-dessus du volet favoris

## 1.5.0 — 2026-06-09
- Carte profil #thumbnail re-thémée (fin du bleu #03a9f4) + glow derrière la PP
- Surbrillance blanche des boutons sidebar réduite (violet)
- Menus flottants body-level : texte forcé clair

## 1.4.0 — 2026-06-09
- Volet favoris : flyout flottant (ne décale plus le tableau)
- Blocs planning harmonisés + hover mini-zoom
- Loader chargement custom (double anneau + noyau pulsant)

## 1.3.0 — 2026-06-09
- Thème clair violet/slate propre (toggle lune/soleil)
- Animation fluide déroulé menu + barre recherche
- Stagger entrée des icônes sidebar

## 1.2.0 — 2026-06-09
- Tableaux : élimination totale du blanc (même vides)
- Bleu Artis → violet partout
- Favicon personnalisée

## 1.1.0 — 2026-06-09
- Thème dark glassmorphism interface interne
- Page login retravaillée + canvas animé
