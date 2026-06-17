# ERROR.md — Journal des erreurs à ne plus refaire

**Claude DOIT lire ce fichier AVANT toute modification.**
Quand l'utilisateur signale une erreur → l'ajouter ici **immédiatement** (en tête de section).
Format : `**Date** | **Contexte** | symptôme + cause → **Règle**`. Pas de doublon : si la
règle existe, la compléter.

---

## Règles permanentes (extraites des erreurs)

1. **JAMAIS forcer `display`** sur un élément qu'Artis affiche/masque dynamiquement
   (overlays, panels, dropdowns, toolbars). Centrer/positionner autrement
   (`position:fixed` + `transform`), laisser Artis piloter le `display`.
2. **Vérifier le DOM réel** (pages sauvegardées `*_files/` ou HTML fourni) avant
   d'écrire un layout — ne pas supposer la structure.
3. **Capture de texte = DOM live** (`innerText` respecte la visibilité), jamais un
   clone détaché (il ignore `display:none`).
4. **Tables Bootstrap 5.3 striées** : la couleur passe par
   `--bs-table-bg-type`/`--bs-table-accent-bg` (box-shadow inset), pas par
   `background-color`.
5. **Replier un conteneur à enfants multiples** : `max-height:0; overflow:hidden`
   (le pattern grid `0fr` ne marche qu'avec UN enfant wrapper).
6. **Masquage temporaire d'éléments dans un content script** : utiliser `visibility:hidden`
   (jamais `display:none`) — `display:none` modifie l'attribut `style` et déclenche le
   MutationObserver de `app-content.js`, créant des effets de bord parasites.
7. **innerHTML avec données externes** : toujours passer par `esc()` avant interpolation,
   même pour des valeurs qui semblent « contrôlées » (ex: `resp.model` d'un provider) —
   un provider externe ou une réponse malformée peut contenir du HTML.
8. **`setInterval` keep-alive** : toujours appeler `clearInterval` avant d'en créer un nouveau
   — sans ça, des appels parallèles accumulent des timers qui ne s'annulent jamais.
9. **Flag de garde posé trop tôt** : ne poser `element.dataset.flag` qu'APRÈS l'opération
   réussie (pas avant de tenter) — sinon les re-tentatives sont bloquées par le flag même
   si l'opération a échoué.
10. **`chrome.storage` réglages → lire dans `boot()`** : tout réglage sauvegardé dans
    `chrome.storage.local` (ex: `dit_interval`) doit être lu dans le même `get()` de `boot()`
    pour être appliqué. Un réglage oublié dans le `get()` reste sans effet — vérifier la liste
    des clés à chaque ajout de nouveau paramètre.
11. **Model ID Anthropic** : ne pas utiliser les IDs avec date de snapshot non vérifiée
    (ex: `claude-haiku-4-5-20251001`). Vérifier l'ID exact dans la doc Anthropic ou utiliser
    l'alias sans date (`claude-haiku-4-5`).
12. **`http://localhost/*` dans `host_permissions`** : trop large (donne accès à tous les
    services locaux). Utiliser le port exact si nécessaire (`http://localhost:11434/*`), sinon
    ne pas inclure.

---

## Entrées

- **2026-06-17** | Audit v2.2.7 — `capturePageText` | masquage via `display:none` déclenchait le MutationObserver de `app-content.js` sur l'attribut `style` → entrées parasites dans `pendingStyle`. **Règle 6 :** utiliser `visibility:hidden` pour masquer temporairement des éléments dans un content script.
- **2026-06-17** | Audit v2.2.7 — XSS `meta.model` dans `addBubble` | `meta.provider`/`meta.model` interpolés dans `innerHTML` sans `esc()` — risque XSS si valeur fournie par provider externe. **Règle 7 :** tout champ externe → `esc()` avant `innerHTML`, même si la valeur semble contrôlée.
- **2026-06-17** | Audit v2.2.7 — `swKeepAlive` timers multiples | deux appels parallèles à `askLLM` créaient deux `setInterval` sans `clearInterval` préalable = accumulation de timers keep-alive. **Règle 8 :** toujours `clearInterval` avant nouveau `setInterval`.
- **2026-06-17** | Audit v2.2.7 — `editor.dataset.gilesBtn` posé trop tôt | flag posé avant que `mountInToolbar()` réussisse → les re-tentatives de montage de la toolbar TinyMCE étaient bloquées même si le bouton n'était pas encore dans le DOM. **Règle 9 :** poser un flag de garde APRÈS succès de l'opération.
- **2026-06-17** | Audit v2.2.7 — `dit_interval` sans effet | réglage page options (`dit_interval`) jamais lu dans `boot()` → `DIT_RELOAD_MS` hardcodé à 60 s. **Règle 10 :** tout nouveau paramètre storage doit être ajouté à la liste de clés du `chrome.storage.local.get()` dans `boot()`.
- **2026-06-17** | Audit v2.2.7 — boutons sidebar natifs inactifs | click sur icônes tab `#kt_aside_nav` changeait l'onglet dans `#kt_aside_workspace` (déplacé dans `#artis-menu-popup` depuis v1.9.58) mais le popup restait fermé (hover-only) → rien de visible. Fix : listener `click` sur `#kt_aside_nav` appelle `open()`.
- **2026-06-15** | Master switch désactivé | extension « désactivée » mais thème toujours appliqué : le garde-fou bas de fichier (`get('artis_enabled') → if false return`) sautait `boot()`, donc `disableThemeSheets(true)` (à l'intérieur de boot) n'était JAMAIS atteint = code mort. **Règle :** la logique de neutralisation (`sheet.disabled`) doit tourner dans un chemin TOUJOURS exécuté — appeler `boot()` inconditionnellement et laisser boot gérer le cas off, ne pas court-circuiter avant.
- **2026-06-15** | FOUC thème (flash noir→blanc) | en thème clair, chaque rechargement peignait sombre puis basculait clair : sombre = défaut CSS (`html:not(.artis-light)`), et la classe `artis-light` n'était ajoutée qu'APRÈS le `chrome.storage.local.get` (ASYNC) = après le premier paint. **Règle :** une décision de thème qui doit précéder le paint ne peut PAS dépendre de `chrome.storage` (async) — la lire d'un miroir `localStorage` (sync, même origine) dans un script `run_at: document_start` (`theme-init.js`) et poser la classe sur `documentElement` avant que la feuille ne peigne.
- **2026-06-11** | Menu popup accueil | clic sur un item menu (href = URL courante + `#`) rechargeait parfois toute la page : si le handler Artis ne `preventDefault` pas à temps (race au chargement / délégation), le navigateur suit le href. **Règle :** tout conteneur de liens Artis déplacé/réinjecté doit porter une garde capture `click` qui `preventDefault` les `href="#"` / même-page+`#` (sans stopPropagation — les handlers Artis doivent continuer de tourner).
- **2026-06-11** | Thème clair planning | blocs DIT transparents : `initialSweep()` strippait les fonds inline CLAIRS (= couleurs métier des blocs) même en thème clair, car la classe `artis-light` n'était posée qu'à l'étape 9 de l'init (`injectThemeToggle`) → `isLightTheme()` faux pendant les strips. **Règle :** tout recolor (canvas, nuclear CSS, strips, initialSweep) gated sombre + classe thème posée en TOUT début d'init (`applyThemePreference()`), avant toute autre étape.
- **2026-06-11** | tagPage | page DIT `ccPlanningV2/entreeVisualiser.action` matchait la regex `/entreeVisualiser/` → recevait `artis-page-entree` (prévu accueil) → flyout `.aside-secondary` transparent. **Règle :** les regex de tagging page doivent inclure le CHEMIN (module), pas seulement le nom d'action — la même action existe dans plusieurs modules Artis.
- **2026-06-10** | Login boutons SSO/Entrer/i | texte coupé (« Entre ») : la rangée `.row.form-actions` a DEUX `.col` 50/50 (checkbox | boutons) → 3 boutons entassés dans une demi-largeur, clippés par `overflow:hidden`. Mon CSS supposait à tort la checkbox DANS le conteneur des boutons. **Règle :** vérifier le DOM réel (page sauvegardée) avant d'écrire un layout ; sur le login, passer les `.col` de `form-actions` en pleine largeur (wrap) plutôt que rétrécir les boutons.
- **2026-06-09** | Overlay chargement `.divChargement` | mis `display:flex !important` pour centrer le loader → Artis masque l'overlay via `display:none`, mon `!important` l'a écrasé → overlay permanent qui **bloque tout le site**. **Règle :** NE JAMAIS forcer `display` sur un élément qu'Artis affiche/masque dynamiquement (overlays, panels, dropdowns). Centrer le contenu autrement (`position:fixed; top/left:50%; transform`), laisser Artis garder le contrôle du `display`.
- **2026-06-09** | Accordéon sous-menu `.menu-sub-accordion` | replié via `grid-template-rows:0fr` MAIS le conteneur a PLUSIEURS `.menu-item` enfants directs → une seule piste 0fr, le reste tombe en lignes implicites `auto` = pleine hauteur → gros trous. **Règle :** pour replier un conteneur à enfants multiples, utiliser `max-height:0; overflow:hidden` (pas le grid 0fr qui ne marche qu'avec UN enfant wrapper).
- **2026-06-09** | Gilles capture page | `document.body.cloneNode(true)` détaché ignore `display:none` → renvoyait le texte d'onglets cachés (« Aucune donnée ») au lieu de l'onglet visible. **Règle :** capturer `document.body.innerText` LIVE (respecte la visibilité), masquer temporairement `#giles-root`/`#artis-app-canvas` au lieu de cloner.
- **2026-06-09** | Tableaux DIT (DataTables `.table-striped`) | lignes impaires restaient BLANCHES malgré `background-color` dark → Bootstrap 5.3 peint les cellules striées via `box-shadow: inset ... var(--bs-table-bg-type)`. **Règle :** overrider `--bs-table-bg-type` / `--bs-table-accent-bg` sur les cellules (`tr > *`), pas seulement `background-color`.
