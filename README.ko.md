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

**자동 생성된 API 키로 Waterfall 계정을 대량 생성 — OpenAI 호환 추론 + 9Router 커넥터.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-476%20served-412991?style=for-the-badge)](https://getwaterfall.org)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 빠른 시작](#-quick-start) · [🎁 무료 티어](#-free-tier--how-much-you-get) · [🤖 모델](#-models--all-476-of-them) · [🧪 API 사용하기](#-how-to-use-the-api) · [✅ 검증됨](#-verified-working--every-key-is-tested) · [🧭 작동 방식](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ 옵션](#️-cli-options) · [🛰️ 프록시](#️-behind-a-proxy) · [🐞 이슈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 이 도구가 존재하는 이유

Waterfall은 모든 계정에 **무료 API 키**를 제공하며, 이는 **작업 증명(proof-of-work) 가입**(sha256 챌린지, 난이도 ~4)과 **메일 링크 인증**으로 보호됩니다 — 카드도, 캡차도 없습니다. 확장되는 단위는 *키당 하나의 계정*이며, 이 도구는 이를 **모든 줄이 실제 채팅 호출을 통과한** `keys.txt`로 바꿔줍니다. 운영자의 환경에서 측정한 결과: 출구 풀(exit-pool) 로테이션과 자동 메일 레일 페일오버를 사용하는 24개 워커에서 **키당 약 2.9초**.

## 🎁 무료 티어 — 얼마나 받을 수 있나

**모든 새 계정은 무료 키를 받습니다** — 카드도, 캡차도 없습니다.

| 항목 | 값 |
| --- | --- |
| 가입 크레딧 | 계정에 할당량이 있는 무료 키 |
| 카드 필요 여부 | **아니오** |
| 일일 체크인 | 필요 없음 |
| 가입 | 작업 증명 챌린지 + 메일 링크 |
| 확장되는 단위 | **하나의 계정 = 하나의 키** → `--count N`은 "N개의 무료 계정"을 의미 |

> 💡 무료 티어는 Waterfall이 정하며 변경될 수 있습니다. 실시간 수치는 [getwaterfall.org](https://getwaterfall.org)에서 확인하세요 — 그리고 도구 자체의 게이트가 판단하게 하세요:

```bash
node src/cli.js --verify-only     # keys.txt의 모든 키가 실제 채팅 호출로 재검증됩니다
```

## 🤖 모델 — 476개 전부

카탈로그는 **476개의 모델 id**(`GET /api/v1/models`)를 제공하며, 그중 **22개가 `-free`로 끝납니다**. 실시간 검증된 id는 위에 나열되어 있습니다. `-free` 쌍둥이 모델은 속도 제한(429/503)이 걸릴 수 있고, `-nvidia-direct` id는 안정적으로 응답합니다. `deepseek-*` id는 카탈로그에 존재하지만 무료 키에서는 **402**를 반환합니다.

## 🧪 API 사용 방법

OpenAI 호환 표면은 **`/api/v1`** 아래에 있습니다 (일반 `/v1` 경로는 등록/검증만 제공합니다):

```bash
curl https://api.getwaterfall.org/api/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"nemotron-3-nano-omni-30b-a3b-reasoning-nvidia-direct","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 빠른 시작

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

`keys.txt`는 실제 채팅 완료가 키를 증명한 **후에만** 기록됩니다.

| 모드 | 하는 일 |
| --- | --- |
| `run` | `--count`에 도달할 때까지 계정을 생성하고, 모든 키를 실제 채팅으로 게이트 |
| `gate` | 대기 중인 키 재검사 — `--rounds N` |
| `probe` | 환경 점검: 출구, 메일 레일, 카탈로그, 기존 키 게이트 |
| `screen` | 원시 출구 목록을 실시간 풀로 필터링 |
| `collect` | `accounts.json`에서 `keys.txt` 재구성 |

### 🖱️ 런처

런처는 프록시 목록, 개수, 검증 모델을 물어보고, 이를 `launcher.config.json`에 기억한 뒤 올바른 플래그로 CLI를 실행합니다.

## ✅ 검증됨 — 모든 키가 테스트됩니다

| 점검 | 결과 |
| --- | --- |
| `GET /v1/register/challenge` | **200** — sha256 작업 증명 (난이도 ≈4) |
| `POST /v1/register` | **200** — 계정 생성됨, 메일 링크 발송됨 |
| 메일 링크 → `POST /v1/verify` | **200** — 계정 검증됨, `wf-…` 키 발급됨 |
| `POST /api/v1/chat/completions` — 기록되기 전 **모든** 키에 대해 실행 | 실제 콘텐츠와 함께 **200** |
| 채팅 점검에 실패한 키 | `keys.txt`에 절대 기록되지 않음 |

## 🧭 작동 방식

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Waterfall page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.getwaterfall.org/api/v1/chat/completions → real content = the key is live
```

| 단계 | 호출 | 비고 |
| --- | --- | --- |
| 챌린지 | `GET /v1/register/challenge` | 로컬에서 sha256 PoW 해결 |
| 가입 | `POST /v1/register` | 레일에서 가져온 메일박스 (도구가 레일을 로테이션하고 페일오버를 집계) |
| 검증 | 메일 링크 → `POST /v1/verify` | `wf-…` 키 발급 |
| 점검 | `POST /api/v1/chat/completions` | `keys.txt` 이전에 실제 200 필요 |

## ⚙️ CLI 옵션

```bash
node src/cli.js <mode> [flags]
```

| 모드 | 플래그 | 의미 |
| --- | --- | --- |
| `run` | `--count N` · `--concurrency N` · `--mail <rail>` · `--model <id>` | 생성 + 게이트 (운영자 환경의 24개 워커에서 키당 약 2.9초) |
| `gate` | `--rounds N` | 429/503을 반환한 키 재검사 |
| `probe` | — | 출구 · 메일 레일 · 카탈로그 · 기존 키 게이트 |
| `screen` | — | 원시 목록 → 실시간 출구 풀 |
| `collect` | — | `accounts.json`에서 `keys.txt` 재구성 |

기본값: `--count 50`, `--concurrency 12`, `--mail chain` (실제 별칭 → 브로커).

## 🛰️ 프록시 뒤에서

모든 요청은 풀에서 가져온 출구를 통해 나갑니다. 레일은 계정별로 출구를 로테이션하고 `state.json`에 송신 기록을 남깁니다. 등록은 **네트워크 경로당 하루 5개 계정**으로 제한되므로, 출구를 적극적으로 로테이션하세요.

## 📄 파일

| 경로 | 내용 |
| --- | --- |
| `keys.txt` | 채팅-200 키, `# chat-200 <model>` 표시와 함께 한 줄에 하나씩; 게이트되지 않은 잔여 항목은 `# ungated` 표시를 가짐 — git 무시됨 |
| `accounts.json` | 계정별 이메일 / 키 / 출구 / 채팅-200 모델 |
| `state.json` | 송신 원장 (하루 5회 등록 회계) — git 무시됨 |
| `proxies.txt` | 출구 목록 — git 무시됨 |

## 🔌 9Router에 연결

[9Router](https://9router.com)는 자체 호스팅되는 OpenAI 호환 라우터입니다. 명령 하나로 `keys.txt`를 작동하는 콤보가 있는 프로바이더 노드로 바꿉니다:

```bash
node src/connect-9router.js
```

기본값: `--base http://localhost:20128`, `--password 123456`, `--name "Waterfall"`, `--prefix waterfall`, `--base-url https://api.getwaterfall.org/api/v1`.

## 🔌 OmniRoute에 연결

[OmniRoute](https://omniroute.online)는 자체 호스팅되는 OpenAI 호환 라우터입니다. 명령 하나로 `keys.txt`를 작동하는 콤보가 있는 프로바이더 노드로 바꿉니다:

```bash
node src/connect-omniroute.js
```

기본값: `--base http://localhost:20128`, `--password 123456`, `--name "Waterfall"`, `--prefix waterfall`, `--base-url https://api.getwaterfall.org/api/v1`.
## 🔑 키 하나로 얻는 것

| | |
| --- | --- |
| 🏢 프로바이더 | **Waterfall** — [getwaterfall.org](https://getwaterfall.org) |
| 🎁 프로바이더가 제공하는 것 | 키당 하나의 계정 — 작업 증명 가입, 메일 링크 검증, 모든 키 채팅 검증 |
| 🔑 키 하나로 얻는 것 | 자체 계정에 한정된 하나의 API 키: 아래 엔드포인트의 476개 모델 id를, 요금제 한도 내에서. 할당량은 **계정**에 있으므로, 이 도구가 키당 하나의 계정을 만드는 것입니다 |
| 🌐 API 형태 | OpenAI 호환: `POST https://api.getwaterfall.org/api/v1/chat/completions` |
| 🔒 데이터 | getwaterfall.org와 설정한 메일박스 백엔드만 접속됩니다; 키는 사용자 컴퓨터에 남습니다 |

## 🐞 이슈

패널이 가입 형태, PoW 난이도 또는 카탈로그를 변경하면, 도구는 해당 단계에서 멈추고 그 사실을 알립니다. 실행한 명령과 정확한 출력을 포함하여 **[이슈를 열어주세요](../../issues)**; PR을 환영합니다.

## 📄 라이선스

MIT © 2026 — [LICENSE](LICENSE) 참조.

<div align="center">

**[MIT](LICENSE)** © 2026 waterfall-bulk-apikey contributors

</div>