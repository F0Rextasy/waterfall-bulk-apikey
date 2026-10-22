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

**Massenhaftes Erstellen von Waterfall-Konten mit automatisch generierten API-Schlüsseln — OpenAI-kompatible Inferenz + 9Router-Konnektor.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-476%20served-412991?style=for-the-badge)](https://getwaterfall.org)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Schnellstart](#-quick-start) · [🎁 Kostenlose Stufe](#-free-tier--how-much-you-get) · [🤖 Modelle](#-models--all-476-of-them) · [🧪 Die API verwenden](#-how-to-use-the-api) · [✅ Verifiziert](#-verified-working--every-key-is-tested) · [🧭 So funktioniert es](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Optionen](#️-cli-options) · [🛰️ Proxys](#️-behind-a-proxy) · [🐞 Probleme](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Warum es das gibt

Waterfall gibt jedem Konto einen **kostenlosen API-Schlüssel**, der durch eine **Proof-of-Work-Registrierung** (sha256-Challenge, Schwierigkeit ~4) und eine **Mail-Link-Verifizierung** geschützt ist — keine Karte, kein Captcha. Die Einheit, die skaliert, ist *ein Konto pro Schlüssel*, und dieses Tool macht daraus eine `keys.txt`, in der **jede Zeile einen echten Chat-Aufruf überlebt hat**. Gemessen auf der Flotte des Betreibers: **~2,9 s/Schlüssel Wandzeit** bei 24 Workern mit Exit-Pool-Rotation und automatischem Mail-Rail-Failover.

## 🎁 Kostenlose Stufe — wie viel du bekommst

**Jedes neue Konto erhält einen kostenlosen Schlüssel** — keine Karte, kein Captcha.

| Was | Wert |
| --- | --- |
| Anmeldeguthaben | kostenloser Schlüssel mit Kontingent auf dem Konto |
| Karte erforderlich | **Nein** |
| Täglicher Check-in | nicht erforderlich |
| Anmeldung | Proof-of-Work-Challenge + Mail-Link |
| Die Einheit, die skaliert | **ein Konto = ein Schlüssel** → `--count N` bedeutet „N kostenlose Konten" |

> 💡 Die kostenlose Stufe wird von Waterfall festgelegt und kann sich ändern. Prüfe die aktuellen Zahlen auf [getwaterfall.org](https://getwaterfall.org) — und lass das Gate des Tools selbst entscheiden:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelle — alle 476 davon

Der Katalog stellt **476 Modell-IDs** bereit (`GET /api/v1/models`), von denen **22 auf `-free` enden**. Live verifizierte IDs sind oben aufgeführt; die `-free`-Zwillinge können ratenbegrenzt sein (429/503) und die `-nvidia-direct`-ID antwortet zuverlässig. `deepseek-*`-IDs existieren im Katalog, geben aber bei kostenlosen Schlüsseln **402** zurück.

## 🧪 So verwendest du die API

Die OpenAI-kompatible Oberfläche liegt unter **`/api/v1`** (der einfache Pfad `/v1` dient nur der Registrierung/Verifizierung):

```bash
curl https://api.getwaterfall.org/api/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"nemotron-3-nano-omni-30b-a3b-reasoning-nvidia-direct","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Schnellstart

```bash

# clone or fork this repository, then:
cd waterfall-bulk-apikey

# 1) your proxy list, one per line (http://… or socks5://…)
printf 'http://127.0.0.1:8080\n' > proxies.txt

# 2) go
node src/launcher.js               # interactive

# or directly:
node src/cli.js run --count 50 --concurrency 12
```

`keys.txt` wird **erst** geschrieben, nachdem eine echte Chat-Vervollständigung den Schlüssel bestätigt hat.

| Modus | Was er tut |
| --- | --- |
| `run` | Konten erstellen bis `--count`, jeden Schlüssel mit einem echten Chat prüfen |
| `gate` | ausstehende Schlüssel erneut durchlaufen — `--rounds N` |
| `probe` | Umgebungsprüfung: Exits, Mail-Rail, Katalog, Gate für vorhandene Schlüssel |
| `screen` | rohe Exit-Listen in einen Live-Pool filtern |
| `collect` | `keys.txt` aus `accounts.json` neu aufbauen |

### 🖱️ Der Launcher

Der Launcher fragt nach der Proxy-Liste, Anzahl und Verifizierungsmodell, merkt sie sich in `launcher.config.json` und führt die CLI mit den richtigen Flags aus.

## ✅ Verifiziert funktionierend — jeder Schlüssel wird getestet

| Prüfung | Ergebnis |
| --- | --- |
| `GET /v1/register/challenge` | **200** — sha256 Proof-of-Work (Schwierigkeit ≈4) |
| `POST /v1/register` | **200** — Konto erstellt, Mail-Link gesendet |
| Mail-Link → `POST /v1/verify` | **200** — Konto verifiziert, `wf-…`-Schlüssel ausgegeben |
| `POST /api/v1/chat/completions` — für **jeden** Schlüssel ausgeführt, bevor er geschrieben wird | **200** mit echtem Inhalt |
| ein Schlüssel, der seine Chat-Prüfung nicht besteht | wird nie in `keys.txt` geschrieben |

## 🧭 So funktioniert es

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Waterfall page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.getwaterfall.org/api/v1/chat/completions → real content = the key is live
```

| Schritt | Aufruf | Hinweise |
| --- | --- | --- |
| Challenge | `GET /v1/register/challenge` | sha256-PoW lokal lösen |
| Registrierung | `POST /v1/register` | Mailbox aus deiner Rail (das Tool rotiert Rails und zählt Failover) |
| Verifizierung | Mail-Link → `POST /v1/verify` | gibt den `wf-…`-Schlüssel aus |
| Prüfung | `POST /api/v1/chat/completions` | Live-200 erforderlich, bevor `keys.txt` geschrieben wird |

## ⚙️ CLI-Optionen

```bash
node src/cli.js <mode> [flags]
```

| Modus | Flags | Bedeutung |
| --- | --- | --- |
| `run` | `--count N` · `--concurrency N` · `--mail <rail>` · `--model <id>` | erstellen + prüfen (≈2,9 s/Schlüssel bei 24 Workern auf der Flotte des Betreibers) |
| `gate` | `--rounds N` | Schlüssel erneut durchlaufen, die 429/503 geantwortet haben |
| `probe` | — | Exits · Mail-Rail · Katalog · Gate für vorhandene Schlüssel |
| `screen` | — | rohe Listen → Live-Exit-Pool |
| `collect` | — | `keys.txt` aus `accounts.json` neu aufbauen |

Standardwerte: `--count 50`, `--concurrency 12`, `--mail chain` (echter Alias → Broker).

## 🛰️ Hinter einem Proxy

Jede Anfrage verlässt das System über einen Exit aus deinem Pool; die Rail rotiert Exits pro Konto und zeichnet den Egress in `state.json` auf. Die Registrierung ist auf **5 Konten pro Netzwerkpfad pro Tag** begrenzt, also rotiere Exits aggressiv.

## 📄 Dateien

| Pfad | Inhalt |
| --- | --- |
| `keys.txt` | Chat-200-Schlüssel, einer pro Zeile mit einer `# chat-200 <model>`-Markierung; ungeprüfte Nachzügler tragen eine `# ungated`-Markierung — von Git ignoriert |
| `accounts.json` | E-Mail / Schlüssel / Exit / Chat-200-Modelle pro Konto |
| `state.json` | Egress-Ledger (5-Registrierungen/Tag-Abrechnung) — von Git ignoriert |
| `proxies.txt` | deine Exit-Liste — von Git ignoriert |

## 🔌 Mit 9Router verbinden

[9Router](https://9router.com) ist ein selbst gehosteter, OpenAI-kompatibler Router. Ein Befehl verwandelt `keys.txt` in einen Provider-Node mit funktionierenden Kombos:

```bash
node src/connect-9router.js
```

Standardwerte: `--base http://localhost:20128`, `--password 123456`, `--name "Waterfall"`, `--prefix waterfall`, `--base-url https://api.getwaterfall.org/api/v1`.

## 🔌 Mit OmniRoute verbinden

[OmniRoute](https://omniroute.online) ist ein selbst gehosteter, OpenAI-kompatibler Router. Ein Befehl verwandelt `keys.txt` in einen Provider-Node mit funktionierenden Kombos:

```bash
node src/connect-omniroute.js
```

Standardwerte: `--base http://localhost:20128`, `--password 123456`, `--name "Waterfall"`, `--prefix waterfall`, `--base-url https://api.getwaterfall.org/api/v1`.
## 🔑 Was ein Schlüssel dir bringt

| | |
| --- | --- |
| 🏢 Anbieter | **Waterfall** — [getwaterfall.org](https://getwaterfall.org) |
| 🎁 Was der Anbieter gibt | ein Konto pro Schlüssel — Proof-of-Work-Registrierung, Mail-Link-Verifizierung, jeder Schlüssel chat-verifiziert |
| 🔑 Was ein Schlüssel dir bringt | ein API-Schlüssel, der auf sein eigenes Konto beschränkt ist: die 476 Modell-IDs am unten stehenden Endpunkt, im Rahmen deines Tarifs. Das Kontingent liegt auf dem **Konto**, weshalb dieses Tool genau ein Konto pro Schlüssel erstellt |
| 🌐 API-Form | OpenAI-kompatibel: `POST https://api.getwaterfall.org/api/v1/chat/completions` |
| 🔒 Deine Daten | nur getwaterfall.org und das von dir konfigurierte Inbox-Backend werden kontaktiert; Schlüssel bleiben auf deinem Rechner |

## 🐞 Probleme

Wenn das Panel die Form seiner Registrierung, die PoW-Schwierigkeit oder den Katalog ändert, stoppt das Tool an diesem Schritt und sagt es dir. **[Öffne ein Issue](../../issues)** mit dem ausgeführten Befehl und der exakten Ausgabe; PRs sind willkommen.

## 📄 Lizenz

MIT © 2026 — siehe [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 waterfall-bulk-apikey contributors

</div>