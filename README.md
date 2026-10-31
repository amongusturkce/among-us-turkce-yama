# Among Us Türkçe Yama — Dağıtım Deposu

Bu depo yalnızca **dağıtım** içindir:

- Genel web sitesi (`website/`)
- Beta ve Stable güncelleme manifestleri (`website/updates/`)
- GitHub Actions iş akışları
- Beta yayın / geri alma araçları

Oyun dosyaları, ham paketler, yerel yedekler ve geliştirme adayları bu depoda
**tutulmaz**. Büyük yama ZIP'leri yalnızca **GitHub Releases** üzerinden dağıtılır.

## Adresler

| Kanal | Manifest |
|---|---|
| Beta | `https://amongusturkce.github.io/among-us-turkce-yama/updates/beta/latest.json` |
| Stable | `https://amongusturkce.github.io/among-us-turkce-yama/updates/stable/latest.json` |

Site: `https://amongusturkce.github.io/among-us-turkce-yama/`

ATR'ye sunucu kökü verilir:

```text
https://amongusturkce.github.io/among-us-turkce-yama
```

ATR kanal yolunu kendisi ekler. Varsayılan kanal **stable**'dır; beta yalnızca
`--kanal beta` ile etkinleştirilir.

## Stable kilidi

Stable kanalı, Steam desteği tamamlanana kadar **kilitlidir** (`kilitli: true`,
boş `paketler`). Beta değişiklikleri stable'a otomatik taşınmaz. Bu depodaki
araçlar stable manifestine yazamaz; yayın aracı stable'ı bayt düzeyinde korur.

## Yayınlama

Beta yayını normalde OpenCode tarafından yerel makinede çalıştırılır
(`Publish-Beta.ps1 -GitHub -Onayla`). GitHub Actions üzerinden yayın için
`Publish beta` iş akışı elle tetiklenir; aday paketler bir artifact olarak
verilmelidir.

Geri alma: `Rollback-Beta.ps1 -Etiket <etiket> -Onayla`.

## Güvenlik

- Token/anahtar depoda tutulmaz; Actions `GITHUB_TOKEN`, yerelde `gh` oturumu.
- İş akışları en düşük izinlerle çalışır (`contents: write` yalnızca yayında,
  `pages: write` + `id-token: write` yalnızca sayfa dağıtımında).
- Paket SHA-256 doğrulanmadan manifest güncellenmez.
- Aynı sürüm etiketinin üzerine yazılmaz.
