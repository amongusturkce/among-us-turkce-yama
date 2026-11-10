# Güncelleme kanalları

Bu klasör ATR'nin okuduğu sürüm manifestlerini barındırır.

| Kanal | Adres | Durum |
|---|---|---|
| Beta | `/updates/beta/latest.json` | Açık (yayın olduğunda) |
| Stable | `/updates/stable/latest.json` | Açık — v2.3 / 2.4.0; Steam, Epic, MSIX |

- **Stable** kanalı ayrı bir doğrulama/yayın adımıyla güncellenir; Beta
  değişiklikleri otomatik olarak stable'a taşınmaz. Her kullanıcı yalnızca
  seçtiği platformun paketini indirir.
- **Beta** kanalı, doğrulanmış adayların test dağıtımı içindir. ATR beta kanalını
  yalnızca kullanıcı etkinleştirdiğinde (`--kanal beta`) kontrol eder.
- `packages/` altındaki büyük ZIP'ler depoya commit edilmez (`.gitignore`);
  gerçek dağıtımda GitHub Releases kullanılır.
- BepInEx ekleri Epic/Steam paketlerine özeldir; MSIX'e uygulanmaz.
- Uygulama kurucusu güncellemeleri `/updates/application/stable/latest.json`
  üzerinden sunulur.

Yayınlama ve geri alma: `tools/distribution/README.md`.
