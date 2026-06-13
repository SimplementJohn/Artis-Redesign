const $ = id => document.getElementById(id);

const STORAGE_KEYS = [
  'artis_enabled', 'artis_theme_mode', 'artis_version_btn',
  'giles_enabled', 'giles_page_share',
  'giles_api_key',                  /* legacy Gemini key */
  'giles_provider',
  'key_gemini', 'key_openai', 'key_claude',
  'dai_url',
  'giles_model_pref',               /* legacy Gemini model */
  'giles_model_pref_gemini', 'giles_model_pref_openai',
  'giles_model_pref_claude', 'giles_model_pref_dai',
  'notif_enabled', 'dit_interval', 'giles_mem_limit',
];

/* ── Navigation ── */
document.querySelectorAll('.opt-nav-item').forEach(item => {
  const select = () => {
    document.querySelectorAll('.opt-nav-item').forEach(i => {
      i.classList.remove('active');
      i.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.opt-section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    item.setAttribute('aria-selected', 'true');
    $('sec-' + item.dataset.section).classList.add('active');
  };
  item.addEventListener('click', select);
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
  });
});

/* ── Version ── */
try {
  const ver = 'v' + chrome.runtime.getManifest().version;
  $('opt-ver').textContent = ver;
  $('opt-about-ver').textContent = ver;
} catch (e) {}

/* ── Mode thème ── */
const MODE_BTNS = Array.from(document.querySelectorAll('#opt-mode button'));
let themeMode = 'light';

function paintMode() {
  MODE_BTNS.forEach(b => b.classList.toggle('active', b.dataset.mode === themeMode));
}

MODE_BTNS.forEach(b => b.addEventListener('click', () => {
  if (b.dataset.mode === themeMode) return;
  themeMode = b.dataset.mode;
  paintMode();
  chrome.storage.local.set({ artis_theme_mode: themeMode });
  toast('Thème mis à jour');
}));

/* ── Provider ── */
const PROVIDER_INFO = {
  gemini: { label: 'Clé API Gemini',     placeholder: 'AIza…',     hint: 'Google AI Studio — generativelanguage.googleapis.com' },
  openai: { label: 'Clé API OpenAI',     placeholder: 'sk-…',      hint: 'platform.openai.com' },
  claude: { label: 'Clé API Anthropic',  placeholder: 'sk-ant-…',  hint: 'console.anthropic.com' },
  dai:    { label: null,                  placeholder: null,         hint: null },
};

const PROVIDER_MODELS_LIST = {
  gemini: [
    { value: '',                        label: 'Automatique (recommandé)' },
    { value: 'gemini-2.5-flash-lite',   label: 'gemini-2.5-flash-lite (rapide)' },
    { value: 'gemini-2.5-flash',        label: 'gemini-2.5-flash' },
    { value: 'gemini-2.0-flash',        label: 'gemini-2.0-flash' },
  ],
  openai: [
    { value: '',             label: 'Automatique (gpt-4.1-mini)' },
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini (rapide)' },
    { value: 'gpt-4o-mini',  label: 'gpt-4o-mini' },
    { value: 'gpt-4.1',      label: 'gpt-4.1' },
  ],
  claude: [
    { value: '',                            label: 'Automatique (Haiku)' },
    { value: 'claude-haiku-4-5-20251001',   label: 'claude-haiku-4-5 (rapide)' },
    { value: 'claude-sonnet-4-6',           label: 'claude-sonnet-4-6' },
  ],
  dai: [],
};

let activeProvider = 'gemini';
const PROVIDER_BTNS = Array.from(document.querySelectorAll('#opt-provider button'));

function paintProvider() {
  PROVIDER_BTNS.forEach(b => b.classList.toggle('active', b.dataset.provider === activeProvider));
  const isDai = activeProvider === 'dai';
  $('opt-key-card').hidden = isDai;
  $('opt-dai-card').hidden = !isDai;

  if (!isDai) {
    const info = PROVIDER_INFO[activeProvider];
    $('opt-key-label').textContent = info.label;
    $('opt-key').placeholder = info.placeholder || '';
    $('opt-key').value = '';
    $('opt-key-hint').textContent = '';
    /* Indique si une clé est déjà enregistrée */
    const storKey = 'key_' + activeProvider;
    chrome.storage.local.get([storKey, 'giles_api_key'], s => {
      const hasSaved = s[storKey] || (activeProvider === 'gemini' && s.giles_api_key);
      if (hasSaved) $('opt-key').placeholder = 'Clé enregistrée ✓';
    });
  }
}

function populateModels(savedPref) {
  const sel  = $('opt-model');
  const hint = $('opt-model-hint');

  if (activeProvider === 'dai') {
    hint.textContent = 'Cliquer ↻ pour charger les modèles du serveur DAI.';
    fetchDAIModels(savedPref);
    return;
  }

  const models = PROVIDER_MODELS_LIST[activeProvider] || [];
  sel.innerHTML = models.map(m => `<option value="${m.value}">${m.label}</option>`).join('');
  if (savedPref !== undefined && savedPref !== null) sel.value = savedPref || '';
  hint.textContent = activeProvider === 'gemini'
    ? 'En cas d\'indisponibilité, le fallback automatique prend le relais.'
    : '';
}

function fetchDAIModels(savedPref) {
  const sel  = $('opt-model');
  const hint = $('opt-model-hint');
  sel.innerHTML = '<option value="">Chargement…</option>';
  chrome.runtime.sendMessage({ type: 'GILES_DAI_MODELS' }, resp => {
    if (chrome.runtime.lastError || !resp || !resp.ok) {
      sel.innerHTML = '<option value="">Serveur DAI inaccessible</option>';
      hint.textContent = 'Vérifier l\'URL et que le serveur est démarré.';
      return;
    }
    const models = resp.models || [];
    if (!models.length) {
      sel.innerHTML = '<option value="">Aucun modèle trouvé</option>';
      hint.textContent = 'Serveur joignable mais aucun modèle installé.';
      return;
    }
    sel.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
    if (savedPref && models.includes(savedPref)) sel.value = savedPref;
    hint.textContent = models.length + ' modèle(s) disponible(s)';
  });
}

PROVIDER_BTNS.forEach(b => b.addEventListener('click', () => {
  if (b.dataset.provider === activeProvider) return;
  activeProvider = b.dataset.provider;
  chrome.storage.local.set({ giles_provider: activeProvider });
  paintProvider();
  /* Charger le pref modèle pour ce provider */
  const prefKey = 'giles_model_pref_' + activeProvider;
  chrome.storage.local.get([prefKey, 'giles_model_pref'], s => {
    const pref = s[prefKey] || (activeProvider === 'gemini' ? s.giles_model_pref : '') || '';
    populateModels(pref);
  });
  checkApi();
  toast('Fournisseur : ' + (PROVIDER_INFO[activeProvider].label || activeProvider));
}));

/* ── Clé API ── */
$('opt-key-save').addEventListener('click', () => {
  const val  = $('opt-key').value.trim();
  const hint = $('opt-key-hint');
  const storKey = 'key_' + activeProvider;
  if (val) {
    chrome.storage.local.set({ [storKey]: val }, () => {
      hint.textContent = 'Clé enregistrée ✓';
      $('opt-key').value = '';
      $('opt-key').placeholder = 'Clé enregistrée ✓';
      checkApi();
      toast('Clé API enregistrée');
    });
  } else {
    chrome.storage.local.remove(storKey, () => {
      hint.textContent = 'Clé effacée';
      $('opt-key').placeholder = PROVIDER_INFO[activeProvider].placeholder || '';
      checkApi();
      toast('Clé API effacée');
    });
  }
  setTimeout(() => { hint.textContent = ''; }, 3000);
});

/* ── URL serveur DAI ── */
$('opt-dai-url-save').addEventListener('click', () => {
  const val = $('opt-dai-url').value.trim();
  if (!val) return;
  chrome.storage.local.set({ dai_url: val }, () => {
    toast('URL DAI enregistrée');
    fetchDAIModels();
    checkApi();
  });
});

/* ── Modèle ── */
$('opt-model-refresh').addEventListener('click', () => {
  if (activeProvider === 'dai') {
    fetchDAIModels();
  }
});

$('opt-model').addEventListener('change', e => {
  const key = 'giles_model_pref_' + activeProvider;
  chrome.storage.local.set({ [key]: e.target.value });
  toast('Modèle enregistré');
});

/* ── Mémoire conversation Gilles ── */
$('opt-mem').addEventListener('input', e => {
  $('opt-mem-val').textContent = e.target.value + ' messages';
});
$('opt-mem').addEventListener('change', e => {
  chrome.storage.local.set({ giles_mem_limit: Number(e.target.value) });
  toast('Mémoire enregistrée');
});

/* ── Toggles ── */
$('opt-main').addEventListener('change', e => {
  if (!e.target.checked) {
    if (!confirm("Désactiver l'extension ?\n\nArtis risque de ne plus s'afficher correctement.")) {
      e.target.checked = true;
      return;
    }
  }
  chrome.storage.local.set({ artis_enabled: e.target.checked });
  toast(e.target.checked ? 'Extension activée' : 'Extension désactivée');
});

$('opt-version').addEventListener('change', e => {
  chrome.storage.local.set({ artis_version_btn: e.target.checked });
  toast('Paramètre enregistré');
});

$('opt-giles').addEventListener('change', e => {
  chrome.storage.local.set({ giles_enabled: e.target.checked });
  toast(e.target.checked ? 'Gilles activé' : 'Gilles désactivé');
});

$('opt-pages').addEventListener('change', e => {
  chrome.storage.local.set({ giles_page_share: e.target.checked });
  toast('Paramètre enregistré');
});

$('opt-notif').addEventListener('change', e => {
  if (e.target.checked) {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        chrome.storage.local.set({ notif_enabled: true });
        toast('Notifications activées');
      } else {
        e.target.checked = false;
        chrome.storage.local.set({ notif_enabled: false });
        toast('Notifications refusées par le navigateur');
      }
    });
  } else {
    chrome.storage.local.set({ notif_enabled: false });
    toast('Notifications désactivées');
  }
});

/* ── Intervalle DIT ── */
$('opt-dit-interval').addEventListener('input', e => {
  $('opt-dit-interval-val').textContent = e.target.value + ' s';
});
$('opt-dit-interval').addEventListener('change', e => {
  chrome.storage.local.set({ dit_interval: Number(e.target.value) });
  toast('Intervalle enregistré');
});

/* ── API état ── */
const API_ERR = {
  NO_KEY:     'Aucune clé API',
  KEY_INVALID:'Clé API invalide',
  QUOTA:      'Quota dépassé',
  OVERLOAD:   'Serveur surchargé',
  MODEL:      'Modèle indisponible',
  NO_MODEL:   'Aucun modèle configuré',
  API:        'Erreur API',
  NETWORK:    'Pas de connexion',
  PARSE:      'Réponse illisible',
  EXT:        'Service worker injoignable',
  UNKNOWN:    'Erreur inconnue',
};

function setApi(state, text) {
  const box = $('opt-api');
  box.classList.remove('checking', 'ok', 'fail');
  box.classList.add(state);
  $('opt-api-txt').textContent = text;
  $('opt-api-retry').hidden = state !== 'fail';
}

function checkApi() {
  setApi('checking', "Vérification de l'API…");
  try {
    chrome.runtime.sendMessage({ type: 'GILES_PING' }, resp => {
      if (chrome.runtime.lastError) { setApi('fail', API_ERR.EXT); return; }
      if (resp && resp.ok) { setApi('ok', 'API connectée — Gilles opérationnel'); return; }
      const code = (resp && resp.error) || 'UNKNOWN';
      setApi('fail', (API_ERR[code] || API_ERR.UNKNOWN) + ' (' + code + ')');
    });
  } catch (e) { setApi('fail', API_ERR.EXT); }
}

$('opt-api-retry').addEventListener('click', checkApi);

/* ── Charger l'état ── */
chrome.storage.local.get(STORAGE_KEYS, s => {
  $('opt-main').checked    = s.artis_enabled !== false;
  $('opt-version').checked = s.artis_version_btn !== false;
  $('opt-giles').checked   = s.giles_enabled !== false;
  $('opt-pages').checked   = s.giles_page_share !== false;
  $('opt-notif').checked   = s.notif_enabled !== false;

  themeMode = s.artis_theme_mode || (s.artis_dark === true ? 'dark' : 'light');
  paintMode();

  const interval = s.dit_interval || 60;
  $('opt-dit-interval').value = interval;
  $('opt-dit-interval-val').textContent = interval + ' s';

  const mem = Math.min(30, Math.max(5, s.giles_mem_limit || 15));
  $('opt-mem').value = mem;
  $('opt-mem-val').textContent = mem + ' messages';

  /* Provider */
  activeProvider = s.giles_provider || 'gemini';
  paintProvider();

  /* Modèle pour ce provider (avec compat legacy gemini) */
  const modelPref = s['giles_model_pref_' + activeProvider]
    || (activeProvider === 'gemini' ? s.giles_model_pref : '')
    || '';
  populateModels(modelPref);

  /* URL DAI */
  if (s.dai_url) $('opt-dai-url').value = s.dai_url;

  checkApi();
});

/* ── Export ── */
$('opt-export').addEventListener('click', () => {
  chrome.storage.local.get(STORAGE_KEYS, data => {
    /* Exclut les clés API de l'export (sécurité) */
    const safe = Object.assign({}, data);
    delete safe.giles_api_key;
    delete safe.key_gemini;
    delete safe.key_openai;
    delete safe.key_claude;
    const blob = new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'artis-redesign-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Paramètres exportés (clés API exclues)');
  });
});

/* ── Import ── */
$('opt-import').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const hint   = $('opt-import-hint');
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data     = JSON.parse(ev.target.result);
      const filtered = {};
      STORAGE_KEYS.forEach(k => { if (k in data) filtered[k] = data[k]; });
      chrome.storage.local.set(filtered, () => {
        hint.textContent = 'Importé ✓ — rechargez pour appliquer';
        toast('Paramètres importés');
        setTimeout(() => location.reload(), 1200);
      });
    } catch {
      hint.textContent = 'Fichier invalide';
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* ── Reset ── */
$('opt-reset').addEventListener('click', () => {
  if (!confirm('Réinitialiser tous les paramètres ?\n\nCette action est irréversible.')) return;
  chrome.storage.local.remove(STORAGE_KEYS, () => {
    toast('Réinitialisé — rechargement…');
    setTimeout(() => location.reload(), 1000);
  });
});

/* ── Changelog ── */
(async () => {
  try {
    const url  = chrome.runtime.getURL('CHANGELOG.md');
    const resp = await fetch(url);
    if (!resp.ok) throw new Error();
    const text = await resp.text();
    $('opt-changelog').textContent = text.slice(0, 8000);
  } catch {
    $('opt-changelog').textContent = 'Changelog non disponible dans cette version.';
  }
})();

/* ── Toast ── */
let toastTimer;
function toast(msg) {
  const el = $('opt-toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
