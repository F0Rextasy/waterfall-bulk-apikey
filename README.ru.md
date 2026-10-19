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

**Массовое создание аккаунтов Waterfall с автоматически сгенерированными API-ключами — инференс, совместимый с OpenAI + коннектор 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-476%20served-412991?style=for-the-badge)](https://getwaterfall.org)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Быстрый старт](#-quick-start) · [🎁 Бесплатный тариф](#-free-tier--how-much-you-get) · [🤖 Модели](#-models--all-476-of-them) · [🧪 Использование API](#-how-to-use-the-api) · [✅ Проверено](#-verified-working--every-key-is-tested) · [🧭 Как это работает](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Опции](#️-cli-options) · [🛰️ Прокси](#️-behind-a-proxy) · [🐞 Проблемы](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Зачем это нужно

Waterfall выдаёт каждому аккаунту **бесплатный API-ключ**, защищённый **регистрацией с proof-of-work** (sha256-задача, сложность ~4) и **подтверждением по ссылке из письма** — без карты, без капчи. Единица масштабирования — *один аккаунт на ключ*, и этот инструмент превращает это в `keys.txt`, где **каждая строка прошла живой вызов чата**. По замерам на парке оператора: **~2,9 с/ключ реального времени** при 24 воркерах с ротацией пула выходов и автоматическим переключением почтовых каналов.

## 🎁 Бесплатный тариф — сколько вы получаете

**Каждый новый аккаунт получает бесплатный ключ** — без карты, без капчи.

| Что | Значение |
| --- | --- |
| Кредит при регистрации | бесплатный ключ с квотой на аккаунте |
| Требуется карта | **Нет** |
| Ежедневная отметка | не требуется |
| Регистрация | proof-of-work задача + ссылка из письма |
| Единица масштабирования | **один аккаунт = один ключ** → `--count N` означает «N бесплатных аккаунтов» |

> 💡 Бесплатный тариф устанавливается Waterfall и может измениться. Проверяйте актуальные цифры на [getwaterfall.org](https://getwaterfall.org) — и пусть собственный гейт инструмента решает:

```bash
node src/cli.js --verify-only     # каждый ключ в keys.txt перепроверяется реальным вызовом чата
```

## 🤖 Модели — все 476

Каталог предоставляет **476 идентификаторов моделей** (`GET /api/v1/models`), из которых **22 заканчиваются на `-free`**. Проверенные вживую идентификаторы перечислены выше; `-free`-двойники могут упираться в лимиты (429/503), а идентификатор `-nvidia-direct` отвечает надёжно. Идентификаторы `deepseek-*` есть в каталоге, но возвращают **402** на бесплатных ключах.

## 🧪 Как использовать API

Поверхность, совместимая с OpenAI, находится по пути **`/api/v1`** (обычный путь `/v1` обслуживает только регистрацию/верификацию):

```bash
curl https://api.getwaterfall.org/api/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"nemotron-3-nano-omni-30b-a3b-reasoning-nvidia-direct","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Быстрый старт

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

`keys.txt` записывается **только** после того, как живое завершение чата подтвердит ключ.

| Режим | Что делает |
| --- | --- |
| `run` | создаёт аккаунты до `--count`, проверяет каждый ключ живым чатом |
| `gate` | повторно прогоняет ожидающие ключи — `--rounds N` |
| `probe` | проверка окружения: выходы, почтовый канал, каталог, гейт существующих ключей |
| `screen` | фильтрует сырые списки выходов в живой пул |
| `collect` | пересобирает `keys.txt` из `accounts.json` |

### 🖱️ Лаунчер

Лаунчер запрашивает список прокси, количество и модель для верификации, запоминает их в `launcher.config.json` и запускает CLI с нужными флагами.

## ✅ Проверено в работе — каждый ключ тестируется

| Проверка | Результат |
| --- | --- |
| `GET /v1/register/challenge` | **200** — sha256 proof-of-work (сложность ≈4) |
| `POST /v1/register` | **200** — аккаунт создан, ссылка из письма отправлена |
| ссылка из письма → `POST /v1/verify` | **200** — аккаунт подтверждён, выдан ключ `wf-…` |
| `POST /api/v1/chat/completions` — выполняется для **каждого** ключа перед записью | **200** с реальным содержимым |
| ключ, не прошедший проверку чатом | никогда не записывается в `keys.txt` |

## 🧭 Как это работает

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Waterfall page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.getwaterfall.org/api/v1/chat/completions → real content = the key is live
```

| Шаг | Вызов | Примечания |
| --- | --- | --- |
| challenge | `GET /v1/register/challenge` | решить sha256 PoW локально |
| signup | `POST /v1/register` | почтовый ящик из вашего канала (инструмент ротирует каналы и считает переключения) |
| verify | ссылка из письма → `POST /v1/verify` | выдаёт ключ `wf-…` |
| check | `POST /api/v1/chat/completions` | требуется живой 200 перед записью в `keys.txt` |

## ⚙️ Опции CLI

```bash
node src/cli.js <mode> [flags]
```

| Режим | Флаги | Значение |
| --- | --- | --- |
| `run` | `--count N` · `--concurrency N` · `--mail <rail>` · `--model <id>` | создание + гейт (≈2,9 с/ключ при 24 воркерах на парке оператора) |
| `gate` | `--rounds N` | повторный прогон ключей, ответивших 429/503 |
| `probe` | — | выходы · почтовый канал · каталог · гейт существующих ключей |
| `screen` | — | сырые списки → живой пул выходов |
| `collect` | — | пересобрать `keys.txt` из `accounts.json` |

Значения по умолчанию: `--count 50`, `--concurrency 12`, `--mail chain` (реальный алиас → брокер).

## 🛰️ За прокси

Каждый запрос выходит через выход из вашего пула; канал ротирует выходы для каждого аккаунта и записывает исходящий трафик в `state.json`. Регистрация ограничена **5 аккаунтами на сетевой путь в день**, поэтому ротируйте выходы агрессивно.

## 📄 Файлы

| Путь | Содержимое |
| --- | --- |
| `keys.txt` | ключи с chat-200, по одному в строке с пометкой `# chat-200 <model>`; непроверенные одиночки несут пометку `# ungated` — игнорируется git |
| `accounts.json` | email / ключ / выход / модели chat-200 для каждого аккаунта |
| `state.json` | журнал исходящего трафика (учёт 5 регистраций/день) — игнорируется git |
| `proxies.txt` | ваш список выходов — игнорируется git |

## 🔌 Подключение к 9Router

[9Router](https://9router.com) — это самостоятельно размещаемый роутер, совместимый с OpenAI. Одна команда превращает `keys.txt` в провайдер-узел с рабочими комбинациями:

```bash
node src/connect-9router.js
```

Значения по умолчанию: `--base http://localhost:20128`, `--password 123456`, `--name "Waterfall"`, `--prefix waterfall`, `--base-url https://api.getwaterfall.org/api/v1`.

## 🔑 Что даёт один ключ

| | |
| --- | --- |
| 🏢 Провайдер | **Waterfall** — [getwaterfall.org](https://getwaterfall.org) |
| 🎁 Что даёт провайдер | один аккаунт на ключ — регистрация с proof-of-work, подтверждение по ссылке из письма, каждый ключ проверен чатом |
| 🔑 Что даёт один ключ | один API-ключ, привязанный к своему аккаунту: 476 идентификаторов моделей на указанном ниже эндпоинте, в пределах лимитов вашего тарифа. Квота живёт на **аккаунте**, и именно поэтому этот инструмент создаёт один аккаунт на ключ |
| 🌐 Форма API | Совместим с OpenAI: `POST https://api.getwaterfall.org/api/v1/chat/completions` |
| 🔒 Ваши данные | устанавливается связь только с getwaterfall.org и настроенным вами почтовым бэкендом; ключи остаются на вашей машине |

## 🐞 Проблемы

Если панель изменит форму регистрации, сложность PoW или каталог, инструмент остановится на этом шаге и сообщит об этом. **[Откройте issue](../../issues)** с командой, которую вы запустили, и точным выводом; PR приветствуются.

## 📄 Лицензия

MIT © 2026 — см. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 waterfall-bulk-apikey contributors

</div>