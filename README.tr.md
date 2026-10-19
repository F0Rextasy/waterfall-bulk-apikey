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

**Otomatik oluşturulan API anahtarlarıyla toplu Waterfall hesabı oluşturma — OpenAI uyumlu çıkarım + 9Router bağlayıcısı.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-476%20served-412991?style=for-the-badge)](https://getwaterfall.org)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Hızlı başlangıç](#-quick-start) · [🎁 Ücretsiz katman](#-free-tier--how-much-you-get) · [🤖 Modeller](#-models--all-476-of-them) · [🧪 API'yi kullan](#-how-to-use-the-api) · [✅ Doğrulandı](#-verified-working--every-key-is-tested) · [🧭 Nasıl çalışır](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Seçenekler](#️-cli-options) · [🛰️ Proxy'ler](#️-behind-a-proxy) · [🐞 Sorunlar](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Bu neden var

Waterfall her hesaba, **proof-of-work kayıt** (sha256 challenge, zorluk ~4) ve **e-posta bağlantısı doğrulaması** ile korunan **ücretsiz bir API anahtarı** verir — kart yok, captcha yok. Ölçeklenen birim *anahtar başına bir hesap*tır ve bu araç bunu, **her satırı canlı bir sohbet çağrısından geçmiş** bir `keys.txt` dosyasına dönüştürür. Operatörün filosunda ölçüldü: çıkış havuzu rotasyonu ve otomatik mail-rail yedeklemesi ile 24 worker'da **~2,9 sn/anahtar duvar saati**.

## 🎁 Ücretsiz katman — ne kadar alıyorsunuz

**Her yeni hesap ücretsiz bir anahtar alır** — kart yok, captcha yok.

| Ne | Değer |
| --- | --- |
| Kayıt kredisi | hesapta kotalı ücretsiz anahtar |
| Kart gerekli | **Hayır** |
| Günlük giriş | gerekli değil |
| Kayıt | proof-of-work challenge + e-posta bağlantısı |
| Ölçeklenen birim | **bir hesap = bir anahtar** → `--count N` demek "N ücretsiz hesap" demek |

> 💡 Ücretsiz katman Waterfall tarafından belirlenir ve değişebilir. Güncel sayıları [getwaterfall.org](https://getwaterfall.org) adresinden kontrol edin — ve kararı aracın kendi kapısına bırakın:

```bash
node src/cli.js --verify-only     # keys.txt içindeki her anahtar gerçek bir sohbet çağrısıyla yeniden test edilir
```

## 🤖 Modeller — 476'sının tamamı

Katalog **476 model kimliği** sunar (`GET /api/v1/models`), bunlardan **22'si `-free` ile biter**. Canlı doğrulanmış kimlikler yukarıda listelenmiştir; `-free` ikizleri hız sınırına takılabilir (429/503) ve `-nvidia-direct` kimliği güvenilir şekilde yanıt verir. `deepseek-*` kimlikleri katalogda vardır ancak ücretsiz anahtarlarda **402** döndürür.

## 🧪 API nasıl kullanılır

OpenAI uyumlu yüzey **`/api/v1`** altında bulunur (düz `/v1` yolu yalnızca kayıt/doğrulama sunar):

```bash
curl https://api.getwaterfall.org/api/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"nemotron-3-nano-omni-30b-a3b-reasoning-nvidia-direct","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

## 🛠 Hızlı başlangıç

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

`keys.txt` **yalnızca** canlı bir sohbet tamamlaması anahtarı kanıtladıktan sonra yazılır.

| Mod | Ne yapar |
| --- | --- |
| `run` | `--count` değerine kadar hesap üretir, her anahtarı canlı bir sohbetle kapıdan geçirir |
| `gate` | bekleyen anahtarları yeniden tarar — `--rounds N` |
| `probe` | ortam kontrolü: çıkışlar, mail rail, katalog, mevcut anahtar kapısı |
| `screen` | ham çıkış listelerini canlı havuza filtreler |
| `collect` | `accounts.json` dosyasından `keys.txt` dosyasını yeniden oluşturur |

### 🖱️ Başlatıcı

Başlatıcı proxy listesini, sayıyı ve doğrulama modelini sorar, bunları `launcher.config.json` dosyasında hatırlar ve CLI'yi doğru bayraklarla çalıştırır.

## ✅ Çalıştığı doğrulandı — her anahtar test edilir

| Kontrol | Sonuç |
| --- | --- |
| `GET /v1/register/challenge` | **200** — sha256 proof-of-work (zorluk ≈4) |
| `POST /v1/register` | **200** — hesap oluşturuldu, e-posta bağlantısı gönderildi |
| e-posta bağlantısı → `POST /v1/verify` | **200** — hesap doğrulandı, `wf-…` anahtarı verildi |
| `POST /api/v1/chat/completions` — yazılmadan önce **her** anahtar için çalıştırılır | gerçek içerikle **200** |
| sohbet kontrolünde başarısız olan bir anahtar | `keys.txt` dosyasına asla yazılmaz |

## 🧭 Nasıl çalışır

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Waterfall page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.getwaterfall.org/api/v1/chat/completions → real content = the key is live
```

| Adım | Çağrı | Notlar |
| --- | --- | --- |
| challenge | `GET /v1/register/challenge` | sha256 PoW'yi yerel olarak çöz |
| kayıt | `POST /v1/register` | rail'inizden posta kutusu (araç rail'leri döndürür ve yedeklemeleri sayar) |
| doğrulama | e-posta bağlantısı → `POST /v1/verify` | `wf-…` anahtarını verir |
| kontrol | `POST /api/v1/chat/completions` | `keys.txt` öncesinde canlı 200 gerekli |

## ⚙️ CLI seçenekleri

```bash
node src/cli.js <mode> [flags]
```

| Mod | Bayraklar | Anlam |
| --- | --- | --- |
| `run` | `--count N` · `--concurrency N` · `--mail <rail>` · `--model <id>` | üret + kapıdan geçir (operatörün filosunda 24 worker'da ≈2,9 sn/anahtar) |
| `gate` | `--rounds N` | 429/503 yanıtlayan anahtarları yeniden tara |
| `probe` | — | çıkışlar · mail rail · katalog · mevcut anahtar kapısı |
| `screen` | — | ham listeler → canlı çıkış havuzu |
| `collect` | — | `accounts.json` dosyasından `keys.txt` dosyasını yeniden oluştur |

Varsayılanlar: `--count 50`, `--concurrency 12`, `--mail chain` (gerçek takma ad → broker).

## 🛰️ Proxy arkasında

Her istek havuzunuzdan bir çıkış üzerinden ayrılır; rail her hesap için çıkışları döndürür ve `state.json` dosyasına çıkışı kaydeder. Kayıt, **ağ yolu başına günde 5 hesapla** sınırlıdır, bu yüzden çıkışları agresif şekilde döndürün.

## 📄 Dosyalar

| Yol | İçerik |
| --- | --- |
| `keys.txt` | chat-200 anahtarları, her satırda `# chat-200 <model>` işaretiyle; kapıdan geçmemiş artıklar `# ungated` işareti taşır — git tarafından yok sayılır |
| `accounts.json` | hesap başına e-posta / anahtar / çıkış / chat-200 modelleri |
| `state.json` | çıkış defteri (günde 5 kayıt muhasebesi) — git tarafından yok sayılır |
| `proxies.txt` | çıkış listeniz — git tarafından yok sayılır |

## 🔌 9Router'a bağlan

[9Router](https://9router.com) kendi kendine barındırılan, OpenAI uyumlu bir yönlendiricidir. Tek bir komut `keys.txt` dosyasını çalışan kombinasyonlara sahip bir sağlayıcı düğümüne dönüştürür:

```bash
node src/connect-9router.js
```

Varsayılanlar: `--base http://localhost:20128`, `--password 123456`, `--name "Waterfall"`, `--prefix waterfall`, `--base-url https://api.getwaterfall.org/api/v1`.

## 🔑 Bir anahtar size ne kazandırır

| | |
| --- | --- |
| 🏢 Sağlayıcı | **Waterfall** — [getwaterfall.org](https://getwaterfall.org) |
| 🎁 Sağlayıcının verdikleri | anahtar başına bir hesap — proof-of-work kayıt, e-posta bağlantısı doğrulaması, her anahtar sohbetle doğrulanır |
| 🔑 Bir anahtar size ne kazandırır | kendi hesabına kapsanmış bir API anahtarı: aşağıdaki uç noktadaki 476 model kimliği, planınızın limitlerinde. Kota **hesapta** yaşar, bu aracın anahtar başına bir hesap oluşturmasının nedeni tam da budur |
| 🌐 API şekli | OpenAI uyumlu: `POST https://api.getwaterfall.org/api/v1/chat/completions` |
| 🔒 Verileriniz | yalnızca getwaterfall.org ve yapılandırdığınız gelen kutusu arka ucuyla iletişim kurulur; anahtarlar makinenizde kalır |

## 🐞 Sorunlar

Panel kayıt şeklini, PoW zorluğunu veya kataloğu değiştirirse, araç o adımda durur ve bunu bildirir. Çalıştırdığınız komut ve tam çıktıyla birlikte **[bir sorun açın](../../issues)**; PR'lar memnuniyetle karşılanır.

## 📄 Lisans

MIT © 2026 — bkz. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 waterfall-bulk-apikey katkıda bulunanlar

</div>