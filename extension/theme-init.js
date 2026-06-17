/* theme-init.js — @document_start ───────────────────────────────
   Pose la classe de thème AVANT le premier paint pour tuer le flash
   noir→blanc (FOUC). La vérité (chrome.storage.local) est ASYNC =
   résolue trop tard (après paint) ; on lit donc un MIROIR localStorage
   (sync, même origine artis.digithall.org) écrit par app-content.js.
   Défaut = clair (cohérent avec CFG.themeMode 'light', v2.0+).
   Dark = défaut CSS (html:not(.artis-light)) → aucun flash pour le dark. */
(function () {
  try {
    var el = document.documentElement;

    /* Thème désactivé (master switch off) : neutraliser nos feuilles dès
       qu'elles apparaissent — évite le flash sombre avant que app-content
       (boot → disableThemeSheets) ne prenne le relais au document_end. */
    if (localStorage.getItem('artis-enabled') === 'false') {
      var kill = function () {
        var hit = false, sheets = document.styleSheets;
        for (var i = 0; i < sheets.length; i++) {
          try {
            var href = sheets[i].href;
            if (href && (/app-override\.css(\?|$)/.test(href) || /giles\.css(\?|$)/.test(href))) {
              sheets[i].disabled = true; hit = true;
            }
          } catch (e) {}
        }
        if (!hit && document.readyState !== 'complete') requestAnimationFrame(kill);
      };
      requestAnimationFrame(kill);
      return;
    }

    var mode = localStorage.getItem('artis-theme-mode') || 'limited';
    var light = mode === 'light' || mode === 'limited';
    if (mode === 'auto') {
      try { light = window.matchMedia('(prefers-color-scheme: light)').matches; } catch (e) {}
    }
    if (light) el.classList.add('artis-light');
    if (mode === 'limited') el.classList.add('artis-limited');
  } catch (e) {}
})();
