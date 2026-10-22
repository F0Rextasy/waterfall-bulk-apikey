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

**Crie contas Waterfall em massa com chaves de API geradas automaticamente — inferência compatível com OpenAI + conector 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-476%20served-412991?style=for-the-badge)](https://getwaterfall.org)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Início rápido](#-quick-start) · [🎁 Nível gratuito](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-476-of-them) · [🧪 Usar a API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Como funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Opções](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Por que isto existe

O Waterfall concede a cada conta uma **chave de API gratuita** protegida por um **cadastro com prova de trabalho** (desafio sha256, dificuldade ~4) e uma **verificação por link de e-mail** — sem cartão, sem captcha. A unidade que escala é *uma conta por chave*, e esta ferramenta transforma isso em um `keys.txt` onde **cada linha sobreviveu a uma chamada de chat ao vivo**. Medido na frota do operador: **~2,9 s/chave em tempo real** com 24 workers, com rotação de pool de saída e failover automático do trilho de e-mail.

## 🎁 Nível gratuito — quanto você recebe

**Toda nova conta recebe uma chave gratuita** — sem cartão, sem captcha.

| O quê | Valor |
| --- | --- |
| Crédito de cadastro | chave gratuita com cota na conta |
| Cartão exigido | **Não** |
| Check-in diário | não exigido |
| Cadastro | desafio de prova de trabalho + link de e-mail |
| A unidade que escala | **uma conta = uma chave** → `--count N` significa "N contas gratuitas" |

> 💡 O nível gratuito é definido pelo Waterfall e pode mudar. Confira os números ao vivo em [getwaterfall.org](https://getwaterfall.org) — e deixe o próprio gate da ferramenta decidir:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — todos os 476

O catálogo expõe **476 ids de modelos** (`GET /api/v1/models`), dos quais **22 terminam em `-free`**. Os ids verificados ao vivo estão listados acima; os gêmeos `-free` podem sofrer rate-limit (429/503) e o id `-nvidia-direct` responde de forma confiável. Os ids `deepseek-*` existem no catálogo, mas retornam **402** em chaves gratuitas.

## 🧪 Como usar a API

A superfície compatível com OpenAI fica sob **`/api/v1`** (o caminho simples `/v1` serve apenas para registro/verificação):

```bash
curl https://api.getwaterfall.org/api/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"nemotron-3-nano-omni-30b-a3b-reasoning-nvidia-direct","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Início rápido

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

`keys.txt` é escrito **somente** após uma conclusão de chat ao vivo comprovar a chave.

| Modo | O que faz |
| --- | --- |
| `run` | cria contas até `--count`, valida cada chave com um chat ao vivo |
| `gate` | revarre chaves pendentes — `--rounds N` |
| `probe` | verificação do ambiente: saídas, trilho de e-mail, catálogo, gate de chaves existentes |
| `screen` | filtra listas brutas de saídas em um pool ativo |
| `collect` | reconstrói `keys.txt` a partir de `accounts.json` |

### 🖱️ O launcher

O launcher solicita a lista de proxies, a contagem e o modelo de verificação, memoriza-os em `launcher.config.json` e executa a CLI com as flags corretas.

## ✅ Verificado e funcionando — toda chave é testada

| Verificação | Resultado |
| --- | --- |
| `GET /v1/register/challenge` | **200** — prova de trabalho sha256 (dificuldade ≈4) |
| `POST /v1/register` | **200** — conta criada, link de e-mail enviado |
| link de e-mail → `POST /v1/verify` | **200** — conta verificada, chave `wf-…` emitida |
| `POST /api/v1/chat/completions` — executado para **toda** chave antes de ser escrita | **200** com conteúdo real |
| uma chave que falha na verificação de chat | nunca é escrita em `keys.txt` |

## 🧭 Como funciona

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Waterfall page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.getwaterfall.org/api/v1/chat/completions → real content = the key is live
```

| Etapa | Chamada | Notas |
| --- | --- | --- |
| desafio | `GET /v1/register/challenge` | resolve o PoW sha256 localmente |
| cadastro | `POST /v1/register` | caixa de correio do seu trilho (a ferramenta rotaciona trilhos e conta failovers) |
| verificação | link de e-mail → `POST /v1/verify` | emite a chave `wf-…` |
| checagem | `POST /api/v1/chat/completions` | 200 ao vivo obrigatório antes de `keys.txt` |

## ⚙️ Opções da CLI

```bash
node src/cli.js <mode> [flags]
```

| Modo | Flags | Significado |
| --- | --- | --- |
| `run` | `--count N` · `--concurrency N` · `--mail <rail>` · `--model <id>` | cria + valida (≈2,9 s/chave com 24 workers na frota do operador) |
| `gate` | `--rounds N` | revarre chaves que responderam 429/503 |
| `probe` | — | saídas · trilho de e-mail · catálogo · gate de chaves existentes |
| `screen` | — | listas brutas → pool de saídas ativo |
| `collect` | — | reconstrói `keys.txt` a partir de `accounts.json` |

Padrões: `--count 50`, `--concurrency 12`, `--mail chain` (alias real → broker).

## 🛰️ Atrás de um proxy

Toda requisição sai por uma saída do seu pool; o trilho rotaciona saídas por conta e registra a saída em `state.json`. O registro é limitado a **5 contas por caminho de rede por dia**, então rotacione saídas agressivamente.

## 📄 Arquivos

| Caminho | Conteúdo |
| --- | --- |
| `keys.txt` | chaves com chat-200, uma por linha com uma marca `# chat-200 <model>`; as remanescentes não validadas carregam uma marca `# ungated` — ignorado pelo git |
| `accounts.json` | e-mail / chave / saída / modelos chat-200 por conta |
| `state.json` | registro de saídas (contabilidade de 5 registros/dia) — ignorado pelo git |
| `proxies.txt` | sua lista de saídas — ignorado pelo git |

## 🔌 Conectar ao 9Router

O [9Router](https://9router.com) é um roteador auto-hospedado e compatível com OpenAI. Um comando transforma `keys.txt` em um nó provedor com combos funcionais:

```bash
node src/connect-9router.js
```

Padrões: `--base http://localhost:20128`, `--password 123456`, `--name "Waterfall"`, `--prefix waterfall`, `--base-url https://api.getwaterfall.org/api/v1`.

## 🔑 O que uma chave te dá

| | |
| --- | --- |
| 🏢 Provedor | **Waterfall** — [getwaterfall.org](https://getwaterfall.org) |
| 🎁 O que o provedor oferece | uma conta por chave — cadastro com prova de trabalho, verificação por link de e-mail, toda chave verificada por chat |
| 🔑 O que uma chave te dá | uma chave de API vinculada à sua própria conta: os 476 ids de modelos no endpoint abaixo, nos limites do seu plano. A cota fica na **conta**, e é exatamente por isso que esta ferramenta cria uma conta por chave |
| 🌐 Formato da API | Compatível com OpenAI: `POST https://api.getwaterfall.org/api/v1/chat/completions` |
| 🔒 Seus dados | apenas getwaterfall.org e o backend de caixa de correio que você configurar são contatados; as chaves permanecem na sua máquina |

## 🐞 Problemas

Se o painel mudar o formato do cadastro, a dificuldade do PoW ou o catálogo, a ferramenta para nessa etapa e avisa. **[Abra uma issue](../../issues)** com o comando que você executou e a saída exata; PRs são bem-vindos.

## 📄 Licença

MIT © 2026 — veja [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 waterfall-bulk-apikey contributors

</div>