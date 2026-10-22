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

**自動生成された API キーで Waterfall アカウントを一括作成 — OpenAI 互換の推論 + 9Router コネクタ。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-476%20served-412991?style=for-the-badge)](https://getwaterfall.org)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 クイックスタート](#-quick-start) · [🎁 無料枠](#-free-tier--how-much-you-get) · [🤖 モデル](#-models--all-476-of-them) · [🧪 API の使い方](#-how-to-use-the-api) · [✅ 検証済み](#-verified-working--every-key-is-tested) · [🧭 仕組み](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy) · [🐞 イシュー](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ これが存在する理由

Waterfall はすべてのアカウントに **無料の API キー** を付与します。それは **proof-of-work サインアップ**（sha256 チャレンジ、難易度 ~4）と **メールリンク認証** で保護されています — カード不要、キャプチャ不要。スケールする単位は *1 アカウントにつき 1 キー* であり、このツールはそれを `keys.txt` に変えます。そこでは **すべての行が実際のチャット呼び出しを通過しています**。運用者のフリートでの実測値: 24 ワーカー、exit プールのローテーションとメールレールの自動フェイルオーバーを備えた構成で **~2.9 秒/キー（実時間）**。

## 🎁 無料枠 — どれだけ得られるか

**すべての新規アカウントに無料キーが付与されます** — カード不要、キャプチャ不要。

| 項目 | 値 |
| --- | --- |
| サインアップ特典 | アカウントにクォータ付きの無料キー |
| カード要否 | **不要** |
| 毎日のチェックイン | 不要 |
| サインアップ | proof-of-work チャレンジ + メールリンク |
| スケールする単位 | **1 アカウント = 1 キー** → `--count N` は「N 個の無料アカウント」 |

> 💡 無料枠は Waterfall が設定するもので、変更される可能性があります。最新の数値は [getwaterfall.org](https://getwaterfall.org) で確認してください — そしてツール自身のゲートに判断を委ねましょう:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 モデル — そのすべて 476 個

カタログは **476 個のモデル ID**（`GET /api/v1/models`）を公開しており、そのうち **22 個が `-free` で終わります**。ライブ検証済みの ID は上に記載されています。`-free` の双子はレート制限（429/503）になることがあり、`-nvidia-direct` の ID は確実に応答します。`deepseek-*` の ID はカタログに存在しますが、無料キーでは **402** を返します。

## 🧪 API の使い方

OpenAI 互換のサーフェスは **`/api/v1`** の下にあります（プレーンな `/v1` パスは登録/検証のみを提供します）:

```bash
curl https://api.getwaterfall.org/api/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"nemotron-3-nano-omni-30b-a3b-reasoning-nvidia-direct","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 クイックスタート

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

`keys.txt` は、実際のチャット補完がキーを証明した **後にのみ** 書き込まれます。

| モード | 動作 |
| --- | --- |
| `run` | `--count` に達するまでアカウントを作成し、すべてのキーを実際のチャットでゲートする |
| `gate` | 保留中のキーを再スイープ — `--rounds N` |
| `probe` | 環境チェック: exit、メールレール、カタログ、既存キーのゲート |
| `screen` | 生の exit リストをライブプールにフィルタリングする |
| `collect` | `accounts.json` から `keys.txt` を再構築する |

### 🖱️ ランチャー

ランチャーはプロキシリスト、カウント、検証モデルを尋ね、それらを `launcher.config.json` に記憶し、適切なフラグで CLI を実行します。

## ✅ 動作検証済み — すべてのキーがテストされています

| チェック | 結果 |
| --- | --- |
| `GET /v1/register/challenge` | **200** — sha256 proof-of-work（難易度 ≈4） |
| `POST /v1/register` | **200** — アカウント作成、メールリンク送信 |
| メールリンク → `POST /v1/verify` | **200** — アカウント検証済み、`wf-…` キー発行 |
| `POST /api/v1/chat/completions` — 書き込まれる前の **すべての** キーに対して実行 | 実際のコンテンツ付きで **200** |
| チャットチェックに失敗したキー | `keys.txt` に書き込まれることはない |

## 🧭 仕組み

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Waterfall page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.getwaterfall.org/api/v1/chat/completions → real content = the key is live
```

| ステップ | 呼び出し | 備考 |
| --- | --- | --- |
| challenge | `GET /v1/register/challenge` | sha256 PoW をローカルで解く |
| signup | `POST /v1/register` | あなたのレールからのメールボックス（ツールはレールをローテートし、フェイルオーバーをカウントする） |
| verify | メールリンク → `POST /v1/verify` | `wf-…` キーを発行する |
| check | `POST /api/v1/chat/completions` | `keys.txt` の前にライブ 200 が必須 |

## ⚙️ CLI オプション

```bash
node src/cli.js <mode> [flags]
```

| モード | フラグ | 意味 |
| --- | --- | --- |
| `run` | `--count N` · `--concurrency N` · `--mail <rail>` · `--model <id>` | 作成 + ゲート（運用者のフリートで 24 ワーカー時 ≈2.9 秒/キー） |
| `gate` | `--rounds N` | 429/503 を返したキーを再スイープする |
| `probe` | — | exit · メールレール · カタログ · 既存キーのゲート |
| `screen` | — | 生のリスト → ライブ exit プール |
| `collect` | — | `accounts.json` から `keys.txt` を再構築する |

デフォルト: `--count 50`、`--concurrency 12`、`--mail chain`（実際のエイリアス → ブローカー）。

## 🛰️ プロキシの背後で

すべてのリクエストはあなたのプールからの exit を通って出ていきます。レールはアカウントごとに exit をローテートし、`state.json` に egress を記録します。登録は **1 日あたり 1 ネットワークパスにつき 5 アカウント** に制限されているため、exit を積極的にローテートしてください。

## 📄 ファイル

| パス | 内容 |
| --- | --- |
| `keys.txt` | chat-200 のキー、1 行に 1 つ、`# chat-200 <model>` マーク付き。ゲートされなかったはぐれキーには `# ungated` マークが付く — git 管理外 |
| `accounts.json` | アカウントごとの email / key / exit / chat-200 モデル |
| `state.json` | egress 台帳（1 日 5 登録の会計） — git 管理外 |
| `proxies.txt` | あなたの exit リスト — git 管理外 |

## 🔌 9Router に接続する

[9Router](https://9router.com) はセルフホスト型の OpenAI 互換ルーターです。1 つのコマンドで `keys.txt` を、動作するコンボを備えたプロバイダーノードに変えます:

```bash
node src/connect-9router.js
```

デフォルト: `--base http://localhost:20128`、`--password 123456`、`--name "Waterfall"`、`--prefix waterfall`、`--base-url https://api.getwaterfall.org/api/v1`。

## 🔑 1 つのキーで得られるもの

| | |
| --- | --- |
| 🏢 プロバイダー | **Waterfall** — [getwaterfall.org](https://getwaterfall.org) |
| 🎁 プロバイダーが提供するもの | 1 アカウントにつき 1 キー — proof-of-work サインアップ、メールリンク検証、すべてのキーがチャット検証済み |
| 🔑 1 つのキーで得られるもの | 自身のアカウントにスコープされた 1 つの API キー: 下記エンドポイントの 476 個のモデル ID を、あなたのプランの制限内で。クォータは **アカウント** に紐づくため、このツールが 1 アカウントにつき 1 キーを作成するのはまさにそのためです |
| 🌐 API の形 | OpenAI 互換: `POST https://api.getwaterfall.org/api/v1/chat/completions` |
| 🔒 あなたのデータ | 接触するのは getwaterfall.org と、あなたが設定した inbox バックエンドのみ。キーはあなたのマシン上に留まります |

## 🐞 イシュー

パネルがサインアップの形、PoW 難易度、またはカタログを変更した場合、ツールはそのステップで停止し、その旨を報告します。実行したコマンドと正確な出力を添えて **[イシューを開いてください](../../issues)**。PR も歓迎します。

## 📄 ライセンス

MIT © 2026 — [LICENSE](LICENSE) を参照してください。

<div align="center">

**[MIT](LICENSE)** © 2026 waterfall-bulk-apikey contributors

</div>