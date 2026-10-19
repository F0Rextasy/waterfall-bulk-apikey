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

**批量创建 Waterfall 账户并自动生成 API 密钥 — 兼容 OpenAI 的推理 + 9Router 连接器。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-476%20served-412991?style=for-the-badge)](https://getwaterfall.org)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 快速开始](#-quick-start) · [🎁 免费额度](#-free-tier--how-much-you-get) · [🤖 模型](#-models--all-476-of-them) · [🧪 使用 API](#-how-to-use-the-api) · [✅ 已验证](#-verified-working--every-key-is-tested) · [🧭 工作原理](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ 选项](#️-cli-options) · [🛰️ 代理](#️-behind-a-proxy) · [🐞 问题反馈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ 为什么会有这个项目

Waterfall 会为每个账户发放一个**免费 API 密钥**，其注册流程由**工作量证明**（sha256 挑战，难度约 4）和**邮件链接验证**保护——无需银行卡，无需验证码。可扩展的单元是*每个密钥对应一个账户*，而本工具将其转化为一个 `keys.txt`，其中**每一行都通过了一次真实的聊天调用**。在运营者的集群上实测：24 个 worker 配合出口池轮换和自动邮件通道故障转移，**约 2.9 秒/密钥**。

## 🎁 免费额度 — 你能获得多少

**每个新账户都会获得一个免费密钥**——无需银行卡，无需验证码。

| 项目 | 值 |
| --- | --- |
| 注册赠送 | 账户上带有配额的免费密钥 |
| 是否需要银行卡 | **否** |
| 每日签到 | 不需要 |
| 注册 | 工作量证明挑战 + 邮件链接 |
| 可扩展的单元 | **一个账户 = 一个密钥** → `--count N` 即“N 个免费账户” |

> 💡 免费额度由 Waterfall 设定，可能会变化。请在 [getwaterfall.org](https://getwaterfall.org) 查看实时数据——并让工具自身的门控来判定：

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 模型 — 全部 476 个

目录公开了 **476 个模型 id**（`GET /api/v1/models`），其中 **22 个以 `-free` 结尾**。上方列出了经实时验证的 id；`-free` 孪生版本可能会触发限流（429/503），而 `-nvidia-direct` id 能可靠响应。`deepseek-*` id 存在于目录中，但在免费密钥上返回 **402**。

## 🧪 如何使用 API

兼容 OpenAI 的接口位于 **`/api/v1`** 下（普通的 `/v1` 路径仅用于注册/验证）：

```bash
curl https://api.getwaterfall.org/api/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"nemotron-3-nano-omni-30b-a3b-reasoning-nvidia-direct","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 快速开始

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

`keys.txt` **只有**在一次真实的聊天补全证明该密钥有效后才会写入。

| 模式 | 作用 |
| --- | --- |
| `run` | 铸造账户直到 `--count`，用一次真实聊天对每个密钥进行门控 |
| `gate` | 重新扫描待处理的密钥 — `--rounds N` |
| `probe` | 环境检查：出口、邮件通道、目录、现有密钥门控 |
| `screen` | 将原始出口列表筛选为可用池 |
| `collect` | 从 `accounts.json` 重建 `keys.txt` |

### 🖱️ 启动器

启动器会询问代理列表、数量和验证模型，将它们记录在 `launcher.config.json` 中，并使用正确的标志运行 CLI。

## ✅ 已验证可用 — 每个密钥都经过测试

| 检查 | 结果 |
| --- | --- |
| `GET /v1/register/challenge` | **200** — sha256 工作量证明（难度约 4） |
| `POST /v1/register` | **200** — 账户已创建，邮件链接已发送 |
| 邮件链接 → `POST /v1/verify` | **200** — 账户已验证，签发 `wf-…` 密钥 |
| `POST /api/v1/chat/completions` — 在写入**每个**密钥前运行 | **200** 并返回真实内容 |
| 未通过聊天检查的密钥 | 绝不会写入 `keys.txt` |

## 🧭 工作原理

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Waterfall page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.getwaterfall.org/api/v1/chat/completions → real content = the key is live
```

| 步骤 | 调用 | 说明 |
| --- | --- | --- |
| 挑战 | `GET /v1/register/challenge` | 在本地求解 sha256 PoW |
| 注册 | `POST /v1/register` | 从你的通道获取邮箱（工具会轮换通道并统计故障转移次数） |
| 验证 | 邮件链接 → `POST /v1/verify` | 签发 `wf-…` 密钥 |
| 检查 | `POST /api/v1/chat/completions` | 写入 `keys.txt` 前必须返回实时 200 |

## ⚙️ CLI 选项

```bash
node src/cli.js <mode> [flags]
```

| 模式 | 标志 | 含义 |
| --- | --- | --- |
| `run` | `--count N` · `--concurrency N` · `--mail <rail>` · `--model <id>` | 铸造 + 门控（在运营者的集群上 24 个 worker 约 2.9 秒/密钥） |
| `gate` | `--rounds N` | 重新扫描返回 429/503 的密钥 |
| `probe` | — | 出口 · 邮件通道 · 目录 · 现有密钥门控 |
| `screen` | — | 原始列表 → 可用出口池 |
| `collect` | — | 从 `accounts.json` 重建 `keys.txt` |

默认值：`--count 50`、`--concurrency 12`、`--mail chain`（真实别名 → 代理）。

## 🛰️ 在代理之后

每个请求都通过你池中的一个出口发出；通道会为每个账户轮换出口，并在 `state.json` 中记录出口。注册限制为**每条网络路径每天 5 个账户**，因此请积极轮换出口。

## 📄 文件

| 路径 | 内容 |
| --- | --- |
| `keys.txt` | 聊天返回 200 的密钥，每行一个并带有 `# chat-200 <model>` 标记；未门控的漏网之鱼带有 `# ungated` 标记 — 已被 git 忽略 |
| `accounts.json` | 每个账户的邮箱 / 密钥 / 出口 / 聊天返回 200 的模型 |
| `state.json` | 出口账本（每天 5 次注册的核算）— 已被 git 忽略 |
| `proxies.txt` | 你的出口列表 — 已被 git 忽略 |

## 🔌 连接到 9Router

[9Router](https://9router.com) 是一个自托管、兼容 OpenAI 的路由器。一条命令即可将 `keys.txt` 转换为带有可用组合的 provider-node：

```bash
node src/connect-9router.js
```

默认值：`--base http://localhost:20128`、`--password 123456`、`--name "Waterfall"`、`--prefix waterfall`、`--base-url https://api.getwaterfall.org/api/v1`。

## 🔑 一个密钥能给你带来什么

| | |
| --- | --- |
| 🏢 提供商 | **Waterfall** — [getwaterfall.org](https://getwaterfall.org) |
| 🎁 提供商提供什么 | 每个密钥对应一个账户 — 工作量证明注册、邮件链接验证、每个密钥都经过聊天验证 |
| 🔑 一个密钥能给你带来什么 | 一个作用域限定在其自身账户的 API 密钥：下方端点上的 476 个模型 id，受你套餐的限制。配额存在于**账户**上，这正是本工具为每个密钥创建一个账户的原因 |
| 🌐 API 形态 | 兼容 OpenAI：`POST https://api.getwaterfall.org/api/v1/chat/completions` |
| 🔒 你的数据 | 仅会联系 getwaterfall.org 和你配置的收件箱后端；密钥保留在你的机器上 |

## 🐞 问题反馈

如果面板更改了其注册形态、PoW 难度或目录，工具会在该步骤停止并说明原因。请**[提交 issue](../../issues)**，附上你运行的命令和确切的输出；欢迎 PR。

## 📄 许可证

MIT © 2026 — 参见 [LICENSE](LICENSE)。

<div align="center">

**[MIT](LICENSE)** © 2026 waterfall-bulk-apikey contributors

</div>