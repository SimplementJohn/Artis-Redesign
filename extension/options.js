const $ = id => document.getElementById(id);

const STORAGE_KEYS = [
  'artis_enabled', 'artis_theme_mode', 'artis_version_btn',
  'giles_enabled', 'giles_page_share',
  'giles_api_key',                  /* legacy Gemini */
  'giles_provider',                 /* legacy single provider */
  'key_gemini', 'key_openai', 'key_claude', 'dai_url',
  'giles_fallback_order', 'giles_fallback_enabled',
  'giles_model_pref', 'giles_model_pref_gemini',
  'giles_model_pref_openai', 'giles_model_pref_claude', 'giles_model_pref_dai',
  'notif_enabled', 'dit_interval', 'giles_mem_limit',
];

const PROVIDER_META = {
  gemini: {
    label: 'Gemini',
    models: [
      { value: '', label: 'Auto' },
      { value: 'gemini-2.5-flash-lite', label: '2.5 Flash Lite' },
      { value: 'gemini-2.5-flash',      label: '2.5 Flash' },
      { value: 'gemini-2.0-flash',      label: '2.0 Flash' },
    ],
  },
  openai: {
    label: 'OpenAI',
    models: [
      { value: '', label: 'Auto' },
      { value: 'gpt-4.1-mini', label: '4.1 Mini' },
      { value: 'gpt-4o-mini',  label: '4o Mini' },
      { value: 'gpt-4.1',      label: 'GPT-4.1' },
    ],
  },
  claude: {
    label: 'Claude',
    models: [
      { value: '', label: 'Auto' },
      { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
      { value: 'claude-sonnet-4-6',         label: 'Sonnet 4.6' },
    ],
  },
  dai: {
    label: 'DAI',
    models: [], /* dynamique */
  },
};

const DEFAULT_ORDER   = ['dai', 'gemini', 'openai', 'claude'];
const DEFAULT_ENABLED = { dai: true, gemini: true, openai: false, claude: false };

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
const MODE_BTNS   = Array.from(document.querySelectorAll('#opt-mode button'));
const LIMITED_BTN = $('opt-limited-btn');
let themeMode = 'light';

function paintMode() {
  const isLimited = themeMode === 'limited';
  MODE_BTNS.forEach(b => b.classList.toggle('active', !isLimited && b.dataset.mode === themeMode));
  if (LIMITED_BTN) LIMITED_BTN.classList.toggle('active', isLimited);
}

MODE_BTNS.forEach(b => b.addEventListener('click', () => {
  if (b.dataset.mode === themeMode) return;
  themeMode = b.dataset.mode;
  paintMode();
  chrome.storage.local.set({ artis_theme_mode: themeMode });
  toast('Thème mis à jour');
}));

if (LIMITED_BTN) {
  LIMITED_BTN.addEventListener('click', () => {
    themeMode = themeMode === 'limited' ? 'light' : 'limited';
    paintMode();
    chrome.storage.local.set({ artis_theme_mode: themeMode });
    toast('Thème mis à jour');
  });
}

/* ── Clés API — champs visibles pour tous les providers ────── */

function setKeyStatus(provider, hasKey) {
  const el = $('opt-status-' + provider);
  if (!el) return;
  if (provider === 'dai') {
    el.className = 'opt-pk-status ' + (hasKey ? 'ok' : 'miss');
    el.textContent = hasKey ? 'configuré ✓' : 'non configuré';
    return;
  }
  el.className = 'opt-pk-status ' + (hasKey ? 'ok' : 'miss');
  el.textContent = hasKey ? 'clé ✓' : 'pas de clé';
}

function loadKeyStatuses(s) {
  ['gemini', 'openai', 'claude'].forEach(p => {
    const hasKey = !!(s['key_' + p] || (p === 'gemini' && s.giles_api_key));
    setKeyStatus(p, hasKey);
  });
  const daiUrl = s.dai_url || 'http://172.28.1.232:11434';
  setKeyStatus('dai', true);   /* DAI a toujours une URL par défaut — jamais "non configuré" */
  if ($('opt-dai-url')) $('opt-dai-url').value = daiUrl;
}

/* Sauvegarde clé générique */
function saveKey(provider, val) {
  const storKey = provider === 'dai' ? 'dai_url' : 'key_' + provider;
  const hint = $('opt-hint-' + provider);
  const origHint = hint ? (hint.dataset.orig || hint.textContent) : '';
  if (hint && !hint.dataset.orig) hint.dataset.orig = origHint;

  const flashHint = (msg) => {
    if (!hint) return;
    hint.textContent = msg;
    setTimeout(() => { hint.textContent = hint.dataset.orig || ''; }, 2500);
  };

  if (val) {
    chrome.storage.local.set({ [storKey]: val }, () => {
      flashHint('Enregistré ✓');
      setKeyStatus(provider, true);
      updateBootorderStatuses();
      checkApi();
      toast((PROVIDER_META[provider] || {}).label + ' — enregistré');
    });
  } else {
    chrome.storage.local.remove(storKey, () => {
      flashHint('Effacé');
      setKeyStatus(provider, false);
      updateBootorderStatuses();
      checkApi();
      toast((PROVIDER_META[provider] || {}).label + ' — clé effacée');
    });
  }
}

['gemini', 'openai', 'claude'].forEach(p => {
  const btn = $('opt-save-' + p);
  const inp = $('opt-key-' + p);
  if (!btn || !inp) return;
  btn.addEventListener('click', () => {
    saveKey(p, inp.value.trim());
    inp.value = '';
  });
});

const _saveDai = $('opt-save-dai');
if (_saveDai) _saveDai.addEventListener('click', () => {
  saveKey('dai', $('opt-dai-url').value.trim());
});

/* ── Bootorder ──────────────────────────────────────────────── */
let boOrder   = [...DEFAULT_ORDER];
let boEnabled = Object.assign({}, DEFAULT_ENABLED);
let boModels  = {};   /* provider → saved model pref */
let daiModels = [];   /* liste dynamique serveur DAI */

/* État des clés (pour badges dans bootorder) */
const _keyState = { gemini: false, openai: false, claude: false, dai: false };

function updateBootorderStatuses() {
  chrome.storage.local.get(['key_gemini', 'key_openai', 'key_claude', 'dai_url', 'giles_api_key'], s => {
    _keyState.gemini = !!(s.key_gemini || s.giles_api_key);
    _keyState.openai = !!s.key_openai;
    _keyState.claude = !!s.key_claude;
    _keyState.dai    = !!s.dai_url;
    renderBootorder();
  });
}

function saveFallbackState() {
  chrome.storage.local.set({ giles_fallback_order: boOrder, giles_fallback_enabled: boEnabled });
}

function renderBootorder() {
  const container = $('opt-bootorder');
  if (!container) return;
  container.innerHTML = '';

  boOrder.forEach((provider, idx) => {
    const meta    = PROVIDER_META[provider];
    const enabled = boEnabled[provider] !== false;
    const hasKey  = _keyState[provider];
    const pos     = boOrder.filter(p => boEnabled[p] !== false).indexOf(provider) + 1;

    const item = document.createElement('div');
    item.className = 'opt-bo-item' + (enabled ? '' : ' disabled');
    item.setAttribute('draggable', 'true');
    item.setAttribute('role', 'listitem');
    item.dataset.provider = provider;

    /* Position dans la chaîne active */
    const posEl = document.createElement('span');
    posEl.className = 'opt-bo-pos';
    posEl.textContent = enabled ? pos : '—';

    /* Handle drag */
    const handle = document.createElement('span');
    handle.className = 'opt-bo-handle';
    handle.setAttribute('aria-hidden', 'true');
    handle.innerHTML = '⠿';

    /* Toggle */
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'opt-switch';
    toggleLabel.title = enabled ? 'Désactiver ce provider' : 'Activer ce provider';
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = enabled;
    toggleInput.addEventListener('change', e => {
      boEnabled[provider] = e.target.checked;
      saveFallbackState();
      renderBootorder();
      checkApi();
      toast(meta.label + (e.target.checked ? ' activé' : ' désactivé'));
    });
    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'opt-slider';
    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(toggleSlider);

    /* Badge provider (couleur + label) */
    const badge = document.createElement('span');
    badge.className = 'opt-pk-badge ' + provider;
    badge.textContent = meta.label;

    /* Model select */
    const modelSel = document.createElement('select');
    modelSel.className = 'opt-bo-model';
    modelSel.title = 'Modèle préféré pour ' + meta.label;

    if (provider === 'dai') {
      const autoOpt = document.createElement('option');
      autoOpt.value = '';
      autoOpt.textContent = 'Auto';
      modelSel.appendChild(autoOpt);
      daiModels.forEach(m => {
        const o = document.createElement('option');
        o.value = m;
        o.textContent = m;
        modelSel.appendChild(o);
      });
      if (daiModels.length === 0) {
        const o = document.createElement('option');
        o.value = '';
        o.textContent = '— charger ↻ —';
        o.disabled = true;
        modelSel.appendChild(o);
      }
    } else {
      meta.models.forEach(m => {
        const o = document.createElement('option');
        o.value = m.value;
        o.textContent = m.label;
        modelSel.appendChild(o);
      });
    }
    const savedModel = boModels['giles_model_pref_' + provider]
      || (provider === 'gemini' ? boModels.giles_model_pref : '') || '';
    modelSel.value = savedModel;
    modelSel.addEventListener('change', e => {
      const key = 'giles_model_pref_' + provider;
      chrome.storage.local.set({ [key]: e.target.value });
      boModels[key] = e.target.value;
    });

    /* Refresh button pour DAI */
    if (provider === 'dai') {
      const refresh = document.createElement('button');
      refresh.type = 'button';
      refresh.className = 'opt-btn opt-btn-secondary';
      refresh.style.cssText = 'padding:4px 8px;font-size:.75rem;flex-shrink:0';
      refresh.title = 'Actualiser les modèles DAI';
      refresh.textContent = '↻';
      refresh.addEventListener('click', () => fetchDAIModels());
      item.append(posEl, handle, toggleLabel, badge, modelSel, refresh);
    } else {
      item.append(posEl, handle, toggleLabel, badge, modelSel);
    }

    /* Status clé */
    const status = document.createElement('span');
    status.className = 'opt-pk-status ' + (hasKey ? 'ok' : 'miss');
    status.style.flexShrink = '0';
    status.textContent = provider === 'dai'
      ? (hasKey ? 'URL ✓' : 'localhost')
      : (hasKey ? '✓' : '✗');
    item.appendChild(status);

    /* Drag & Drop */
    item.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', provider);
      setTimeout(() => item.classList.add('dragging'), 0);
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      container.querySelectorAll('.opt-bo-item').forEach(i => i.classList.remove('drag-over'));
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      container.querySelectorAll('.opt-bo-item').forEach(i => i.classList.remove('drag-over'));
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const fromProvider = e.dataTransfer.getData('text/plain');
      if (fromProvider === provider) return;
      const fromIdx = boOrder.indexOf(fromProvider);
      const toIdx   = boOrder.indexOf(provider);
      boOrder.splice(fromIdx, 1);
      boOrder.splice(toIdx, 0, fromProvider);
      saveFallbackState();
      renderBootorder();
    });

    container.appendChild(item);
  });
}

function fetchDAIModels() {
  chrome.runtime.sendMessage({ type: 'GILES_DAI_MODELS' }, resp => {
    if (chrome.runtime.lastError || !resp || !resp.ok) return;
    daiModels = resp.models || [];
    renderBootorder();
    toast('Modèles DAI chargés : ' + daiModels.length);
  });
}

/* ── Mémoire conversation ── */
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
  NO_KEY: 'Aucune clé active', KEY_INVALID: 'Clé invalide',
  QUOTA: 'Quota dépassé', OVERLOAD: 'Serveur surchargé',
  MODEL: 'Modèle indisponible', NO_MODEL: 'Aucun modèle configuré',
  API: 'Erreur API', NETWORK: 'Pas de connexion',
  PARSE: 'Réponse illisible', EXT: 'Service worker injoignable',
  UNKNOWN: 'Erreur inconnue',
};

function setApi(state, text) {
  const box = $('opt-api');
  box.classList.remove('checking', 'ok', 'fail');
  box.classList.add(state);
  $('opt-api-txt').textContent = text;
  $('opt-api-retry').hidden = state !== 'fail';
}

function checkApi() {
  setApi('checking', "Vérification de la chaîne de fallback…");
  try {
    chrome.runtime.sendMessage({ type: 'GILES_PING' }, resp => {
      if (chrome.runtime.lastError) { setApi('fail', API_ERR.EXT); return; }
      if (resp && resp.ok) {
        setApi('ok', 'Gilles opérationnel' + (resp.provider ? ' — ' + (PROVIDER_META[resp.provider] || {}).label : ''));
        return;
      }
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

  /* Clés */
  loadKeyStatuses(s);
  _keyState.gemini = !!(s.key_gemini || s.giles_api_key);
  _keyState.openai = !!s.key_openai;
  _keyState.claude = !!s.key_claude;
  _keyState.dai    = !!s.dai_url;

  /* Bootorder */
  boOrder   = s.giles_fallback_order   || [...DEFAULT_ORDER];
  boEnabled = Object.assign({}, DEFAULT_ENABLED, s.giles_fallback_enabled || {});

  /* Model prefs (pour les selects du bootorder) */
  boModels = {
    giles_model_pref: s.giles_model_pref || '',
    giles_model_pref_gemini: s.giles_model_pref_gemini || '',
    giles_model_pref_openai: s.giles_model_pref_openai || '',
    giles_model_pref_claude: s.giles_model_pref_claude || '',
    giles_model_pref_dai:    s.giles_model_pref_dai    || 'codellama:7b',
  };

  /* Migration : si un provider était sélectionné et activé, l'activer dans la chaîne */
  if (s.giles_provider && !s.giles_fallback_enabled) {
    boEnabled = Object.assign({}, DEFAULT_ENABLED, { [s.giles_provider]: true });
    saveFallbackState();
  }

  renderBootorder();
  checkApi();
  /* Auto-charger les modèles DAI si DAI activé dans la chaîne */
  if (boEnabled.dai !== false) fetchDAIModels();
});

/* ── Export ── */
$('opt-export').addEventListener('click', () => {
  chrome.storage.local.get(STORAGE_KEYS, data => {
    const safe = Object.assign({}, data);
    /* Exclut les clés API de l'export */
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
