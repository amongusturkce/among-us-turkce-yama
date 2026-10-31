# Among Us Türkçe — Web Sitesi

Siyah/kırmızı uzay temalı, koyu bordo vurgulu, mobil uyumlu **tek sayfalık** tanıtım sitesi.
Harici bağımlılık yok; saf HTML + CSS + JS.

## Yerel olarak çalıştırma

Bu klasördeki dosyaları bir statik sunucuyla açman yeterli.

### Yöntem 1 — Python (önerilen)

```powershell
cd website
python -m http.server 8080
```

Sonra tarayıcıda aç: <http://localhost:8080/index.html>

### Yöntem 2 — Tek tıkla (Windows)

`baslat.bat` dosyasına çift tıkla; sunucu kurulur ve tarayıcı açılır.

### Yöntem 3 — Node

```powershell
cd website
npx serve .
```

> Not: Dosyaları doğrudan `file://` ile de açabilirsin; güncelleme geçmişi
> gibi özellikler bu durumda da çalışır.

## Sayfa yapısı

Site tek uzun sayfa olarak akar; yalnızca **Bağış Yap** ayrı bir sayfadır.

| Dosya | İçerik |
|---|---|
| `index.html` | Tek sayfa: Hero → Kurulum → Güncelleme Geçmişi → SSS → Destek → Yasal → Footer |
| `bagis.html` | Bağış sayfası (bağlantılar henüz bağlanmadı; sahte buton yok) |
| `_arsiv/` | Eski ayrı sayfaların (`kurulum.html`, `guncelleme-gecmisi.html`, `sss.html`) yedekleri |

### Ana sayfa bölümleri (sırasıyla)

1. **Hero** — topluluk etiketi, "Among Us'ı Türkçe oyna." başlığı (Among Us logosu başlıkta,
   metin logoya göre dengelenmiş; ~%8 küçültülmüş), iki buton (gerçek Telegram bağlantısı
   + devre dışı indirme butonu). **Hero ilk ekranı tamamen kaplar (`min-height: 100svh`,
   dikey ortalanmış içerik)**; böylece ilk ekranın alt kenarından sonraki bölümden
   hiçbir piksel görünmez. `display:none`/kesen `overflow`/sabit yükseklik hilesi
   kullanılmaz — içerik kısa ekranlarda hero'yu doğal biçimde büyütür.
   Arka planda **uzay sahnesi** (ilk tasarımdan geri kazandırıldı): butonların altında,
   ortada koyu kırmızı ışıklı gezegen + etrafında süzülen 4 Among Us karakteri
   (`.hero-scene`; akış içinde, sayfa kaydırılınca hero ile yukarı kayar;
   `crewFloat` ile yavaş salınım, yalnızca transform). Mobilde sahne 150px,
   gezegen 110px olur.
2. **Galeri bandı** — üç gerçek oyun içi ekran görüntüsünden **dönen galeri**
   (sol/sağ oklar + küçük önizleme şeridi; merkez görsele tıklayınca lightbox açılır).
   Galeri hero'nun **dışında** ayrı bir banttır (`.gallery-band`): hero 100svh
   doldurduğundan galeri fold'un altında başlar ve aşağı kaydırınca doğal biçimde görünür.
3. **Kurulum** — indirme kutusu (sürüm/boyut/tarih alanları; doğrulanmamış değerler
   "Kesinleşmedi/Doğrulanmadı" olarak işaretli), 6 adımlık açılabilir kurulum rehberi.
4. **Güncelleme Geçmişi** — TikTok You tarzı sade düzen: sol sürüm listesi + sağ detay
   (Eklenenler/Düzeltmeler grupları). Ayrı, farklı renkli panel yok — içerik doğrudan
   kesintisiz uzay zemininin üzerindedir. Listedeki **en güncel sürüm** (ilk kayıt)
   `.is-latest` ile görsel olarak ayrılır (kırmızı çubuk + soluk zemin). Sürüm verileri
   **taslak/örnek** olarak işaretlidir (`assets/js/versions.js`); gerçek olmayan tarih
   ve değişiklikler uydurulmaz.
5. **SSS** — akordiyon sıkça sorulan sorular.
6. **Destek** — Ad/E-posta/Konu/Mesaj formu; alan doğrulaması çalışır, ancak gönderim
   altyapısı henüz bağlanmadığı için mesajın iletildiği **iddia edilmez** (dürüst not).
7. **Yasal** — birebir Innersloth bildirimi, BepInEx/UnityDoorstop LGPL-2.1 bildirimi,
   ölçülen indirme boyutları ve mod damgası doğrulama durumu.
8. **Footer** — logo, kısa açıklama, sayfa bağlantıları, Telegram, destek + bağış.
   Üst sınırında tüm genişlikte **kesintisiz hareketli ince dalga ayıracı** bulunur.

## Öne çıkan davranışlar

- **Kesintisiz uzay zemini:** Sayfanın temel arka planı en üstten footer'a kadar aynıdır
  (`.bg-effects` sabit katmanı + body zemini). Bölüm zeminleri, arka planı kesen
  kenarlıklar, yatay ayraçlar ve banner'lar yoktur; bölümler yalnızca boşluk, tipografi
  ve içerik düzeniyle ayrışır. Kullanıcı sayfayı kaydırdıkça aynı atmosferin içinde
  ilerler; farklı panel/bölüm hissi oluşmaz.
- **Üst menü (TikTok You tarzı):** Sayfa en üstte şeffaftır — logo ve bağlantılar her
  zaman görünür, arkada panel yoktur. Kaydırmaya başlayınca arkadaki koyu panel
  (`.nav::before`) üstten aşağı animasyonla iner; en üste dönünce geri gizlenir.
  Menü sabit konumlu olduğundan içerik sıçraması olmaz. Mobilde (≤900px) panel her
  zaman görünür ve hamburger menüye dönüşür.
- **Kayarak hareket eden aktif kapsül (`.nav-pill`):** Sayfa en üstünde hiçbir bağlantı
  aktif değildir. Bir bölümün üst sınırı menü hizasını geçince seçili bağlantı kapsül
  olur; kapsül eski yerinden yeni yerine **animasyonla kayar** (`transform` + `width`,
  0.4s cubic-bezier), anında kaybolup yeniden oluşmaz. Konum `getBoundingClientRect`
  ile hesaplanır → bağlantı genişliğine uyar, resize'da yenilenir. Yukarı kaydırmada
  geri döner; bölüm sınırında titreme olmaz. Tıklamada anında uygulanır.
  Bağlantılar ilgili bölümlere yumuşak kaydırmayla gider (`scroll-margin-top` sayesinde
  sabit menü içeriği örtmez). Bağış Yap ayrı sayfadır (orada kapsül HTML'de `active`
  olan Bağış Yap bağlantısına yerleşir).
- **Tıklama efekti:** İmleçli cihazlarda, tıklama noktasında kısa parlama + birkaç kırmızı
  parçacık; 40 parçacık sınırı; `pointer-events:none`; mobil ve `prefers-reduced-motion`
  açıkken kapalı.
- **Dönen üçlü galeri (yapılandırmalı):** Sahne alanı 1000px; ortada önde ana görsel
  (~760px, ~%38 daha büyük), sol/sağda arkada, küçük ve kısmen örtülü iki görsel — üçü
  yakın, dengeli tek kompozisyon (görsel oranı korunur, kırpma yok). **Sağ ok → sağdaki
  görsel animasyonla merkeze gelir ve büyür; ortadaki sola geçer; soldaki döngünün
  devamına geçer; sıradaki sağda belirir. Sol ok tam tersi.** Dairesel (mod N);
  geçişlerde yatay kayma + ölçek + derinlik (transform/opacity), görseller birbirinin
  içinden geçmez. **Merkezdeki görsele tıklayınca büyük görüntüleme penceresi (lightbox)
  açılır**; yan görsele tıklayınca o görsel merkeze geçer; galeri okları yalnızca
  galeriyi döndürür. Altta kaydırılabilir küçük önizleme şeridi; giriş tuşuyla açılır,
  kapat düğmesiyle kapanır; önizlemeye tıklayınca merkeze geçer, seçim her
  adımda senkron kalır. Ok tuşlarıyla klavye gezinmesi, `aria-pressed` ve
  erişilebilir adlar desteklenir. Görselin arkasında dikdörtgen kırmızı panel yok;
  yalnızca yumuşak kırmızı uzay ışığı + gölge uygulanır.
  **Görseller `assets/js/main.js` içindeki `GALERI` listesinden kurulur** — yeni ekran
  görüntüsü eklemek için listeye satır eklemek yeterlidir; HTML değişmez.
- **Büyük görüntüleme penceresi (lightbox):** Merkez görsele tıklayınca açılır; görsel
  ekranın mümkün olduğunca geniş alanında, en-boy oranı korunarak gösterilir
  (`object-fit: contain`, esnetme/kırpma yok). Arka plan hafif saydam siyah; sağ/sol
  dairesel ok düğmeleri + sağ üstte kapat düğmesi. Görseller arasında dairesel geçiş
  (mod N); klavye okları, `Escape`, karartma tıklaması ve mobilde parmak kaydırma
  (swipe) ile gezinilir. **Seçili görsel galeriyle senkrondur** (lightbox'ta gezinmek
  galeriyi de çevirir). Pencere açıkken sayfa kayması kilitlenir
  (`body.lightbox-open`), kapatılınca önceki kaydırma konumuna anında dönülür. Odak
  pencere içinde döner (Tab tuzağı), `role="dialog"` + `aria-modal` tanımlıdır.
  Orijinal dosyalar kullanılır; kalite düşürme yok.
- **Animasyonlu dalga ayıracı (footer):** Footer'ın üst sınırında, ekranın tüm
  genişliğinde ince bir dalga çizgisi (`.footer-wave`); iki özdeş SVG kopyasının
  `translateX(0 → -50%)` ile kaydırılmasıyla **kesintisiz** yatay hareket (26s, linear,
  yalnızca transform). Düşük opaklıklı kırmızı + koyu bordo iki çizgi; zemin/banner
  değil, yalnız çizgi. Mobilde tam genişlik, taşma yok; `prefers-reduced-motion` ile
  animasyon durur (durağan dalga kalır). Footer bağlantıları ve düzeni değişmez.
- **Sürüm seçimi:** Listeden sürüm seçimi sayfayı yeniden yüklemez; klavye ok tuşlarıyla
  da gezinilir (`aria-selected` güncellenir).

## Performans ve erişilebilirlik

- Yalnızca koyu tema (tema seçici yok).
- JS animasyon döngüsü yok (rAF yalnızca mıknatıslı butonlar + fare hareketi).
  Süzülen sahne karakterlerinin `crewFloat` animasyonu ve footer dalgasının `waveSlide`
  animasyonu yalnızca `transform` ile çalışır (compositor) ve `prefers-reduced-motion`
  ile tamamen kapanır. Pahalı `blur`/`backdrop-filter`/`drop-shadow` kullanılmıyor.
- Animasyonlar `transform` + `opacity` ile; `prefers-reduced-motion` desteklenir
  (animasyon/transition 0.01ms, `scroll-behavior: auto`, reveal içerikleri anında görünür).
- Klavye gezinme + görünür odak (`:focus-visible`), yeterli renk kontrastı.
- Mobilde yatay taşma yok (test edilen genişlikler: 469/985/1281/1905px).
- Stil/betik dosyaları cache-buster ile yüklenir (`?v=wave`); içerik değişince
  sürüm eklenir, eski önbellek sorunu yaşanmaz.

## Dosya ağacı

```
website/
├── index.html            # Tek sayfa ana içerik
├── bagis.html            # Bağış sayfası
├── baslat.bat            # Tek tıkla yerel sunucu
├── README.md
├── _arsiv/               # Eski ayrı sayfaların yedekleri
└── assets/
    ├── css/style.css
    ├── js/
    │   ├── main.js       # Menü + kayan aktif kapsül (scroll spy), dönen galeri
    │   │                  (GALERI yapılandırması) + lightbox, manyetik butonlar,
    │   │                  tıklama efekti
    │   ├── changelog.js  # Sürüm listesi/detay arayüzü
    │   ├── versions.js   # TASLAK sürüm verileri (kesinleşen sürümler buradan güncellenecek)
    │   └── destek.js     # Form doğrulaması (gönderim altyapısı bağlı değil)
    └── img/              # Logo, favicon, üç gerçek oyun içi ekran görüntüsü (galeri)
```

## Yasal bildirimler ve üçüncü taraf bileşenler

### Innersloth bildirimi (birebir)

> This mod is not affiliated with Among Us or Innersloth LLC, and the content
> contained therein is not endorsed or otherwise sponsored by Innersloth LLC.
> Portions of the materials contained herein are property of Innersloth LLC.
> © Innersloth LLC.

### BepInEx ve UnityDoorstop (LGPL-2.1)

- **BepInEx 6.0.0-be.785+6abdba4** — kaynak:
  <https://github.com/BepInEx/BepInEx/tree/6abdba47eeebe08552282e7a58ef0f4a9ab60b62>
  (commit `6abdba4`), lisans: GNU LGPL 2.1.
- **UnityDoorstop** — kaynak: <https://github.com/NeighTools/UnityDoorstop>,
  lisans: GNU LGPL 2.1.
- Resmî BepInEx derlemesi değiştirilmeden dağıtılır. Lisans metinleri yama
  paketinde `ek/lisanslar/` altında, ayrıca dağıtım klasöründeki
  `bepinex-6.0.0-be.785-win-x64.zip` içinde bulunur.
- LGPL-2.1 tam metni: <https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html>

### Ölçülen indirme boyutları (test paketi, yayımlanmadı)

| Bileşen | Bayt | MiB | Ne zaman indirilir |
|---|---:|---:|---|
| Yama delta paketi | 127.546.786 | 121,64 | Her zaman |
| BepInEx resmî ZIP | 34.335.572 | 32,74 | Yalnızca BepInEx kurulu değilse |
| **Toplam (en kötü durum)** | **161.882.358** | **154,38** | — |

BepInEx uyumlu biçimde zaten kuruluysa yalnızca 127.546.786 bayt indirilir.
Bu sayılar yerel dosya boyutlarıdır; indirme sırasında CDN/sıkıştırma farkı
ölçülmedi.

### Mod damgası

Paket, oyunun kendi `ModManager.Instance.ShowModStamp()` çağrısını yapan küçük
bir eklenti (`AutModDamga.dll`) içerir. ATR kurulumda bileşenlerin **dosya
bütünlüğünü** doğrular; damganın oyun içinde göründüğü kurulum sırasında
otomatik test edilmez. Ayrı, elle çalıştırılan geliştirici testi kullanılır:
2026-10-28'de konsol penceresi kapalıyken yapılan testte damga oyun penceresinin
sağ üst köşesinde görüldü (kanıt: `MOD_DAMGA/kanit/gercek_oyun_dogrulama.json`
ve `gercek_oyun_ekran.png`).

## Bağlantısı hazır olmayan işlevler

- **İndirme:** Türkçe yama paketi henüz yayımlanmadı; indirme butonları devre dışı ve
  bunu açıkça belirtiyor. Paket hazır olduğunda `index.html` içindeki
  `button.btn-disabled[disabled]` öğeleri gerçek bağlantılarla değiştirilecek.
- **Destek formu:** Gerçek gönderim altyapısı (e-posta/servis) henüz bağlanmadı; form
  yalnızca doğrulama yapar ve bunu kullanıcıya dürüstçe bildirir (`assets/js/destek.js`).
- **Bağış:** Güvenilir platform seçilmedi; `bagis.html` içinde bağlantı eklenecek alan
  hazır, sahte buton yok.

> Among Us, Innersloth markasıdır. Bu proje bağımsız, gönüllü bir topluluk çalışmasıdır;
> InnerSloth ile bağlantılı, onaylı veya desteklenen bir proje değildir.
