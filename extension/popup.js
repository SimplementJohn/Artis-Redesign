/* Popup minimale — thème + accès aux paramètres avancés.
   Tous les autres réglages vivent sur la page options (options.html). */

const $ = id => document.getElementById(id);

/* Version depuis le manifest */
try { $('pp-ver').textContent = 'v' + chrome.runtime.getManifest().version; } catch (e) {}

/* ── Mode thème (segmented) ─────────────────────────────────── */
const MODE_BTNS = Array.from(document.querySelectorAll('#pp-mode button'));
let themeMode = 'light';

function paintMode() {
  MODE_BTNS.forEach(b => b.classList.toggle('active', b.dataset.mode === themeMode));
}

MODE_BTNS.forEach(b => b.addEventListener('click', () => {
  if (b.dataset.mode === themeMode) return;
  themeMode = b.dataset.mode;
  paintMode();
  /* app-content recharge les onglets Artis avec l'overlay anti-saccade */
  chrome.storage.local.set({ artis_theme_mode: themeMode });
}));

/* ── Charger l'état ─────────────────────────────────────────── */
chrome.storage.local.get(['artis_theme_mode', 'artis_dark'], s => {
  /* Migration : ancien slider artis_dark si pas encore de mode — défaut clair */
  themeMode = s.artis_theme_mode || (s.artis_dark === true ? 'dark' : 'light');
  paintMode();
});

/* ── Paramètres avancés ─────────────────────────────────────── */
$('pp-options-btn').addEventListener('click', () => chrome.runtime.openOptionsPage());
