# ATR Dağıtım Altyapısı

Bu klasör, Among Us Türkçe Yama için **beta/stable** dağıtım hattını yönetir.
Mevcut `ATR/` kurulum mekanizmasını yeniden yazmaz; onu sunucu tabanlı
güncellemeye bağlar.

## Klasör yapısı

```
tools/distribution/
  Publish-Beta.ps1            Beta yayını (yerel site veya GitHub Releases)
  Rollback-Beta.ps1           Önceki beta sürümüne dönüş
  Publish-OpenCode-Beta.ps1   OpenCode için tek komut (test -> doğrula -> yayınla)
  Test-Distribution.ps1       Uçtan uca test (yerel HTTP sunucu + kum havuzu)
  Serve-Local.ps1             Yerel statik sunucu (test/geliştirme)
  config/distribution.json    Kanal, platform ve depo yapılandırması
```

Yayınlanan dosyalar:

```
website/updates/beta/latest.json       Beta manifesti (ATR bunu okur)
website/updates/beta/releases.json     Sürüm geçmişi (özet)
website/updates/beta/history/<etiket>.json  Tam manifest anlık görüntüsü (geri alma)
website/updates/beta/packages/<etiket>/     Yerel modda paketler
website/updates/stable/latest.json     Stable manifesti (KİLİTLİ)
```

## Manifest şeması (geriye uyumlu)

ATR'nin mevcut `semasi: 1` yapısı korunur; yalnızca isteğe bağlı alanlar eklenir:

```json
{
  "semasi": 1,
  "urun": { "ad": "Among Us Türkçe Yama", "surum_etiketi": "v2.3" },
  "kanal": "beta",
  "kilitli": false,
  "yama": { "surum": "2.4.0", "tarih": "2026-10-31", "notlar": "...", "minimum_atr": "5.0.0" },
  "oyun": { "surumler": ["2026.9.29"] },
  "beta": { "etiket": "2.4.0-beta.20261031T061500", "yayin": "..." },
  "paketler": [
    {
      "platform": "epic",
      "platform_adi": "Epic Games Store",
      "oyun_surumleri": ["2026.9.29"],
      "dosya": "atr-yama-2.4.0-epic.zip",
      "url": "packages/<etiket>/atr-yama-2.4.0-epic.zip",
      "boyut": 552724043,
      "sha256": "…",
      "tarih": "2026-10-31",
      "notlar": "…",
      "dosyalar": [ … ]
    }
  ]
}
```

- `yama.surum` = **teknik paket sürümü** (ör. `2.4.0`).
- `urun.surum_etiketi` = **kullanıcıya gösterilen ürün sürümü** (ör. `v2.3`).
- `kilitli: true` + boş `paketler` = kanalda yayın yok. ATR bunu hata değil,
  bilgilendirme olarak gösterir.
- `url` göreli ise kanal tabanına göre çözülür
  (`https://site/<repo>/updates/beta/packages/...`); mutlak `https://` de olabilir.

## ATR kanal davranışı

- Varsayılan kanal: **stable**.
- Beta'yı etkinleştirme: `ATR.bat --kanal beta`, `ATR_KANAL=beta` ortam değişkeni
  veya menüden `[5] Kanal ayarı`.
- Sunucu kökü verilir; ATR `<kök>/updates/<kanal>/latest.json` adresini okur.
- Eski sunucular (`<kök>/latest.json`) yalnızca **stable** kanalında yedek olarak
  denenir; mevcut kurulumlar bozulmaz.
- Manifest UTF-8 kabul edilir (sunucu charset belirtmese bile).
- Paket boyutu + SHA-256 doğrulanmadan hiçbir dosya yazılmaz.
- İndirme başarısızsa yarım dosya silinir, kurulum yapılmaz.
- Kurulum öncesi yedek + kurulum sonrası doğrulama + hata halinde geri dönüş
  mevcut ATR akışındadır.

## Komutlar

```powershell
# Altyapı testleri (canlı kurulumlara dokunmaz)
./tools/distribution/Test-Distribution.ps1

# Adayları doğrula, hiçbir şey yayınlama
./tools/distribution/Publish-Beta.ps1 -Dene

# Yerel siteye yayınla (paketler website/updates/beta/packages/<etiket>/)
./tools/distribution/Publish-Beta.ps1 -Onayla

# GitHub Releases'e yayınla (gh oturumu + config'te owner/repo gerekir)
./tools/distribution/Publish-Beta.ps1 -GitHub -Onayla

# Tek platform
./tools/distribution/Publish-Beta.ps1 -Platform epic -Dene

# Geri alma
./tools/distribution/Rollback-Beta.ps1 -Dene
./tools/distribution/Rollback-Beta.ps1 -Etiket <etiket> -Onayla

# OpenCode için tek komut
./tools/distribution/Publish-OpenCode-Beta.ps1              # test + doğrula
./tools/distribution/Publish-OpenCode-Beta.ps1 -Onayla      # + yayınla
./tools/distribution/Publish-OpenCode-Beta.ps1 -GitHub -Onayla
```

## Güvenlik kuralları

- Token/API anahtarı kodda veya yapılandırmada tutulmaz; GitHub için `gh` oturumu
  (`gh auth login`) veya Actions'ta `GITHUB_TOKEN` kullanılır.
- Aynı etiketin üzerine yazılmaz (yerel klasör ve `gh release view` kontrolü).
- Manifest yalnızca yükleme + geri indirme doğrulaması başarılıysa güncellenir.
- Hata halinde önceki beta manifesti korunur, yarım paket klasörü silinir.
- `Publish-Beta.ps1` stable manifestinin baytlarını önce/sonra karşılaştırır;
  değişmişse geri yükler ve hata verir.
- Stable kanalı bu araçlarla **açılamaz** (`kanallar.stable.acik` daima `false`).
- `website/updates/*/packages/` `.gitignore` içindedir; büyük paketler depoya
  commit edilmez, GitHub Releases'te tutulur.

## GitHub kurulumu (henüz yapılmadı)

Bu çalışma ortamında **git deposu ve `gh` CLI yok**. Depo oluşturulunca:

1. Depoyu oluşturun ve bağlayın:
   ```powershell
   git init
   git remote add origin https://github.com/<kullanici>/<depo>.git
   ```
2. `gh` kurun ve giriş yapın:
   ```powershell
   winget install --id GitHub.cli
   gh auth login
   ```
3. `tools/distribution/config/distribution.json` içinde `github.owner`,
   `github.repo`, `github.pages_url` alanlarını doldurun.
4. GitHub → Settings → Pages → **Source: GitHub Actions**.
5. Yalnızca altyapı dosyalarını gönderin (büyük paketler `.gitignore` dışında):
   ```powershell
   git add .github tools/distribution website/updates ATR
   git commit -m "ATR dagitim altyapisi"
   git push -u origin main
   ```
6. `Deploy website` iş akışı `website/` klasörünü Pages'e yayınlar.
   Manifest adresleri:
   - `https://<kullanici>.github.io/<depo>/updates/beta/latest.json`
   - `https://<kullanici>.github.io/<depo>/updates/stable/latest.json`

Paketler GitHub Releases'e yüklendiğinde manifestteki `url` alanı
`https://github.com/<owner>/<repo>/releases/download/<etiket>/<dosya>` olur.
