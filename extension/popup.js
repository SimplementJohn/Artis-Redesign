/* Popup minimale — thème + accès aux paramètres avancés.
   Tous les autres réglages vivent sur la page options (options.html). */

const $ = id => document.getElementById(id);

/* Version depuis le manifest */
try { $('pp-ver').textContent = 'v' + chrome.runtime.getManifest().version; } catch (e) {}

/* ── Mode thème (segmented + bouton limité) ─────────────────── */
const MODE_BTNS  = Array.from(document.querySelectorAll('#pp-mode button'));
const LIMITED_BTN = document.getElementById('pp-limited-btn');
let themeMode = 'light';

function paintMode() {
  const isLimited = themeMode === 'limited';
  MODE_BTNS.forEach(b => b.classList.toggle('active', !isLimited && b.dataset.mode === themeMode));
  LIMITED_BTN.classList.toggle('active', isLimited);
}

MODE_BTNS.forEach(b => b.addEventListener('click', () => {
  if (b.dataset.mode === themeMode) return;
  themeMode = b.dataset.mode;
  paintMode();
  chrome.storage.local.set({ artis_theme_mode: themeMode });
}));

LIMITED_BTN.addEventListener('click', () => {
  themeMode = themeMode === 'limited' ? 'light' : 'limited';
  paintMode();
  chrome.storage.local.set({ artis_theme_mode: themeMode });
});

/* ── Charger l'état ─────────────────────────────────────────── */
chrome.storage.local.get(['artis_theme_mode', 'artis_dark'], s => {
  themeMode = s.artis_theme_mode || (s.artis_dark === true ? 'dark' : 'limited');
  paintMode();
});

/* ── Paramètres avancés ─────────────────────────────────────── */
$('pp-options-btn').addEventListener('click', () => chrome.runtime.openOptionsPage());
