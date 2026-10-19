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

**Crea cuentas de Waterfall en masa con claves API autogeneradas — inferencia compatible con OpenAI + conector 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-476%20served-412991?style=for-the-badge)](https://getwaterfall.org)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Inicio rápido](#-quick-start) · [🎁 Nivel gratuito](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-476-of-them) · [🧪 Usar la API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Cómo funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Opciones](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ Por qué existe esto

Waterfall entrega a cada cuenta una **clave API gratuita** protegida por un **registro con prueba de trabajo** (desafío sha256, dificultad ~4) y una **verificación por enlace de correo** — sin tarjeta, sin captcha. La unidad que escala es *una cuenta por clave*, y esta herramienta lo convierte en un `keys.txt` donde **cada línea sobrevivió a una llamada de chat en vivo**. Medido en la flota del operador: **~2.9 s/clave en tiempo real** con 24 workers, una rotación de pool de salidas y failover automático del riel de correo.

## 🎁 Nivel gratuito — cuánto obtienes

**Cada cuenta nueva obtiene una clave gratuita** — sin tarjeta, sin captcha.

| Qué | Valor |
| --- | --- |
| Crédito de registro | clave gratuita con cuota en la cuenta |
| Tarjeta requerida | **No** |
| Check-in diario | no requerido |
| Registro | desafío de prueba de trabajo + enlace de correo |
| La unidad que escala | **una cuenta = una clave** → `--count N` es "N cuentas gratuitas" |

> 💡 El nivel gratuito lo define Waterfall y puede cambiar. Consulta los números en vivo en [getwaterfall.org](https://getwaterfall.org) — y deja que la propia puerta de la herramienta decida:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — los 476

El catálogo expone **476 ids de modelos** (`GET /api/v1/models`), de los cuales **22 terminan en `-free`**. Los ids verificados en vivo se listan arriba; los gemelos `-free` pueden aplicar rate-limit (429/503) y el id `-nvidia-direct` responde de forma fiable. Los ids `deepseek-*` existen en el catálogo pero devuelven **402** con claves gratuitas.

## 🧪 Cómo usar la API

La superficie compatible con OpenAI vive bajo **`/api/v1`** (la ruta simple `/v1` solo sirve para registro/verificación):

```bash
curl https://api.getwaterfall.org/api/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"nemotron-3-nano-omni-30b-a3b-reasoning-nvidia-direct","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Inicio rápido

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

`keys.txt` se escribe **solo** después de que una finalización de chat en vivo demuestra que la clave funciona.

| Modo | Qué hace |
| --- | --- |
| `run` | crea cuentas hasta `--count`, valida cada clave con un chat en vivo |
| `gate` | revalida las claves pendientes — `--rounds N` |
| `probe` | comprobación del entorno: salidas, riel de correo, catálogo, puerta de claves existentes |
| `screen` | filtra listas de salidas sin procesar a un pool en vivo |
| `collect` | reconstruye `keys.txt` desde `accounts.json` |

### 🖱️ El lanzador

El lanzador pide la lista de proxies, la cantidad y el modelo de verificación, los recuerda en `launcher.config.json` y ejecuta el CLI con los flags correctos.

## ✅ Verificado y funcionando — cada clave se prueba

| Comprobación | Resultado |
| --- | --- |
| `GET /v1/register/challenge` | **200** — prueba de trabajo sha256 (dificultad ≈4) |
| `POST /v1/register` | **200** — cuenta creada, enlace de correo enviado |
| enlace de correo → `POST /v1/verify` | **200** — cuenta verificada, clave `wf-…` emitida |
| `POST /api/v1/chat/completions` — ejecutado para **cada** clave antes de escribirla | **200** con contenido real |
| una clave que falla su comprobación de chat | nunca se escribe en `keys.txt` |

## 🧭 Cómo funciona

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Waterfall page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.getwaterfall.org/api/v1/chat/completions → real content = the key is live
```

| Paso | Llamada | Notas |
| --- | --- | --- |
| challenge | `GET /v1/register/challenge` | resuelve el PoW sha256 localmente |
| signup | `POST /v1/register` | buzón desde tu riel (la herramienta rota rieles y cuenta los failovers) |
| verify | enlace de correo → `POST /v1/verify` | emite la clave `wf-…` |
| check | `POST /api/v1/chat/completions` | se requiere un 200 en vivo antes de `keys.txt` |

## ⚙️ Opciones del CLI

```bash
node src/cli.js <mode> [flags]
```

| Modo | Flags | Significado |
| --- | --- | --- |
| `run` | `--count N` · `--concurrency N` · `--mail <rail>` · `--model <id>` | crear + validar (≈2.9 s/clave con 24 workers en la flota del operador) |
| `gate` | `--rounds N` | revalida claves que respondieron 429/503 |
| `probe` | — | salidas · riel de correo · catálogo · puerta de claves existentes |
| `screen` | — | listas sin procesar → pool de salidas en vivo |
| `collect` | — | reconstruye `keys.txt` desde `accounts.json` |

Valores por defecto: `--count 50`, `--concurrency 12`, `--mail chain` (alias real → broker).

## 🛰️ Detrás de un proxy

Cada solicitud sale a través de una salida de tu pool; el riel rota las salidas por cuenta y registra la salida en `state.json`. El registro está limitado a **5 cuentas por ruta de red por día**, así que rota las salidas de forma agresiva.

## 📄 Archivos

| Ruta | Contenido |
| --- | --- |
| `keys.txt` | claves con chat-200, una por línea con una marca `# chat-200 <model>`; las rezagadas sin validar llevan una marca `# ungated` — ignorado por git |
| `accounts.json` | correo / clave / salida / modelos chat-200 por cuenta |
| `state.json` | registro de salidas (contabilidad de 5 registros/día) — ignorado por git |
| `proxies.txt` | tu lista de salidas — ignorado por git |

## 🔌 Conectar con 9Router

[9Router](https://9router.com) es un router autoalojado y compatible con OpenAI. Un solo comando convierte `keys.txt` en un nodo proveedor con combos funcionales:

```bash
node src/connect-9router.js
```

Valores por defecto: `--base http://localhost:20128`, `--password 123456`, `--name "Waterfall"`, `--prefix waterfall`, `--base-url https://api.getwaterfall.org/api/v1`.

## 🔑 Qué te da una clave

| | |
| --- | --- |
| 🏢 Proveedor | **Waterfall** — [getwaterfall.org](https://getwaterfall.org) |
| 🎁 Qué da el proveedor | una cuenta por clave — registro con prueba de trabajo, verificación por enlace de correo, cada clave verificada por chat |
| 🔑 Qué te da una clave | una clave API limitada a su propia cuenta: los 476 ids de modelos en el endpoint de abajo, con los límites de tu plan. La cuota vive en la **cuenta**, que es exactamente por lo que esta herramienta crea una cuenta por clave |
| 🌐 Forma de la API | Compatible con OpenAI: `POST https://api.getwaterfall.org/api/v1/chat/completions` |
| 🔒 Tus datos | solo se contacta con getwaterfall.org y el backend de buzón que configures; las claves permanecen en tu máquina |

## 🐞 Problemas

Si el panel cambia la forma de su registro, la dificultad del PoW o el catálogo, la herramienta se detiene en ese paso y lo indica. **[Abre un issue](../../issues)** con el comando que ejecutaste y la salida exacta; los PRs son bienvenidos.

## 📄 Licencia

MIT © 2026 — consulta [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 waterfall-bulk-apikey contributors

</div>