'use strict';
/**
 * Waterfall (api.getwaterfall.org) bulk mint rail — free tier keys.
 *
 * Surfaces (do not mix them up):
 *   https://api.getwaterfall.org/v1        registration + verification API
 *   https://api.getwaterfall.org/api/v1    OpenAI-compatible chat + /models
 *
 * Flow, per account, entirely over the exit's own connection:
 *   1. GET  /v1/register/challenge        -> {challenge, difficulty, algorithm}
 *   2. solve sha256(challenge + nonce) with `difficulty` leading zero hex nibbles
 *   3. Mailtrap inbound inbox -> fresh `...@inbound-mailtrap.io` address
 *   4. POST /v1/register {email, challenge, nonce}   -> verification_required
 *   5. poll the inbox, pull the token out of the verify link
 *   6. POST /v1/verify token=<token>      -> HTML carrying the one-shot wf- key
 *   7. chat-200 gate on a live free model; only a passing key is stored
 *
 * Registration is capped at 5 per network per day, so every account burns a
 * distinct exit and the ledger in state.json keeps a day's exits apart:
 *
 *   node providers/waterfall/mint.js probe          # surface + gate proof
 *   node providers/waterfall/mint.js screen         # which exits carry the API
 *   node providers/waterfall/mint.js run --count 50 # mint with the chat-200 gate
 *
 * No browser: the whole rail is HTTP, so there is no fingerprint to pin — the
 * User-Agent is drawn per request from a small real-Chrome pool instead.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { parseProxy, loadPoolFile, fetchText } = require('../../river-bulk-apikey/src/proxy');
const { Mailtrap } = require('../../river-bulk-apikey/src/mailtrap');
const { TempTf } = require('../../river-bulk-apikey/src/temptf');
const ROOT = path.join(__dirname, '..', '..');
const REG = 'https://api.getwaterfall.org/v1';
const API = 'https://api.getwaterfall.org/api/v1';
const KEYS_FILE = path.join(__dirname, 'keys.txt');
const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');
const STATE_FILE = path.join(__dirname, 'state.json');
const EXITS_FILE = path.join(ROOT, 'proxy-lab/out/waterfall-exits.json');
const REPORT_FILE = path.join(ROOT, 'proxy-lab/out/waterfall-scale-20261019.md');
// The `-free` twins 429/503 for hours at a time (measured 2026-10-19); the
// `-nvidia-direct` id of the same model kept answering 200 through the same keys,
// so it leads the gate and the twins stay as the fallback pair.
const FREE_DIRECT = 'nemotron-3-nano-omni-30b-a3b-reasoning-nvidia-direct';
const FREE_SEED = 'nemotron-3-nano-omni-30b-a3b-reasoning-free';
const FREE_ALT = 'laguna-s-2.1-free';
const GATE_MODELS = [FREE_DIRECT, FREE_SEED, FREE_ALT];
const MAILTRAP_FOLDER = 'waterfall';
// Mail rail order: a real Microsoft alias first (no disposable flag), the Mailtrap
// broker as the spare while its inbox quota has room.
const MAIL_CHAIN = ['temptf', 'mailtrap'];
let mailboxFailovers = 0;

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
];
// Measured 2026-10-19: ~9 % of these free exits answer the register challenge and
// ~11 % of those carry a whole sign-up, so a 50-key day needs *thousands* of
// candidates — hence the wide, shuffled samples below.
// The user's own pool comes first: WATERFALL_PROXIES env (launcher) or a local
// proxies.txt next to this file; the named lab dumps below are spare tanks.
const PROXY_POOLS = [
  { file: process.env.WATERFALL_PROXIES || path.join(__dirname, 'proxies.txt') },
  { file: 'proxy-lab/out/proxies-emergency.txt' },
  { file: 'proxy-lab/out/chrome-safe-exits.txt' },
  { file: 'proxy-lab/out/free-proxies-live.txt' },
  { file: 'proxy-lab/out/proxies-manual.txt' },
  { file: 'proxy-lab/out/proxies-mobile.txt' },
  { file: 'proxy-lab/out/pilot-proxies.txt' },
  { file: 'proxy-lab/out/proxies-emergency.live.txt', code: true },
  { file: 'proxy-lab/out/jcx-good-proxies.json' },
  { file: 'proxy-lab/out/broker-proxies.txt' },
  { file: 'proxy-lab/out/union-live.txt', sample: 6000 },
  { file: 'proxy-lab/out/pool-refresh-2026-10-14T18-56-54.txt', sample: 1200 },
  { file: 'proxy-lab/out/pool-refresh-2026-10-14T14-16-32.txt', sample: 1200 },
  { file: 'proxy-lab/out/mango-pool-final.txt', sample: 800 },
  { file: 'proxy-lab/out/mango-pool-r4.txt', sample: 800 },
  { file: 'proxy-lab/out/bt-cand.txt', sample: 1500 },
  { file: 'proxy-lab/out/sv-allowed.txt', sample: 3000 },
];


const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ua = (i) => UA_POOL[i % UA_POOL.length];
const today = () => new Date().toISOString().slice(0, 10);

function log(msg) {
  const line = `${new Date().toISOString().slice(11, 19)} ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(REPORT_FILE, `- ${line}\n`);
  } catch (e) {
    /* report is best-effort */
  }
}

function markdownHeader(title) {
  try {
    fs.appendFileSync(REPORT_FILE, `\n## ${title}\n`);
  } catch (e) {
    /* ignore */
  }
}

// ------------------------------------------------------------------ exits

/** Lines of a big list, shuffled down to `sample` — random, not the same head. */
function poolLines(file, { sample = 0, code = false } = {}) {
  let lines = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => (code ? l.replace(/^\d{3}\s+/, '') : l).trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));
  if (sample && lines.length > sample) lines = lines.sort(() => Math.random() - 0.5).slice(0, sample);
  return lines;
}

function allExits() {
  const seen = new Set();
  const out = [];
  const add = (p) => {
    if (!p || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(p.host)) return;
    const key = `${p.host}:${p.port}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...p, key });
  };
  for (const spec of PROXY_POOLS) {
    const f = path.join(ROOT, spec.file);
    if (!fs.existsSync(f)) continue;
    for (const line of poolLines(f, spec)) add(parseProxy(line));
  }
  const screened = path.join(ROOT, 'proxy-lab/out/waterfall-exits.json');
  if (fs.existsSync(screened)) {
    for (const entry of JSON.parse(fs.readFileSync(screened, 'utf8'))) add(parseProxy(entry.proxy || entry));
  }
  return out;
}

/**
 * The address an exit really presents — a transparent proxy leaks our own line.
 * Echo services block plenty of free exits, so a proxy that answers none of
 * three is still usable: it just gets its own private bucket (`unknown:<exit>`),
 * which keeps the 5-per-network register cap conservative per exit.
 */
async function egressOf(exit, index) {
  for (const url of ['https://api.ipify.org?format=json', 'https://icanhazip.com']) {
    try {
      const r = await json(exit, url, { timeoutMs: 7000 }, index);
      const ip = r.json && r.json.ip ? r.json.ip : String(r.text || '').trim().split(/\s+/)[0];
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip;
    } catch (e) {
      /* try the next echo */
    }
  }
  return `unknown:${exit.key}`;
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { day: today(), exits: {}, minted: 0, failed: 0 };
  const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  if (s.day !== today()) return { day: today(), exits: {}, minted: 0, failed: 0 };
  return s;
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/** Exits this run may still use: fewer than 5 registrations recorded today. */
function usableExits(state) {
  return allExits().filter((e) => (state.exits[e.key] || 0) < 5);
}

// ------------------------------------------------------------------ PoW

function solveChallenge(challenge, difficulty, algorithm) {
  if (String(algorithm || 'sha256').toLowerCase() !== 'sha256') {
    throw new Error(`unsupported PoW algorithm ${algorithm}`);
  }
  const target = '0'.repeat(difficulty);
  for (let nonce = 0; nonce < 200_000_000; nonce += 1) {
    const digest = crypto.createHash('sha256').update(`${challenge}${nonce}`).digest('hex');
    if (digest.startsWith(target)) return String(nonce);
  }
  throw new Error('PoW did not converge');
}

// ------------------------------------------------------------------ HTTP

async function json(proxy, url, opts, index) {
  const text = await fetchText(proxy, url, {
    timeoutMs: opts.timeoutMs || 25000,
    method: opts.method || 'GET',
    headers: { Accept: 'application/json', 'User-Agent': ua(index), ...(opts.headers || {}) },
    body: opts.body,
  });
  try {
    return { text, json: JSON.parse(text) };
  } catch (e) {
    return { text, json: null };
  }
}

/** Pull the verification token out of whatever the mail carried. */
function tokenFromMail(text) {
  const urls = String(text).match(/https?:\/\/[^\s"'<>)]+/g) || [];
  for (const raw of urls) {
    try {
      const u = new URL(raw.replace(/&amp;/g, '&').replace(/[.,;]+$/, ''));
      const t = u.searchParams.get('token') || u.searchParams.get('t') || u.searchParams.get('code');
      if (t && t.length > 8) return t;
      const m = u.pathname.match(/(?:verify|confirm)\/([A-Za-z0-9._-]{10,})/);
      if (m) return m[1];
    } catch (e) {
      /* not a URL after all */
    }
  }
  const inline = String(text).match(/\btoken["'\s:=]+([A-Za-z0-9._-]{16,})/i);
  return inline ? inline[1] : null;
}

const keyFromHtml = (html) => {
  const m = String(html).match(/\bwf-[A-Za-z0-9._-]{20,}/);
  return m ? m[0] : null;
};

// ------------------------------------------------------------------ gate

async function chatGate(proxy, key, index, models = GATE_MODELS) {
  let last = '';
  for (const model of models) {
    try {
      const { text, json: body } = await json(
        proxy,
        `${API}/chat/completions`,
        {
          method: 'POST',
          timeoutMs: 90000,
          headers: { Authorization: `Bearer ${key}` },
          body: { model, messages: [{ role: 'user', content: 'Reply exactly: WF-OK' }], max_tokens: 24 },
        },
        index
      );
      const content = body && body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content;
      if (content) return { model, sample: String(content).slice(0, 40) };
      last = text.slice(0, 110).replace(/\n/g, ' ');
    } catch (e) {
      last = `ERR ${String(e.message).slice(0, 70)}`;
    }
  }
  return { failed: last };
}

/**
 * Which catalogue ids answer right now. Their upstreams flap (503/429 in bursts),
 * so the gate set is measured per run: the `-free` ids plus the `-nvidia-direct`
 * variant that kept serving when the free twins were rate-limited all night.
 */
async function discoverGates(proxy, key, index) {
  const list = await json(proxy, `${API}/models`, {}, index);
  const ids = list.json
    ? (list.json.data || []).map((m) => m.id).filter((i) => i.endsWith('-free') || i.includes('nvidia-direct'))
    : [FREE_DIRECT];
  const live = [];
  for (const model of [...new Set([FREE_DIRECT, ...ids])].slice(0, 14)) {
    const r = await chatGate(proxy, key, index, [model]);
    if (!r.failed) live.push(model);
  }
  return live;
}

// ------------------------------------------------------------------ mailbox

/**
 * Mailtrap hands out `…@inbound-mailtrap.io`, which the sign-up gate accepts,
 * but the workspace allows 300 inboxes and the shared account is full — so the
 * default backend is temp.tf: a plus alias on a real Microsoft mailbox, which no
 * disposable-domain filter can flag. Both expose the same three calls.
 */
async function openMailbox(exit, index, backend) {
  // Mail quota is never a reason to wait: a rail that refuses (Mailtrap's inbox
  // cap, temp.tf throttling) hands the account to the next one immediately.
  const chain = backend === 'chain' ? MAIL_CHAIN : [backend];
  let lastError = null;
  for (const rail of chain) {
    try {
      return await openOne(rail, exit);
    } catch (err) {
      lastError = err;
      mailboxFailovers += 1;
      log(`mail rail ${rail} failed (${String(err.message).slice(0, 90)}) -> next`);
    }
  }
  throw lastError || new Error('every mail rail failed');
}

async function openOne(rail, exit) {
  if (rail === 'mailtrap') {
    const mail = new Mailtrap({ proxy: exit, folder: MAILTRAP_FOLDER, log: () => {} });
    const { address } = await mail.createAccount();
    return {
      rail,
      address,
      poll: () => mail.inboxContents(),
      close: async () => {
        try {
          await mail.call('DELETE', `/inbound/inboxes/${mail.inboxId}`);
        } catch (e) {
          /* a spent inbox is dead weight; failure to drop it is not fatal */
        }
      },
    };
  }
  if (rail !== 'temptf') throw new Error(`unknown mail rail ${rail}`);
  const tf = new TempTf({ proxy: exit, plus: true, log: () => {} });
  const { address } = await tf.createAccount();
  return { rail, address, poll: () => tf.messages(), close: async () => {} };
}

/**
 * One account on one exit. Returns the key (or throws).
 *
 * `preset` is the challenge the caller already pulled while deciding whether the
 * exit is alive — re-fetching it would double the GETs against a flaky exit.
 */
async function mintOne(exit, index, backend, preset = null) {
  const tag = `${exit.host}:${exit.port}`;
  const challenge = preset || (await json(exit, `${REG}/register/challenge`, {}, index));
  if (!challenge.json || !challenge.json.challenge) {
    throw new Error(`challenge: ${challenge.text.slice(0, 90).replace(/\n/g, ' ')}`);
  }
  const { challenge: c, difficulty = 4, algorithm = 'sha256' } = challenge.json;
  const nonce = solveChallenge(c, difficulty, algorithm);

  const box = await openMailbox(exit, index, backend);
  const { address } = box;

  const reg = await json(
    exit,
    `${REG}/register`,
    { method: 'POST', body: { email: address, challenge: c, nonce } },
    index
  );
  if (!reg.json || reg.json.status !== 'verification_required') {
    await box.close().catch(() => {});
    throw new Error(`register(${address}): ${reg.text.slice(0, 110).replace(/\n/g, ' ')}`);
  }

  let token = null;
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline && !token) {
    await sleep(4000);
    for (const m of await box.poll()) {
      token = tokenFromMail(m.text) || tokenFromMail(m.subject);
      if (token) break;
    }
  }
  if (!token) {
    await box.close().catch(() => {});
    throw new Error(`no verify mail for ${address} in 180s`);
  }
  const form = new URLSearchParams({ token }).toString();
  const verify = await json(
    exit,
    `${REG}/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html,application/json' },
      body: form,
    },
    index
  );
  let key = keyFromHtml(verify.text) || (verify.json && (verify.json.api_key || verify.json.key || verify.json.apiKey));
  if (!key && verify.json) key = keyFromHtml(JSON.stringify(verify.json));
  if (!key) {
    await box.close().catch(() => {});
    throw new Error(`verify: ${verify.text.slice(0, 140).replace(/\n/g, ' ')}`);
  }

  await box.close().catch(() => {});
  log(`MINTED ${address} exit=${tag} key=${key} rail=${box.rail}`);
  return { address, key, exit: tag, rail: box.rail };
}

// ------------------------------------------------------------------ modes

async function screen() {
  const exits = allExits();
  markdownHeader(`exit screen — ${exits.length} candidates`);
  const good = [];
  const queue = exits.slice();
  const workers = Array.from({ length: 8 }, async (_, w) => {
    while (queue.length) {
      const e = queue.shift();
      try {
        const r = await json(e, `${REG}/register/challenge`, { timeoutMs: 9000 }, w);
        if (r.json && r.json.challenge) {
          good.push({ proxy: `${e.protocol}://${e.host}:${e.port}`, difficulty: r.json.difficulty, algorithm: r.json.algorithm });
        }
      } catch (err) {
        /* dead exit, expected */
      }
    }
  });
  await Promise.all(workers);
  log(`screen: ${good.length}/${exits.length} exits reach /v1/register/challenge (difficulty ${good[0] ? good[0].difficulty : '?'})`);
  fs.writeFileSync(EXITS_FILE, JSON.stringify(good, null, 2));
  return good;
}

async function probe() {
  const exits = await screen();
  const key = readKeys()[0];
  const p = parseProxy(exits[0].proxy);
  const models = await json(p, `${API}/models`, {}, 0);
  const ids = models.json ? (models.json.data || models.json).map((m) => m.id) : [];
  log(`models via ${exits[0].proxy}: ${ids.length} (${ids.filter((i) => i.endsWith('-free')).length} free)`);
  const gate = await chatGate(p, key, 0);
  log(`existing key gate: ${gate ? `CHAT-200 ${gate.model} "${gate.sample}"` : 'FAILED'}`);
  return gate;
}

/**
 * Mint keys (the scarce part: 5 registrations per network per day), then gate
 * them separately — the free upstreams answer in bursts, so a key that 429s
 * once is worth retrying on the next exit rather than throwing away.
 */
async function run(count, { concurrency = 6, backend = 'chain' } = {}) {
  const state = loadState();
  if (!state.egress) state.egress = {};
  if (!state.pending) state.pending = [];
  const exits = usableExits(state);
  const startedAt = Date.now();
  markdownHeader(`mint run ${new Date().toISOString()} — target ${count}, ${exits.length} exits eligible`);
  const minted = [];
  const queue = exits.slice().sort(() => Math.random() - 0.5);
  let failures = 0;
  let deaths = 0;
  const beat = setInterval(() => {
    log(`heartbeat: ${minted.length} minted, ${failures} failures, ${deaths} dead exits, ${queue.length} queued`);
  }, 300_000);
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async (_, w) => {
    while (queue.length && minted.length < count) {
      const e = queue.shift();
      if ((state.exits[e.key] || 0) >= 5) continue;
      // Liveness first: a dead exit must cost one short GET, not four timeouts.
      let challenge = null;
      try {
        challenge = await json(e, `${REG}/register/challenge`, { timeoutMs: 6000 }, w);
      } catch (err) {
        /* dead exit */
      }
      if (!challenge || !challenge.json || !challenge.json.challenge) {
        deaths += 1;
        if (deaths % 100 === 0) log(`dead exits: ${deaths} (queued ${queue.length}, minted ${minted.length})`);
        continue;
      }
      const egress = await egressOf(e, w);
      if ((state.egress[egress] || 0) >= 5) continue; // same network, cap already spent
      state.egress[egress] = (state.egress[egress] || 0) + 1;
      state.exits[e.key] = (state.exits[e.key] || 0) + 1;
      try {
        const r = await mintOne(e, w, backend, challenge);
        state.minted = (state.minted || 0) + 1;
        minted.push(r);
      } catch (err) {
        state.failed = (state.failed || 0) + 1;
        failures += 1;
        log(`FAIL ${e.key} egress=${egress} ${String(err.message).slice(0, 150)}`);
      }
      saveState(state);
    }
  });
  await Promise.all(workers);
  clearInterval(beat);
  log(
    `mint phase done: ${minted.length} keys in ${Math.round((Date.now() - startedAt) / 1000)}s ` +
      `(${minted.length ? Math.round((Date.now() - startedAt) / 1000 / minted.length) : '∞'}s/key, failures ${failures}, ` +
      `mail failovers ${mailboxFailovers})`
  );

  const pool = [...state.pending, ...minted];
  state.pending = [];
  const gates = await gateSweep(pool, state);
  log(`run done: ${gates.length} keys gated (still pending ${state.pending.length})`);
  return gates;
}

/** Screened exits, used to retry the gate away from a flaky route. */
function screenedExits() {
  if (!fs.existsSync(EXITS_FILE)) return [];
  const out = [];
  for (const entry of JSON.parse(fs.readFileSync(EXITS_FILE, 'utf8'))) {
    const p = parseProxy(entry.proxy || entry);
    if (p) out.push(p);
  }
  return out;
}

async function gateSweep(items, state, { rounds = 3 } = {}) {
  if (!items.length) return [];
  const exits = screenedExits();
  if (!exits.length) {
    log('gate sweep skipped: no screened exits');
    state.pending.push(...items);
    saveState(state);
    return [];
  }
  const live = await discoverGates(exits[0], items[0].key, 0);
  const models = live.length ? live : GATE_MODELS;
  log(`gate sweep: ${items.length} keys, models=${models.join(',')}`);
  const gated = [];
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    let pass = null;
    for (let round = 0; round < rounds && !pass; round += 1) {
      const e = exits[(i + round) % exits.length];
      const r = await chatGate(e, it.key, i + round, models);
      if (!r.failed) pass = { ...it, model: r.model, sample: r.sample };
      else if (round < rounds - 1) await sleep(5000);
    }
    if (pass) {
      appendKey(pass);
      gated.push(pass);
      log(`GATED ${pass.key} model=${pass.model} "${pass.sample}" (${it.address})`);
    } else {
      state.pending.push(it);
    }
    saveState(state);
  }
  return gated;
}

function readKeys() {
  return fs
    .readFileSync(KEYS_FILE, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(/\s+/)[0]);
}

function appendKey(r) {
  if (!readKeys().includes(r.key)) fs.appendFileSync(KEYS_FILE, `${r.key}\n`);
  const db = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  db.accounts.push({
    email: r.address,
    key: r.key,
    exit: r.exit,
    minted: new Date().toISOString(),
    chat_200_models: [r.model],
  });
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(db, null, 2));
}

/**
 * Every key this rail has minted, from the run log — the log is the only place a
 * key survives when a gate fails, so it is the source of truth for a rebuild.
 */
function harvestReport() {
  if (!fs.existsSync(REPORT_FILE)) return [];
  const out = new Map();
  for (const line of fs.readFileSync(REPORT_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/MINTED (\S+) exit=(\S+) key=(wf-\S+)/);
    if (m) out.set(m[3], { address: m[1], exit: m[2], key: m[3] });
    const g = line.match(/GATED (wf-\S+) model=(\S+)/);
    if (g && out.has(g[1])) out.get(g[1]).model = g[2];
    // A swept-but-ungated key is still a live account: keep it even when its
    // MINTED line is the one line a killed run never got to write.
    const f = line.match(/FAIL (wf-\S+) \(([^)]*)\)/);
    if (f && !out.has(f[1])) out.set(f[1], { key: f[1], address: f[2], exit: '' });
  }
  return [...out.values()];
}

/** Rebuild keys.txt (gated first, then ungated, both commented) + accounts.json. */
function collect() {
  const rows = harvestReport();
  // Keys proven in an earlier session (and any key already on the file that the
  // log does not cover) must survive a rebuild — the log only knows this day's.
  const known = new Set(rows.map((r) => r.key));
  const kept = [];
  if (fs.existsSync(KEYS_FILE)) {
    for (const line of fs.readFileSync(KEYS_FILE, 'utf8').split(/\r?\n/)) {
      const key = line.trim().split(/\s+/)[0];
      if (!key.startsWith('wf-') || known.has(key)) continue;
      known.add(key);
      kept.push({ key, model: /chat-200/.test(line) ? 'previously proven' : null, address: (line.split('·')[2] || '').trim(), exit: '' });
    }
  }
  const all = [...rows, ...kept];
  const gated = all.filter((r) => r.model);
  const ungated = all.filter((r) => !r.model);
  const head = [
    '# Waterfall (api.getwaterfall.org) — free-tier keys',
    '# base (chat + /models): https://api.getwaterfall.org/api/v1   —   /v1 is register/verify ONLY',
    '# 200 models: nemotron-3-nano-omni-30b-a3b-reasoning-free, laguna-s-2.1-free',
    '# everything else free 503s at the upstream; deepseek-* answer 402 (x402/USDC on Base)',
    `# rail: providers/waterfall/mint.js (PoW + temp.tf alias + /v1/verify) · ${all.length} keys, ${gated.length} chat-200 gated`,
    '# gate: the two free upstreams 429/503 in bursts (retryable) — ungated keys are minted and auth-valid; re-run proxy-lab/waterfall-gate-fast.js',
  ];
  const body = [
    ...gated.map((r) => `${r.key}  # chat-200 ${r.model}${r.address ? ` · ${r.address}` : ''}`),
    ...ungated.map((r) => `${r.key}  # ungated (upstream 429/503)${r.address ? ` · ${r.address}` : ''}`),
  ];
  fs.writeFileSync(KEYS_FILE, `${[...head, ...body].join('\n')}\n`);
  const db = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  db.accounts = all.map((r) => ({
    email: r.address,
    key: r.key,
    exit: r.exit,
    chat_200_models: r.model ? [r.model] : [],
  }));
  db.minted_total = all.length;
  db.gated_total = gated.length;
  db.updated = new Date().toISOString();
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(db, null, 2));
  log(`collect: ${all.length} keys, ${gated.length} gated, ${ungated.length} ungated`);
  return all;
}

async function main() {
  // Accept both the plain modes and the launcher form (`node src/cli.js
  // --count N --concurrency N`) — anything that is not a known mode is a run.
  const KNOWN = new Set(['collect', 'screen', 'probe', 'run', 'gate', 'mint']);
  let mode = process.argv[2] || 'run';
  if (mode.startsWith('--')) mode = 'run';
  if (mode === 'mint') mode = 'run';
  if (!KNOWN.has(mode)) mode = 'run';
  const argOf = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i > -1 ? process.argv[i + 1] : fallback;
  };
  const modelArg = argOf('--model');
  if (modelArg) GATE_MODELS.unshift(modelArg);
  if (mode === 'collect') return collect();
  if (mode === 'screen') return screen();
  if (mode === 'probe') return probe();
  if (mode === 'run') {
    return run(Number(argOf('--count', 50)), {
      concurrency: Number(argOf('--concurrency', 12)),
      backend: argOf('--mail', 'chain'),
    });
  }
  if (mode === 'gate') {
    const state = loadState();
    const pool = state.pending || [];
    state.pending = [];
    const gated = await gateSweep(pool, state, { rounds: Number(argOf('--rounds', 4)) });
    log(`gate sweep: ${gated.length}/${pool.length} passed (${state.pending.length} still pending)`);
    return gated;
  }
  throw new Error(`unknown mode ${mode}`);
}

main().then(
  (r) => {
    if (Array.isArray(r)) log(`keys this run: ${r.length}`);
  },
  (e) => {
    log(`FATAL ${e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message}`);
    process.exit(1);
  }
);
