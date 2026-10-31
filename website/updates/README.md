# Güncelleme kanalları

Bu klasör ATR'nin okuduğu sürüm manifestlerini barındırır.

| Kanal | Adres | Durum |
|---|---|---|
| Beta | `/updates/beta/latest.json` | Açık (yayın olduğunda) |
| Stable | `/updates/stable/latest.json` | **Kilitli** |

- **Stable** kanalı, Steam desteği tamamlanana kadar kilitlidir ve bu klasördeki
  dosya elle onay olmadan değiştirilmez. Beta değişiklikleri otomatik olarak
  stable'a taşınmaz.
- **Beta** kanalı, doğrulanmış adayların test dağıtımı içindir. ATR beta kanalını
  yalnızca kullanıcı etkinleştirdiğinde (`--kanal beta`) kontrol eder.
- `packages/` altındaki büyük ZIP'ler depoya commit edilmez (`.gitignore`);
  gerçek dağıtımda GitHub Releases kullanılır.

Yayınlama ve geri alma: `tools/distribution/README.md`.
