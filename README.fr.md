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

**Créez en masse des comptes Waterfall avec des clés API générées automatiquement — inférence compatible OpenAI + connecteur 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-476%20served-412991?style=for-the-badge)](https://getwaterfall.org)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Démarrage rapide](#-quick-start) · [🎁 Offre gratuite](#-free-tier--how-much-you-get) · [🤖 Modèles](#-models--all-476-of-them) · [🧪 Utiliser l'API](#-how-to-use-the-api) · [✅ Vérifié](#-verified-working--every-key-is-tested) · [🧭 Comment ça marche](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problèmes](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Pourquoi cet outil existe

Waterfall attribue à chaque compte une **clé API gratuite** protégée par une **inscription par preuve de travail** (défi sha256, difficulté ~4) et une **vérification par lien e-mail** — sans carte, sans captcha. L'unité qui monte en charge est *un compte par clé*, et cet outil transforme cela en un `keys.txt` où **chaque ligne a survécu à un appel de chat en direct**. Mesuré sur la flotte de l'opérateur : **~2,9 s/clé en temps réel** avec 24 workers, une rotation de pool de sorties et un basculement automatique du rail e-mail.

## 🎁 Offre gratuite — ce que vous obtenez

**Chaque nouveau compte reçoit une clé gratuite** — sans carte, sans captcha.

| Quoi | Valeur |
| --- | --- |
| Crédit d'inscription | clé gratuite avec quota sur le compte |
| Carte requise | **Non** |
| Check-in quotidien | non requis |
| Inscription | défi de preuve de travail + lien e-mail |
| L'unité qui monte en charge | **un compte = une clé** → `--count N` signifie « N comptes gratuits » |

> 💡 L'offre gratuite est définie par Waterfall et peut changer. Consultez les chiffres en direct sur [getwaterfall.org](https://getwaterfall.org) — et laissez le contrôle de l'outil décider :

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modèles — les 476 au complet

Le catalogue expose **476 identifiants de modèles** (`GET /api/v1/models`), dont **22 se terminent par `-free`**. Les identifiants vérifiés en direct sont listés ci-dessus ; les jumeaux `-free` peuvent subir une limitation de débit (429/503) et l'identifiant `-nvidia-direct` répond de manière fiable. Les identifiants `deepseek-*` existent dans le catalogue mais renvoient **402** sur les clés gratuites.

## 🧪 Comment utiliser l'API

La surface compatible OpenAI se trouve sous **`/api/v1`** (le chemin simple `/v1` ne sert qu'à l'inscription/vérification) :

```bash
curl https://api.getwaterfall.org/api/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"nemotron-3-nano-omni-30b-a3b-reasoning-nvidia-direct","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Démarrage rapide

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

`keys.txt` n'est écrit **qu'** après qu'une complétion de chat en direct a prouvé la validité de la clé.

| Mode | Ce qu'il fait |
| --- | --- |
| `run` | crée des comptes jusqu'à `--count`, valide chaque clé par un chat en direct |
| `gate` | re-balaye les clés en attente — `--rounds N` |
| `probe` | vérification de l'environnement : sorties, rail e-mail, catalogue, contrôle des clés existantes |
| `screen` | filtre les listes de sorties brutes en un pool actif |
| `collect` | reconstruit `keys.txt` à partir de `accounts.json` |

### 🖱️ Le lanceur

Le lanceur demande la liste de proxies, le nombre et le modèle de vérification, les mémorise dans `launcher.config.json`, et exécute le CLI avec les bons drapeaux.

## ✅ Vérifié fonctionnel — chaque clé est testée

| Vérification | Résultat |
| --- | --- |
| `GET /v1/register/challenge` | **200** — preuve de travail sha256 (difficulté ≈4) |
| `POST /v1/register` | **200** — compte créé, lien e-mail envoyé |
| lien e-mail → `POST /v1/verify` | **200** — compte vérifié, clé `wf-…` émise |
| `POST /api/v1/chat/completions` — exécuté pour **chaque** clé avant son écriture | **200** avec du contenu réel |
| une clé qui échoue à son test de chat | jamais écrite dans `keys.txt` |

## 🧭 Comment ça marche

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Waterfall page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.getwaterfall.org/api/v1/chat/completions → real content = the key is live
```

| Étape | Appel | Remarques |
| --- | --- | --- |
| défi | `GET /v1/register/challenge` | résoudre la PoW sha256 localement |
| inscription | `POST /v1/register` | boîte mail depuis votre rail (l'outil fait tourner les rails et compte les basculements) |
| vérification | lien e-mail → `POST /v1/verify` | émet la clé `wf-…` |
| contrôle | `POST /api/v1/chat/completions` | un 200 en direct requis avant `keys.txt` |

## ⚙️ Options du CLI

```bash
node src/cli.js <mode> [flags]
```

| Mode | Drapeaux | Signification |
| --- | --- | --- |
| `run` | `--count N` · `--concurrency N` · `--mail <rail>` · `--model <id>` | création + validation (≈2,9 s/clé à 24 workers sur la flotte de l'opérateur) |
| `gate` | `--rounds N` | re-balaye les clés ayant répondu 429/503 |
| `probe` | — | sorties · rail e-mail · catalogue · contrôle des clés existantes |
| `screen` | — | listes brutes → pool de sorties actives |
| `collect` | — | reconstruit `keys.txt` à partir de `accounts.json` |

Valeurs par défaut : `--count 50`, `--concurrency 12`, `--mail chain` (alias réel → broker).

## 🛰️ Derrière un proxy

Chaque requête sort via une sortie de votre pool ; le rail fait tourner les sorties par compte et enregistre la sortie dans `state.json`. L'inscription est limitée à **5 comptes par chemin réseau et par jour**, donc faites tourner les sorties agressivement.

## 📄 Fichiers

| Chemin | Contenu |
| --- | --- |
| `keys.txt` | clés chat-200, une par ligne avec une marque `# chat-200 <model>` ; les retardataires non validées portent une marque `# ungated` — ignoré par git |
| `accounts.json` | e-mail / clé / sortie / modèles chat-200 par compte |
| `state.json` | registre des sorties (comptabilité de 5 inscriptions/jour) — ignoré par git |
| `proxies.txt` | votre liste de sorties — ignoré par git |

## 🔌 Connexion à 9Router

[9Router](https://9router.com) est un routeur auto-hébergé compatible OpenAI. Une seule commande transforme `keys.txt` en un nœud fournisseur avec des combos fonctionnels :

```bash
node src/connect-9router.js
```

Valeurs par défaut : `--base http://localhost:20128`, `--password 123456`, `--name "Waterfall"`, `--prefix waterfall`, `--base-url https://api.getwaterfall.org/api/v1`.

## 🔑 Ce qu'une clé vous apporte

| | |
| --- | --- |
| 🏢 Fournisseur | **Waterfall** — [getwaterfall.org](https://getwaterfall.org) |
| 🎁 Ce que le fournisseur donne | un compte par clé — inscription par preuve de travail, vérification par lien e-mail, chaque clé vérifiée par chat |
| 🔑 Ce qu'une clé vous apporte | une clé API limitée à son propre compte : les 476 identifiants de modèles sur le point de terminaison ci-dessous, dans les limites de votre offre. Le quota réside sur le **compte**, ce qui explique précisément pourquoi cet outil crée un compte par clé |
| 🌐 Forme de l'API | compatible OpenAI : `POST https://api.getwaterfall.org/api/v1/chat/completions` |
| 🔒 Vos données | seuls getwaterfall.org et le backend de boîte mail que vous configurez sont contactés ; les clés restent sur votre machine |

## 🐞 Problèmes

Si le panneau modifie la forme de son inscription, la difficulté de la PoW ou le catalogue, l'outil s'arrête à cette étape et le signale. **[Ouvrez un ticket](../../issues)** avec la commande que vous avez exécutée et la sortie exacte ; les PR sont bienvenues.

## 📄 Licence

MIT © 2026 — voir [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 waterfall-bulk-apikey contributors

</div>