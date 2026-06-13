/* ============================================================
   Gilles — Service worker (appels IA multi-provider)
   Providers : Gemini · OpenAI · Anthropic Claude · DAI (Ollama)
   ============================================================ */

let _systemPrompt = null;
let _knowledge    = null;

async function loadText(path) {
  try {
    const res = await fetch(chrome.runtime.getURL(path));
    if (!res.ok) return '';
    const t = await res.text();
    return t.replace(/^﻿/, '');
  } catch (e) { return ''; }
}

async function getSystemPrompt() {
  if (_systemPrompt === null) {
    _systemPrompt = await loadText('GILLES.md');
    if (!_systemPrompt) _systemPrompt = await loadText('GILLES.example.md');
  }
  return _systemPrompt || 'Tu es Gilles, assistant du site Artis.';
}

const ARTIS_LINKS = [
  { label: 'Accueil',                       url: 'composants/commun/accueil/entreeVisualiser.action' },
  { label: 'Planning',                      url: 'composants/ccPlanningV2/entreeVisualiser.action' },
  { label: 'Clients et Problèmes (DIT)',    url: 'composants/services/ccPlanningV2/entreeVisualiser.action' },
  { label: 'Workflow Manager',              url: 'composants/workflow/ccWorkflowManager/submit.action' },
  { label: 'Saisie compte rendu (CRIT)',    url: 'composants/services/ccCrit/entreeAjouter.action' },
  { label: 'Mon compte',                    url: 'composants/commun/navigation/redirect_ccMonCompte.action' },
  { label: 'Aide en ligne Artis (externe)', url: 'https://portail.artis.fr/docs/5.0.5/index.html' },
];

let _reformPrompt = null;
async function getPresetPrompt(preset) {
  if (preset === 'reform') {
    if (_reformPrompt === null) {
      _reformPrompt = await loadText('GILLES_REFORM.md');
      if (!_reformPrompt) _reformPrompt = await loadText('GILLES_REFORM.example.md');
    }
    return _reformPrompt || null;
  }
  return null;
}

/* ── Base de connaissance ───────────────────────────────────── */
let _index = null;
let _base  = null;
const _fileCache = {};
const KB_MAX_CHARS = 50000;

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

async function getIndex() {
  if (_index === null) {
    const raw = await loadText('knowledge-index.json');
    try { _index = raw ? JSON.parse(raw) : []; } catch (e) { _index = []; }
    if (!Array.isArray(_index)) _index = [];
  }
  return _index;
}

async function loadKnowledgeFile(f) {
  if (!(f in _fileCache)) _fileCache[f] = await loadText('knowledge/' + f);
  return _fileCache[f] || '';
}

async function getKnowledgeFor(query) {
  if (_base === null) _base = await loadText('artis.txt');
  const base  = _base;
  const index = await getIndex();
  if (!index.length) return base;

  const tokens = [...new Set(norm(query).split(/[^a-z0-9]+/).filter(w => w.length >= 3))];
  let scored;
  if (tokens.length) {
    scored = index.map(e => {
      const k = e.k || '';
      let s = 0;
      for (const t of tokens) {
        if (k.includes(t)) s += 1;
        if ((e.f || '').toLowerCase().includes(t)) s += 2;
      }
      return { e, s };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  } else { scored = []; }

  const picks = [];
  const idxFile = index.find(e => /(^|\/)INDEX\.md$/i.test(e.f));
  if (idxFile) picks.push(idxFile.f);
  for (const { e } of scored) {
    if (!picks.includes(e.f)) picks.push(e.f);
    if (picks.length >= 6) break;
  }
  if (picks.length <= 1) {
    for (const e of index.slice(0, 3)) if (!picks.includes(e.f)) picks.push(e.f);
  }

  let out = base ? base + '\n\n' : '';
  for (const f of picks) {
    const content = await loadKnowledgeFile(f);
    if (!content) continue;
    const block = `\n\n===== FICHIER : ${f} =====\n${content}`;
    if (out.length + block.length > KB_MAX_CHARS) {
      out += block.slice(0, Math.max(0, KB_MAX_CHARS - out.length));
      break;
    }
    out += block;
  }
  return out;
}

/* ── Provider config ─────────────────────────────────────────── */
const PROVIDER_MODELS_DEFAULT = {
  gemini: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'],
  openai: ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4.1'],
  claude: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'],
  dai:    [],
};

async function getActiveProvider() {
  const s = await chrome.storage.local.get('giles_provider');
  return s.giles_provider || 'gemini';
}

async function getKeyFor(provider) {
  if (provider === 'gemini') {
    const s = await chrome.storage.local.get(['key_gemini', 'giles_api_key']);
    if (s.key_gemini) return s.key_gemini.trim();
    if (s.giles_api_key) return s.giles_api_key.trim();
    const raw = await loadText('apigemini.txt');
    if (!raw) return '';
    const m = raw.match(/\b(AIza[0-9A-Za-z_\-]{20,}|AQ\.[0-9A-Za-z._\-]{20,})\b/);
    if (m) return m[1];
    const line = raw.split(/\r?\n/).map(s => s.trim())
      .find(s => s.length >= 20 && !/\s/.test(s) && !s.includes('/'));
    return line || '';
  }
  if (provider === 'dai') return '';
  const key = 'key_' + provider;
  const s = await chrome.storage.local.get(key);
  return (s[key] || '').trim();
}

async function getDAIUrl() {
  const s = await chrome.storage.local.get('dai_url');
  return (s.dai_url || 'http://localhost:11434').replace(/\/$/, '');
}

async function getModelsFor(provider) {
  const prefKey = 'giles_model_pref_' + provider;
  const s = await chrome.storage.local.get([prefKey, 'giles_model_pref']);
  const pref = s[prefKey] || (provider === 'gemini' ? s.giles_model_pref : null) || '';

  if (provider === 'dai') {
    const baseUrl = await getDAIUrl();
    try {
      const res  = await fetch(baseUrl + '/api/tags', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      const list = (data.models || []).map(m => m.name).filter(Boolean);
      if (!list.length) return [pref || 'llama3'];
      if (pref && !list.includes(pref)) list.unshift(pref);
      return pref ? [pref, ...list.filter(m => m !== pref)] : list;
    } catch { return [pref || 'llama3']; }
  }

  const defaults = (PROVIDER_MODELS_DEFAULT[provider] || []).slice();
  if (!pref) return defaults;
  return [pref, ...defaults.filter(m => m !== pref)];
}

/* ── Error classifier ───────────────────────────────────────── */
function classifyApiError(status, message) {
  const m = (message || '').toLowerCase();
  if (status === 429 || m.includes('quota') || m.includes('resource_exhausted') || m.includes('rate limit') || m.includes('rate_limit')) return 'QUOTA';
  if (status === 503 || status === 500 || m.includes('overload') || m.includes('high demand') || m.includes('unavailable') || m.includes('try again later')) return 'OVERLOAD';
  if (status === 404 || m.includes('not found') || m.includes('not supported')) return 'MODEL';
  if (status === 401 || status === 403 || m.includes('unauthorized') || m.includes('authentication') || m.includes('invalid') || m.includes('api key') || m.includes('api_key')) return 'KEY_INVALID';
  return 'API';
}

/* ── Adaptateurs par provider ──────────────────────────────────
   Entrée normalisée : messages = [{role:'user'|'assistant', content:string}] */

async function callGemini(model, key, systemText, messages) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: Object.assign(
          { temperature: 0.4, maxOutputTokens: 8192, topP: 0.95 },
          /^gemini-2\.5/.test(model) || /^flash/.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}
        ),
      }),
    });
  } catch (e) { return { ok: false, error: 'NETWORK' }; }
  let data;
  try { data = await res.json(); } catch (e) { return { ok: false, error: 'PARSE' }; }
  if (!res.ok || data.error) {
    const msg = (data.error && data.error.message) || ('HTTP ' + res.status);
    return { ok: false, error: classifyApiError(res.status, msg), detail: msg, status: res.status };
  }
  const cand = data.candidates && data.candidates[0];
  const text = cand && cand.content && cand.content.parts
    ? cand.content.parts.map(p => p.text || '').join('').trim() : '';
  if (!text) return { ok: false, error: 'NO_TEXT', detail: cand && cand.finishReason };
  return { ok: true, text, model };
}

async function callOpenAI(model, key, systemText, messages, baseUrl) {
  const url = (baseUrl || 'https://api.openai.com') + '/v1/chat/completions';
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemText }, ...messages],
        temperature: 0.4,
        max_tokens: 8192,
      }),
    });
  } catch (e) { return { ok: false, error: 'NETWORK' }; }
  let data;
  try { data = await res.json(); } catch (e) { return { ok: false, error: 'PARSE' }; }
  if (!res.ok || data.error) {
    const msg = (data.error && data.error.message) || ('HTTP ' + res.status);
    return { ok: false, error: classifyApiError(res.status, msg), detail: msg, status: res.status };
  }
  const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text) return { ok: false, error: 'NO_TEXT', detail: data.choices && data.choices[0] && data.choices[0].finish_reason };
  return { ok: true, text: text.trim(), model };
}

async function callClaude(model, key, systemText, messages) {
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        system: systemText,
        messages,
        max_tokens: 8192,
      }),
    });
  } catch (e) { return { ok: false, error: 'NETWORK' }; }
  let data;
  try { data = await res.json(); } catch (e) { return { ok: false, error: 'PARSE' }; }
  if (!res.ok || data.type === 'error') {
    const msg = (data.error && data.error.message) || ('HTTP ' + res.status);
    return { ok: false, error: classifyApiError(res.status, msg), detail: msg, status: res.status };
  }
  const text = data.content && data.content[0] && data.content[0].text;
  if (!text) return { ok: false, error: 'NO_TEXT', detail: data.stop_reason };
  return { ok: true, text: text.trim(), model };
}

async function callDAI(model, systemText, messages) {
  const baseUrl = await getDAIUrl();
  return callOpenAI(model, '', systemText, messages, baseUrl);
}

async function callLLM(provider, model, key, systemText, messages) {
  switch (provider) {
    case 'openai': return callOpenAI(model, key, systemText, messages);
    case 'claude': return callClaude(model, key, systemText, messages);
    case 'dai':    return callDAI(model, systemText, messages);
    default:       return callGemini(model, key, systemText, messages);
  }
}

/* ── Keep-alive SW ──────────────────────────────────────────── */
let _keepAliveTimer = null;
function swKeepAlive() { _keepAliveTimer = setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 20000); }
function swStopAlive() { clearInterval(_keepAliveTimer); _keepAliveTimer = null; }

function fmtTime(ts) {
  if (!ts) return 'inconnue';
  try { return new Date(ts).toLocaleString('fr-FR'); } catch (e) { return String(ts); }
}

/* ── Chaîne de fallback ──────────────────────────────────────── */
async function getFallbackChain() {
  const s = await chrome.storage.local.get(['giles_fallback_order', 'giles_fallback_enabled',
    'giles_provider', 'key_gemini', 'key_openai', 'key_claude', 'dai_url', 'giles_api_key']);

  /* Si pas encore de bootorder configuré → migration depuis giles_provider */
  let order   = s.giles_fallback_order;
  let enabled = s.giles_fallback_enabled;
  if (!order) {
    const legacy = s.giles_provider || 'gemini';
    order   = ['gemini', 'openai', 'claude', 'dai'];
    enabled = { gemini: legacy === 'gemini', openai: legacy === 'openai',
                claude: legacy === 'claude', dai: legacy === 'dai' };
  }

  /* Filtre : activé + a une clé (sauf DAI qui a une URL par défaut) */
  return order.filter(p => {
    if (enabled[p] === false) return false;
    if (p === 'gemini') return !!(s.key_gemini || s.giles_api_key);
    if (p === 'openai') return !!s.key_openai;
    if (p === 'claude') return !!s.key_claude;
    if (p === 'dai')    return true; /* DAI : localhost par défaut */
    return false;
  });
}

/* ── Fonction principale ─────────────────────────────────────── */
async function askLLM(history, pages, systemOverride) {
  swKeepAlive();
  try {
    const chain = await getFallbackChain();
    if (!chain.length) return { ok: false, error: 'NO_KEY' };

    const lastUser = [...(history || [])].reverse().find(m => m && m.role !== 'assistant' && m.text);
    const query    = lastUser ? lastUser.text : '';

    let systemText;
    if (systemOverride) {
      systemText = systemOverride;
    } else {
      const [sys, knowledge] = await Promise.all([getSystemPrompt(), getKnowledgeFor(query)]);
      systemText = sys + '\n\n========================\nBASE DE CONNAISSANCE ARTIS\n========================\n' + knowledge;
      systemText += '\n\n========================\nPRÉSENTATION DÉJÀ FAITE\n========================\n'
        + 'L\'utilisateur a DÉJÀ vu ton message de présentation dans l\'interface. '
        + 'Ne te représente JAMAIS (pas de « Bonjour, je suis Gilles… »). '
        + 'Sur un simple « salut » / « hey » / « bonjour », réponds naturellement et brièvement, '
        + 'puis propose ton aide sur Artis.';
      systemText += '\n\n========================\nLIENS ARTIS FIABLES\n========================\n'
        + 'Tu ne peux proposer QUE ces liens internes (relatifs à la base '
        + 'https://artis.digithall.org/ArtisWebDigitInvest/) ou des liens présents '
        + 'textuellement dans la base de connaissance / les pages visitées. '
        + 'N\'invente JAMAIS une URL, un menu ou un bouton.\n'
        + ARTIS_LINKS.map(l => `- ${l.label} : ${l.url}`).join('\n');
    }

    if (Array.isArray(pages) && pages.length) {
      systemText += '\n\n========================\nPAGES VISITÉES (MÉMOIRE LOCALE DE LA SESSION)\n========================\n'
        + 'Ces pages ont été consultées par l\'utilisateur durant cette session. '
        + 'Utilise leur contenu pour répondre, même s\'il s\'agit d\'une page différente de celle affichée.\n'
        + 'RÈGLES :\n'
        + '- Si l\'information demandée ne figure dans AUCUNE page ci-dessous, dis-le clairement et indique à l\'utilisateur qu\'il doit d\'abord VISITER la page concernée (ex : ouvrir le Planning) pour que tu puisses la lire.\n'
        + '- Quand tu réponds à partir d\'une page, précise l\'heure de dernière récupération de ces données (indiquée ci-dessous), car elles peuvent être périmées.\n';
      pages.forEach((p, i) => {
        systemText += `\n--- PAGE ${i + 1} : ${p.title || '(sans titre)'} ---\n`
          + 'URL : ' + (p.url || '') + '\n'
          + 'Dernière récupération : ' + fmtTime(p.time) + '\n'
          + 'CONTENU :\n' + (p.text || '') + '\n';
      });
    }

    /* Normalise history → [{role:'user'|'assistant', content:string}] */
    const messages = (history || [])
      .filter(m => m && m.text)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.text) }));
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (!messages.length) return { ok: false, error: 'EMPTY' };

    /* Erreurs qui permettent d'essayer le provider suivant dans la chaîne.
       NETWORK exclu : si réseau down, tous les providers échouent de toute façon. */
    const RETRYABLE_PROVIDER = ['QUOTA', 'OVERLOAD', 'KEY_INVALID', 'API'];
    const RETRYABLE_MODEL    = ['QUOTA', 'MODEL', 'OVERLOAD'];
    let last = { ok: false, error: 'UNKNOWN' };

    for (const provider of chain) {
      const key    = await getKeyFor(provider);
      const models = await getModelsFor(provider);
      if (!models.length) { last = { ok: false, error: 'NO_MODEL' }; continue; }

      for (let i = 0; i < models.length; i++) {
        const r = await callLLM(provider, models[i], key, systemText, messages);
        if (r.ok) return Object.assign(r, { provider });
        last = r;
        if (!RETRYABLE_MODEL.includes(r.error)) break;
        if (provider === 'dai') break;
        if (r.error === 'OVERLOAD' && i < models.length - 1) await new Promise(rs => setTimeout(rs, 400));
      }
      if (!RETRYABLE_PROVIDER.includes(last.error)) break;
    }
    return last;
  } finally { swStopAlive(); }
}

/* Backward compat — code existant qui appelle askGemini */
const askGemini = askLLM;

/* ── Ping par provider ──────────────────────────────────────── */
async function pingProvider(provider) {
  switch (provider) {
    case 'gemini': {
      const key = await getKeyFor('gemini');
      if (!key) return { ok: false, error: 'NO_KEY' };
      let res;
      try { res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': key } }); }
      catch (e) { return { ok: false, error: 'NETWORK' }; }
      if (res.status === 200) return { ok: true };
      let data; try { data = await res.json(); } catch (e) { return { ok: false, error: 'PARSE' }; }
      const msg = (data.error && data.error.message) || ('HTTP ' + res.status);
      return { ok: false, error: classifyApiError(res.status, msg), detail: msg };
    }
    case 'openai': {
      const key = await getKeyFor('openai');
      if (!key) return { ok: false, error: 'NO_KEY' };
      let res;
      try { res = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': 'Bearer ' + key } }); }
      catch (e) { return { ok: false, error: 'NETWORK' }; }
      if (res.status === 200) return { ok: true };
      let data; try { data = await res.json(); } catch (e) { return { ok: false, error: 'PARSE' }; }
      const msg = (data.error && data.error.message) || ('HTTP ' + res.status);
      return { ok: false, error: classifyApiError(res.status, msg), detail: msg };
    }
    case 'claude': {
      const key = await getKeyFor('claude');
      if (!key) return { ok: false, error: 'NO_KEY' };
      let res;
      try { res = await fetch('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } }); }
      catch (e) { return { ok: false, error: 'NETWORK' }; }
      if (res.status === 200) return { ok: true };
      let data; try { data = await res.json(); } catch (e) { return { ok: false, error: 'PARSE' }; }
      const msg = (data.error && data.error.message) || ('HTTP ' + res.status);
      return { ok: false, error: classifyApiError(res.status, msg), detail: msg };
    }
    case 'dai': {
      const baseUrl = await getDAIUrl();
      let res;
      try { res = await fetch(baseUrl + '/api/version', { signal: AbortSignal.timeout(5000) }); }
      catch (e) { return { ok: false, error: 'NETWORK' }; }
      if (res.status === 200) return { ok: true };
      return { ok: false, error: 'API', detail: 'HTTP ' + res.status };
    }
    default: return { ok: false, error: 'UNKNOWN' };
  }
}

/* ── Liste modèles DAI (pour la page options) ─────────────────── */
async function getDAIModelList() {
  const baseUrl = await getDAIUrl();
  try {
    const res = await fetch(baseUrl + '/api/tags', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, error: 'API', detail: 'HTTP ' + res.status };
    const data   = await res.json();
    const models = (data.models || []).map(m => m.name).filter(Boolean);
    return { ok: true, models };
  } catch (e) { return { ok: false, error: 'NETWORK' }; }
}

/* ── Notifications ──────────────────────────────────────────── */
async function notify(title, body, tag) {
  try {
    const s = await chrome.storage.local.get('notif_enabled');
    if (s.notif_enabled === false) return { ok: false, error: 'OFF' };
    const id = (tag || 'artis') + '_' + Date.now();
    chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon-128.png'),
      title: String(title || 'Artis').slice(0, 100),
      message: String(body || '').slice(0, 500),
      priority: 2,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'EXT', detail: String(e && e.message || e) };
  }
}

chrome.notifications.onClicked.addListener(id => {
  const url = 'https://artis.digithall.org/ArtisWebDigitInvest/';
  chrome.tabs.query({ url: 'https://artis.digithall.org/*' }, tabs => {
    if (tabs && tabs.length) {
      chrome.tabs.update(tabs[0].id, { active: true });
      if (tabs[0].windowId != null) chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({ url });
    }
    chrome.notifications.clear(id);
  });
});

/* ── Cache pages par onglet ─────────────────────────────────── */
const _pageStore = {};

function mergePages(tabId, delta, urls) {
  const store = _pageStore[tabId] || (_pageStore[tabId] = {});
  (delta || []).forEach(p => { if (p && p.url) store[p.url] = p; });
  if (Array.isArray(urls)) {
    for (const u of Object.keys(store)) if (!urls.includes(u)) delete store[u];
  }
  return Object.values(store).sort((a, b) => (b.time || 0) - (a.time || 0));
}

function pagesForMessage(msg, sender) {
  if (!msg.pagesDelta) return msg.pages;
  const tabId = sender && sender.tab && sender.tab.id != null ? sender.tab.id : -1;
  return mergePages(tabId, msg.pages, msg.pageUrls);
}

chrome.tabs.onRemoved.addListener(tabId => { delete _pageStore[tabId]; });

/* ── Port long-lived GILLES_ASK ──────────────────────────────── */
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'gilles-ask') return;
  port.onMessage.addListener(async msg => {
    if (!msg || msg.type !== 'GILLES_ASK') return;
    const override = msg.systemPreset ? await getPresetPrompt(msg.systemPreset) : (msg.systemOverride || null);
    askLLM(msg.history, pagesForMessage(msg, port.sender), override).then(resp => {
      try { port.postMessage(resp); } catch (e) {}
    });
  });
});

/* ── Routeur messages ───────────────────────────────────────── */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return false;
  if (msg.type === 'GILES_ASK') {
    askLLM(msg.history, pagesForMessage(msg, sender)).then(sendResponse);
    return true;
  }
  if (msg.type === 'GILES_PAGES_STATE') {
    const tabId = sender && sender.tab && sender.tab.id != null ? sender.tab.id : -1;
    const store = _pageStore[tabId] || {};
    const have  = {};
    for (const u of Object.keys(store)) have[u] = store[u].time || 0;
    sendResponse({ ok: true, have });
    return false;
  }
  if (msg.type === 'GILES_PING') {
    getFallbackChain().then(chain => {
      if (!chain.length) { sendResponse({ ok: false, error: 'NO_KEY' }); return; }
      const provider = chain[0];
      pingProvider(provider).then(r => sendResponse(Object.assign(r, { provider })));
    });
    return true;
  }
  if (msg.type === 'GILES_DAI_MODELS') {
    getDAIModelList().then(sendResponse);
    return true;
  }
  if (msg.type === 'ARTIS_NOTIFY') {
    notify(msg.title, msg.body, msg.tag).then(sendResponse);
    return true;
  }
  return false;
});
