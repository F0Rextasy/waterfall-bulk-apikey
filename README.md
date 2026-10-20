<div align="center">

```
██╗    ██╗███████╗██╗
██║    ██║██╔════╝██║
██║ █╗ ██║█████╗  ██║
██║███╗██║██╔══╝  ██║
╚███╔███╔╝██║     ███████╗
 ╚══╝╚══╝ ╚═╝     ╚══════╝
```

# waterfall-bulk-apikey

**Bulk-create Waterfall accounts with auto-generated API keys — OpenAI-compatible inference + 9Router connector.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-476%20served-412991?style=for-the-badge)](https://getwaterfall.org)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Quick start](#-quick-start) · [🎁 Free tier](#-free-tier--how-much-you-get) · [🤖 Models](#-models--all-476-of-them) · [🧪 Use the API](#-how-to-use-the-api) · [✅ Verified](#-verified-working--every-key-is-tested) · [🧭 How it works](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Issues](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Why this exists

Waterfall hands every account a **free API key** protected by a **proof-of-work sign-up** (sha256 challenge, difficulty ~4) and a **mail-link verification** — no card, no captcha. The unit that scales is *one account per key*, and this tool turns that into a `keys.txt` where **every line survived a live chat call**. Measured on the operator's fleet: **~2.9 s/key wall** at 24 workers with an exit-pool rotation and automatic mail-rail failover.

## 🎁 Free tier — how much you get

**Every new account gets a free key** — no card, no captcha.

| What | Value |
| --- | --- |
| Sign-up credit | free key with quota on the account |
| Card required | **No** |
| Daily check-in | not required |
| Sign-up | proof-of-work challenge + mail link |
| The unit that scales | **one account = one key** → `--count N` is "N free accounts" |

> 💡 The free tier is set by Waterfall and can change. Check the live numbers at [getwaterfall.org](https://getwaterfall.org) — and let the tool's own gate decide:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Models — all 476 of them

The catalogue exposes **476 model ids** (`GET /api/v1/models`), of which **22 end in `-free`**. Live-verified ids are listed above; the `-free` twins can rate-limit (429/503) and the `-nvidia-direct` id answers reliably. `deepseek-*` ids exist in the catalogue but return **402** on free keys.

## 🧪 How to use the API

The OpenAI-compatible surface lives under **`/api/v1`** (the plain `/v1` path serves registration/verification only):

```bash
curl https://api.getwaterfall.org/api/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"nemotron-3-nano-omni-30b-a3b-reasoning-nvidia-direct","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Quick start

```bash
# clone or fork this repository, then:
cd waterfall-bulk-apikey

# 1) your proxy list, one per line (http://… or socks5://…) — optional: without it the tool runs direct
printf 'http://127.0.0.1:8080\n' > proxies.txt

# 2) go
node src/launcher.js               # interactive
# or directly:
node src/cli.js run --count 50 --concurrency 12
```

`keys.txt` is written **only** after a live chat completion proves the key.

| Mode | What it does |
| --- | --- |
| `run` | mint accounts until `--count`, gate every key with a live chat |
| `gate` | re-sweep pending keys — `--rounds N` |
| `probe` | environment check: exits, mail rail, catalogue, existing-key gate |
| `screen` | filter raw exit lists into a live pool |
| `collect` | rebuild `keys.txt` from `accounts.json` |

### 🖱️ The launcher

The launcher asks for the proxy list, count and verification model, remembers them in `launcher.config.json`, and runs the CLI with the right flags.

## ✅ Verified working — every key is tested

| Check | Result |
| --- | --- |
| `GET /v1/register/challenge` | **200** — sha256 proof-of-work (difficulty ≈4) |
| `POST /v1/register` | **200** — account created, mail-link sent |
| mail link → `POST /v1/verify` | **200** — account verified, `wf-…` key issued |
| `POST /api/v1/chat/completions` — run for **every** key before it is written | **200** with real content |
| a key that fails its chat check | never written to `keys.txt` |

## 🧭 How it works

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Waterfall page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.getwaterfall.org/api/v1/chat/completions → real content = the key is live
```

| Step | Call | Notes |
| --- | --- | --- |
| challenge | `GET /v1/register/challenge` | solve sha256 PoW locally |
| signup | `POST /v1/register` | mailbox from your rail (the tool rotates rails and counts failovers) |
| verify | mail link → `POST /v1/verify` | issues the `wf-…` key |
| check | `POST /api/v1/chat/completions` | live 200 required before `keys.txt` |

## ⚙️ CLI options

```bash
node src/cli.js <mode> [flags]
```

| Mode | Flags | Meaning |
| --- | --- | --- |
| `run` | `--count N` · `--concurrency N` · `--mail <rail>` · `--model <id>` · `--pool <file>` | mint + gate (≈2.9 s/key at 24 workers on the operator's fleet) |
| `gate` | `--rounds N` | re-sweep keys that answered 429/503 |
| `probe` | — | exits · mail rail · catalogue · existing-key gate |
| `screen` | — | raw lists → live exit pool |
| `collect` | — | rebuild `keys.txt` from `accounts.json` |

Defaults: `--count 50`, `--concurrency 12`, `--mail chain` (real alias → broker). The proxy list (`--pool <file>` / env `WATERFALL_PROXIES` / `proxies.txt`) is **optional** — without it the tool connects directly.

## 🛰️ Behind a proxy

**Optional — recommended at scale (per-IP limits, bans).** The tool works without a proxy too.

- **With a pool:** pass `--pool <file>` (or set `WATERFALL_PROXIES`) and every request goes through an exit from that list; the rail rotates exits per account and records egress in `state.json`. A dead line fails that attempt — fail-closed while a pool is provided: a supplied pool never falls back to your own IP.
- **Without a pool:** the CLI prints `running WITHOUT a proxy (direct)` and connects directly. Sign-up, PoW, verification and the chat gate are unchanged — only where the packets leave from.
- Registration is limited to **5 accounts per network path per day**, so rotate exits aggressively — with no pool that whole cap belongs to your single direct line.
- Run `--screen` against either mode: it tests the exits you have (or the direct route) against Waterfall before a real run.

## 📄 Files

| Path | Contents |
| --- | --- |
| `keys.txt` | chat-200 keys, one per line with a `# chat-200 <model>` mark; ungated stragglers carry a `# ungated` mark — git-ignored |
| `accounts.json` | email / key / exit / chat-200 models per account |
| `state.json` | egress ledger (5-registration/day accounting) — git-ignored |
| `proxies.txt` | your exit list — optional, git-ignored |

## 🔌 Connect to 9Router

[9Router](https://9router.com) is a self-hosted, OpenAI-compatible router. One command turns `keys.txt` into a provider-node with working combos:

```bash
node src/connect-9router.js
```

Defaults: `--base http://localhost:20128`, `--password 123456`, `--name "Waterfall"`, `--prefix waterfall`, `--base-url https://api.getwaterfall.org/api/v1`.

## 🔑 What one key gets you

| | |
| --- | --- |
| 🏢 Provider | **Waterfall** — [getwaterfall.org](https://getwaterfall.org) |
| 🎁 What the provider gives | one account per key — proof-of-work sign-up, mail-link verify, every key chat-verified |
| 🔑 What one key gets you | one API key scoped to its own account: the 476 model ids on the endpoint below, at your plan's limits. The quota lives on the **account**, which is exactly why this tool creates one account per key |
| 🌐 API shape | OpenAI-compatible: `POST https://api.getwaterfall.org/api/v1/chat/completions` |
| 🔒 Your data | only getwaterfall.org and the inbox backend you configure are contacted; keys stay on your machine |

## 🐞 Issues

If the panel changes its sign-up shape, PoW difficulty or catalogue, the tool stops at that step and says so. **[Open an issue](../../issues)** with the command you ran and the exact output; PRs are welcome.

## 📄 License

MIT © 2026 — see [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 waterfall-bulk-apikey contributors

</div>
