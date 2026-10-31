/* Among Us Türkçe — ortak arayüz betiği
   - Mobil menü
   - Kaydırma konumuna göre üst menü (en tepede gizli panel, kaydırınca görünür)
   - Kayarak hareket eden aktif menü kapsülü (scroll spy ile)
   - Kaydırma animasyonu (reveal)
   - Yaptırmalı dönen oyun galerisi (GALERI listesi)
   - Mıknatıs etkili butonlar (yalnızca imleçli cihaz + reduced-motion dışı)
   - Tıklama parçacık efekti (yalnızca tıklamada; sınırlı sayıda)
   Not: Site yalnızca koyu temada çalışır; tema seçici yoktur.
   Tüm süregelen işler transform/opacity ile sınırlı; rAF döngüsü yalnızca
   mıknatıs etkinse ve fare hareket ederken çalışır. */

(function () {
  "use strict";

  function prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* =========================================================
     1) MOBİL MENÜ
     ========================================================= */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("click", function (e) {
      if (!links.classList.contains("open")) return;
      if (links.contains(e.target) || toggle.contains(e.target)) return;
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  /* =========================================================
     2) KAYDIRMA KONUMUNA GÖRE ÜST MENÜ
     - Sayfa en üstteyken (scrollY <= eşik) menü gizli.
     - Aşağı kaydırınca yumuşakça iner ve sabit kalır.
     - En üste dönünce yeniden gizlenir.
     - Yalnızca class ekler/çıkarır; transform geçişi CSS'tedir.
       Menü konum sabit (fixed) olduğundan içerik sıçramaz.
     - Küçük ekranda menü erişimi kolay olsun diye her zaman görünür.
     ========================================================= */
  function initNavVisibility() {
    var nav = document.querySelector(".nav");
    if (!nav) return;

    var ESIK = 48; // px — bu değerin altında menü gizli kalır
    var kucukEkran = window.matchMedia("(max-width: 900px)");
    var gorunur = null; // son uygulanan durum (gereksiz class yazımını önler)

    function guncelle() {
      var istenen = kucukEkran.matches || (window.scrollY || 0) > ESIK;
      if (istenen === gorunur) return;
      gorunur = istenen;
      nav.classList.toggle("nav-visible", istenen);
    }

    window.addEventListener("scroll", guncelle, { passive: true });
    if (kucukEkran.addEventListener) {
      kucukEkran.addEventListener("change", guncelle);
    }
    guncelle();
  }

  /* =========================================================
     3) KAYDIRINCA BELİREN BÖLÜMLER
     ========================================================= */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      for (var i = 0; i < items.length; i++) items[i].classList.add("visible");
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    for (var j = 0; j < items.length; j++) obs.observe(items[j]);
  }

  /* =========================================================
     4) MIKNATIS ETKİLİ BUTONLAR
     - Yalnızca gerçek fare/trackpad (hover + fine pointer)
     - prefers-reduced-motion: kapalı
     - Tek bir rAF döngüsü, yalnızca hareket varken çalışır
     - transform ile konum: sayfa düzenini bozmaz
     ========================================================= */
  function initMagneticButtons() {
    if (prefersReducedMotion()) return;
    // Dokunmatik cihazda kapalı
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var buttons = Array.prototype.slice.call(document.querySelectorAll(".btn"));
    if (!buttons.length) return;

    // Manyetik etki yalnızca .btn-primary / .btn-ghost gibi önemli butonlarda
    // Devre dışı (disabled) butonlar atlanır.
    var targets = buttons.filter(function (b) {
      if (b.disabled) return false;
      return b.classList.contains("btn-primary") || b.classList.contains("btn-ghost");
    });
    if (!targets.length) return;

    targets.forEach(function (b) { b.classList.add("is-magnetic"); });

    // Etki, butonun KENARINDAN itibaren geniş bir alanda başlar (merkez beklenmez).
    // Hareket mesafesi ve çekim kasten düşük: ince, doğal ve akıcı bir his için.
    var MARGIN = 60;         // buton çevresinde etkinleşeceği ek alan (px)
    var FOLLOW = 0.10;       // imlece yönelme oranı
    var MAX_PULL = 5;        // azami kayma (px)
    var ease = 0.16;         // yumuşak geri dönüş katsayısı

    var pointerX = 0, pointerY = 0, active = false;
    var rafId = null;
    var state = new WeakMap();

    function getState(el) {
      var s = state.get(el);
      if (!s) { s = { x: 0, y: 0, tx: 0, ty: 0 }; state.set(el, s); }
      return s;
    }

    function loop() {
      rafId = null;
      var anyMoving = false;

      for (var i = 0; i < targets.length; i++) {
        var el = targets[i];
        var s = getState(el);
        var targetX = 0, targetY = 0;

        if (active) {
          var r = el.getBoundingClientRect();
          var cx = r.left + r.width / 2;
          var cy = r.top + r.height / 2;
          var dx = pointerX - cx;
          var dy = pointerY - cy;

          // Merkeze değil, butonun DİKDÖRTGEN kenarına göre mesafe ölç:
          // imleç yanından geçerken de etki başlar, merkeze gelmesi gerekmez.
          var gapX = Math.max(r.left - pointerX, 0, pointerX - r.right);
          var gapY = Math.max(r.top - pointerY, 0, pointerY - r.bottom);
          var gap = Math.sqrt(gapX * gapX + gapY * gapY);

          if (gap < MARGIN) {
            // Kenara yaklaştıkça etki artar; merkezde yumuşakça doygunluk
            var prox = 1 - gap / MARGIN;          // 0 (kenar) → 1 (butonun içinde)
            // Yön: imlece doğru, ama mesafe azaldıkça kısılır (merkezde ~0 kayma)
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.001) {
              var pull = Math.min(dist * FOLLOW, MAX_PULL) * prox;
              targetX = (dx / dist) * pull;
              targetY = (dy / dist) * pull;
            }
          }
        }

        s.tx = targetX;
        s.ty = targetY;
        s.x += (s.tx - s.x) * ease;
        s.y += (s.ty - s.y) * ease;

        // Duran elemanda yazmayı kes (gereksiz still yazma)
        var settled = Math.abs(s.x) < 0.05 && Math.abs(s.y) < 0.05 &&
                      Math.abs(s.tx) < 0.001 && Math.abs(s.ty) < 0.001;
        if (settled) {
          if (s.applied !== "zero") {
            el.style.transform = "";
            s.applied = "zero";
          }
        } else {
          el.style.transform = "translate3d(" + s.x.toFixed(2) + "px," + s.y.toFixed(2) + "px,0)";
          s.applied = "set";
          anyMoving = true;
        }
      }

      if (anyMoving) schedule();
    }

    function schedule() {
      if (rafId === null) rafId = window.requestAnimationFrame(loop);
    }

    window.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      pointerX = e.clientX;
      pointerY = e.clientY;
      active = true;
      schedule();
    }, { passive: true });

    // İmleç pencereden çıkınca yumuşakça sıfırla
    document.addEventListener("pointerleave", function () {
      active = false;
      schedule();
    });
    window.addEventListener("blur", function () {
      active = false;
      schedule();
    });
    // Kaydırınca konumlar değişir; tek karede güncelle
    window.addEventListener("scroll", function () {
      if (active) schedule();
    }, { passive: true });
  }

  /* =========================================================
     5) AKTİF MENÜ KAPSÜLÜ (kayarak hareket eden seçili bağlantı)
     - Kapsül <nav> içinde mutlak konumlu tek bir elemandır; bağlantılar
       arasında kayarak geçer, anında kaybolup yeniden oluşmaz.
     - Konum/boyut getBoundingClientRect ile hesaplanır → hem masaüstü
       hem mobil (dikey) menüde doğru; resize'da yenilenir.
     - Sayfa en üstünde kapsül tamamen gizlidir (seçili bağlantı yok).
     ========================================================= */
  function initNavPill() {
    var kutu = document.querySelector(".nav > .container > nav");
    if (!kutu) return null;

    var pill = document.createElement("span");
    pill.className = "nav-pill";
    pill.setAttribute("aria-hidden", "true");
    kutu.appendChild(pill);

    var ilk = true; // ilk konumlandırmada geçişsiz yerine oturur

    function konumla(link) {
      if (!link) { pill.classList.remove("show"); return; }
      var lr = link.getBoundingClientRect();
      var pr = kutu.getBoundingClientRect();
      if (ilk) pill.style.transition = "none";
      pill.style.width = lr.width + "px";
      pill.style.height = lr.height + "px";
      pill.style.transform = "translate(" + (lr.left - pr.left) + "px," +
                             (lr.top - pr.top) + "px)";
      if (ilk) { void pill.offsetWidth; pill.style.transition = ""; ilk = false; }
      pill.classList.add("show");
    }

    function gizle() {
      pill.classList.remove("show");
    }

    function yenidenHesapla() {
      var aktif = kutu.querySelector(".nav-links a.active");
      if (aktif) konumla(aktif); else gizle();
    }

    window.addEventListener("resize", yenidenHesapla);
    // Başlangıç durumu: sayfada hazır seçili bağlantı varsa (ör. bagis.html)
    // kapsül hemen ona yerleşir; yoksa gizli kalır.
    yenidenHesapla();
    return { konumla: konumla, gizle: gizle };
  }

  /* =========================================================
     6) KAYDIRMAYA GÖRE AKTİF MENÜ BAĞLANTISI (scroll spy)
     - Sayfa en üstünde hiçbir bağlantı aktif değil.
     - Bir bölümün üst sınırı menü hizasına gelince o bağlantı kapsül olur.
     - Tıklama anında da uygulanır; yumuşak kaydırma sırasında otomatik güncellenir.
     ========================================================= */
  function initActiveNav(pillKont) {
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav-links a"));
    if (!links.length) return;

    // Aynı sayfadaki bölüm bağlantılarını topla (bagis.html'de index.html#... olabilir)
    var items = [];
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      var hashIdx = href.indexOf("#");
      if (hashIdx < 0) continue;                       // dış sayfa (ör. bagis.html) → yönetme
      var hash = href.slice(hashIdx);
      if (!hash || hash === "#") continue;
      var sec = null;
      try { sec = document.querySelector(hash); } catch (err) { sec = null; }
      if (!sec) continue;                              // bu sayfada yok → atla
      items.push({ link: links[i], sec: sec });
    }
    if (!items.length) return;

    var aktif = null;
    var UST_ESIK = 60;   // px — bu değerin altında (sayfa tepesinde) hiçbir bağlantı aktif değil

    function navHeight() {
      var nav = document.querySelector(".nav");
      return nav ? nav.offsetHeight : 68;
    }

    function guncelle() {
      var y = window.scrollY || window.pageYOffset || 0;
      var istenen = null;
      if (y > UST_ESIK) {
        var hedef = y + navHeight() + 60;
        for (var k = 0; k < items.length; k++) {
          var ust = items[k].sec.getBoundingClientRect().top + y;
          if (ust <= hedef) istenen = items[k].link;
        }
      }
      if (istenen === aktif) return;
      if (aktif) aktif.classList.remove("active");
      if (istenen) istenen.classList.add("active");
      aktif = istenen;
      // Kapsülü yeni aktif bağlantıya yumuşakça kaydır (üstteyken gizlenir)
      if (pillKont) {
        if (istenen) pillKont.konumla(istenen);
        else pillKont.gizle();
      }
    }

    // Tıklama anında aktif durumu hemen uygula (kaydırma bitene kadar bekleme)
    for (var j = 0; j < items.length; j++) {
      (function (it) {
        it.link.addEventListener("click", function () {
          if (aktif) aktif.classList.remove("active");
          it.link.classList.add("active");
          aktif = it.link;
          if (pillKont) pillKont.konumla(it.link); // kapsül bağlantıya kayar
        });
      })(items[j]);
    }

    window.addEventListener("scroll", guncelle, { passive: true });
    window.addEventListener("resize", guncelle);
    guncelle();
  }

  /* =========================================================
     7) DÖNEN ÜÇLÜ GALERİ (yapılandırmalı)
     - Görseller aşağıdaki GALERI listesinden kurulur: yeni ekran görüntüsü
       eklemek için listeye satır eklemek yeterlidir; HTML değişmez.
     - Üç konum: sol / merkez / sağ; dairesel ilerleme (mod N).
     - Sağ ok → SAĞDaki görsel merkeze gelir, ortadaki sola geçer, soldaki
       döngünün devamına (sağa) geçer. Sol ok tam tersi.
     - Merkez görsel tıklanınca küçük önizleme şeridi açılır; kapat düğmesi var.
     - Önizleme seçimi merkeze geçer; oklarla dönünce şerit de senkronlanır.
     - Klavye: sol/sağ ok döndürür, Enter/Boşluk önizlemeyi açar.
     - Animasyonlar CSS'te transform/opacity ile; JS yalnızca sınıf değiştirir.
     ========================================================= */

  /* Galeri yapılandırması (tek güncelleme noktası) */
  var GALERI = [
    {
      src: "assets/img/oyun-icinde-turkce.png",
      ad: "ana menü",
      alt: "Among Us Türkçe ana menü ekran görüntüsü: OYNA, ENVANTER, MAĞAZA ve ARKADAŞLAR seçenekleri Türkçe."
    },
    {
      src: "assets/img/yerel-lobbi.png",
      ad: "yerel lobi",
      alt: "Among Us Türkçe yerel lobi ekran görüntüsü: oda ayarları, oyuncu listesi ve sohbet Türkçe."
    },
    {
      src: "assets/img/oyun-ayarlari.png",
      ad: "oyun ayarları",
      alt: "Among Us Türkçe oyun ayarları ekran görüntüsü: temel ayarlar ve rol ayarları Türkçe."
    }
  ];

  function initGallery() {
    var gallery = document.getElementById("heroGallery");
    if (!gallery) return;

    var stage = gallery.querySelector(".gallery-stage");
    var thumbsWrap = document.getElementById("galleryThumbs");
    if (!stage) return;

    var track = thumbsWrap ? thumbsWrap.querySelector(".thumbs-track") : null;
    var closeBtn = thumbsWrap ? thumbsWrap.querySelector(".thumbs-close") : null;
    var prevBtn = gallery.querySelector(".arrow-left");
    var nextBtn = gallery.querySelector(".arrow-right");

    /* --- Slaytları ve önizlemeleri yapılandırmadan kur --- */
    stage.innerHTML = "";
    if (track) track.innerHTML = "";
    for (var g = 0; g < GALERI.length; g++) {
      var kayit = GALERI[g];

      var fig = document.createElement("figure");
      fig.className = "gallery-slide";
      var img = document.createElement("img");
      img.setAttribute("src", kayit.src);
      img.setAttribute("alt", kayit.alt);
      img.setAttribute("width", "1920");
      img.setAttribute("height", "1080");
      img.setAttribute("decoding", "async");
      if (g > 0) img.setAttribute("loading", "lazy");
      fig.appendChild(img);
      stage.appendChild(fig);

      if (track) {
        var tb = document.createElement("button");
        tb.type = "button";
        tb.className = "thumb";
        tb.setAttribute("aria-label", "Ekran görüntüsü " + (g + 1) + ": " + kayit.ad);
        tb.setAttribute("aria-pressed", "false");
        var ti = document.createElement("img");
        ti.setAttribute("src", kayit.src);
        ti.setAttribute("alt", "");
        ti.setAttribute("width", "1920");
        ti.setAttribute("height", "1080");
        ti.setAttribute("loading", "lazy");
        ti.setAttribute("decoding", "async");
        tb.appendChild(ti);
        track.appendChild(tb);
      }
    }

    var slides = Array.prototype.slice.call(stage.querySelectorAll(".gallery-slide"));
    var thumbs = thumbsWrap ? Array.prototype.slice.call(thumbsWrap.querySelectorAll(".thumb")) : [];
    var N = slides.length;
    if (N === 0) return;

    var aktif = 0;

    function render() {
      for (var i = 0; i < N; i++) {
        var pos = (i - aktif + N) % N;
        var s = slides[i];
        s.classList.remove("is-center", "is-left", "is-right");
        if (pos === 0) s.classList.add("is-center");
        else if (pos === 1) s.classList.add("is-right");
        else if (pos === N - 1) s.classList.add("is-left");
        // N > 3 için diğerleri gizli kalır (varsayılan opacity:0)
      }
      for (var t = 0; t < thumbs.length; t++) {
        var secili = t === aktif;
        thumbs[t].classList.toggle("active", secili);
        thumbs[t].setAttribute("aria-pressed", secili ? "true" : "false");
      }
    }

    function adim(delta) {
      aktif = (aktif + delta + N) % N;    // dairesel
      render();
    }

    function git(i) {
      aktif = (i + N) % N;
      render();
    }

    function onizlemeAc(ac) {
      if (!thumbsWrap) return;
      thumbsWrap.classList.toggle("open", ac);
      if (closeBtn) closeBtn.setAttribute("aria-expanded", ac ? "true" : "false");
    }
    function onizlemeDegistir() {
      if (!thumbsWrap) return;
      onizlemeAc(!thumbsWrap.classList.contains("open"));
    }

    // Oklar: SAĞ ok → sağdaki görsel merkeze (+1); SOL ok → soldaki merkeze (-1)
    if (prevBtn) prevBtn.addEventListener("click", function () { adim(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { adim(1); });

    // Sahne tıklama: yan görsel → merkeze al; MERKEZ görsel → büyük görüntüleme
    // (galeri okları yalnızca galeriyi döndürür; lightbox'ı açmaz)
    stage.addEventListener("click", function (e) {
      var s = e.target.closest && e.target.closest(".gallery-slide");
      if (!s) return;
      var idx = slides.indexOf(s);
      if (idx < 0) return;
      if (s.classList.contains("is-center")) lbAc(idx);
      else git(idx);
    });

    // Önizleme seçimi → merkeze geç
    for (var k = 0; k < thumbs.length; k++) {
      (function (idx) {
        thumbs[idx].addEventListener("click", function () { git(idx); });
      })(k);
    }
    if (closeBtn) closeBtn.addEventListener("click", function () { onizlemeAc(false); });

    // Klavye: galeri bölgesi odakta
    gallery.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); adim(-1); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); adim(1); return; }
      if ((e.key === "Enter" || e.key === " ") && e.target === gallery) {
        e.preventDefault(); onizlemeDegistir();
      }
    });

    /* --- Büyük görüntüleme penceresi (lightbox) ---
       Seçili görsel her zaman galerideki aktif görselle aynıdır (senkron):
       lbAdim → adim() → render() galeriyi de çevirir. Kaydırma konumu
       açılırken saklanır, kapatılırca geri yüklenir (body pozisyonu sabitlenir). */
    var lightbox = document.getElementById("lightbox");
    var lbAcik = false;
    var lbY = 0;
    var lbImg = lightbox ? lightbox.querySelector(".lightbox-img") : null;
    var lbBaslik = lightbox ? lightbox.querySelector(".lightbox-title") : null;
    var lbSayac = lightbox ? lightbox.querySelector(".lightbox-count") : null;
    var lbPrev = lightbox ? lightbox.querySelector(".lightbox-prev") : null;
    var lbNext = lightbox ? lightbox.querySelector(".lightbox-next") : null;
    var lbClose = lightbox ? lightbox.querySelector(".lightbox-close") : null;

    function lbGuncelle() {
      if (!lbImg) return;
      var kayit = GALERI[aktif];
      lbImg.setAttribute("src", kayit.src);          // orijinal dosya; kalite düşürme yok
      lbImg.setAttribute("alt", kayit.alt);
      if (lbBaslik) lbBaslik.textContent = kayit.ad;
      if (lbSayac) lbSayac.textContent = (aktif + 1) + " / " + N;
    }
    function lbAc(i) {
      if (!lightbox) return;
      git(i);                                        // galeri de aynı görsele geçer
      lbY = window.scrollY || window.pageYOffset || 0;
      document.body.style.top = (-lbY) + "px";
      document.body.classList.add("lightbox-open");  // sayfa kayması kilitlenir
      lightbox.hidden = false;
      lbAcik = true;
      lbGuncelle();
      if (lbClose) lbClose.focus();                  // odak pencereye geçer
    }
    function lbKapat() {
      if (!lbAcik) return;
      lbAcik = false;
      lightbox.hidden = true;
      document.body.classList.remove("lightbox-open");
      document.body.style.top = "";
      // Kaydırma konumunu anında geri yükle (smooth kaydırma animasyonu olmasın)
      try { window.scrollTo({ top: lbY, behavior: "instant" }); }
      catch (err) { window.scrollTo(0, lbY); }
      if (gallery) gallery.focus();                  // odak galeriye döner
    }
    function lbAdim(d) { adim(d); if (lbAcik) lbGuncelle(); }

    if (lbPrev) lbPrev.addEventListener("click", function () { lbAdim(-1); });
    if (lbNext) lbNext.addEventListener("click", function () { lbAdim(1); });
    if (lbClose) lbClose.addEventListener("click", lbKapat);
    // Karanlık alana tıklama → kapat
    if (lightbox) lightbox.addEventListener("click", function (e) {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute("data-lb-close")) lbKapat();
    });
    // Klavye: açıkken Escape kapatır, sol/sağ ok gezinir, Tab odakta döner
    document.addEventListener("keydown", function (e) {
      if (!lbAcik) return;
      if (e.key === "Escape") { e.preventDefault(); lbKapat(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); lbAdim(1); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); lbAdim(-1); return; }
      if (e.key === "Tab") {
        var dugmeler = [lbClose, lbPrev, lbNext].filter(Boolean);
        var idx = dugmeler.indexOf(document.activeElement);
        e.preventDefault();
        var sira = e.shiftKey
          ? (idx <= 0 ? dugmeler.length - 1 : idx - 1)
          : (idx === dugmeler.length - 1 ? 0 : idx + 1);
        dugmeler[sira].focus();
      }
    });
    // Mobil: sağa/sola parmak kaydırma (swipe) → sonraki/önceki
    var lbX = 0, lbSwipeY = 0;
    if (lightbox) {
      lightbox.addEventListener("touchstart", function (e) {
        if (e.touches.length === 1) { lbX = e.touches[0].clientX; lbSwipeY = e.touches[0].clientY; }
      }, { passive: true });
      lightbox.addEventListener("touchend", function (e) {
        if (!lbAcik || !e.changedTouches || e.changedTouches.length !== 1) return;
        var dx = e.changedTouches[0].clientX - lbX;
        var dy = e.changedTouches[0].clientY - lbSwipeY;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) lbAdim(dx < 0 ? 1 : -1);
      }, { passive: true });
    }

    render();
  }

  /* =========================================================
     6) TIKLAMA PARÇACIK EFEKTİ
     - Yalnızca kullanıcı tıkladığında çalışır; sürekli döngü yok.
     - Parçacıklar pointer-events:none → tıklama/odak/select etkilenmez.
     - Aynı anda en fazla 40 parçacık (sınır aşılırsa eskiler silinir).
     - Dokunmatik cihazda ve prefers-reduced-motion açıkken kapalıdır.
     ========================================================= */
  function initClickSparks() {
    if (prefersReducedMotion()) return;
    // Yalnızca fare/trackpad (dokunmatikte gereksiz titreşim/yük)
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var AZAMI = 40;
    var katman = null;
    var canli = 0;

    function katmanKur() {
      if (katman) return katman;
      katman = document.createElement("div");
      katman.className = "click-sparks";
      katman.setAttribute("aria-hidden", "true");
      document.body.appendChild(katman);
      return katman;
    }

    function parcacikAt(x, y, dx, dy, gecikme) {
      var el = document.createElement("span");
      el.className = "spark";
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.setProperty("--dx", dx + "px");
      el.style.setProperty("--dy", dy + "px");
      if (gecikme) el.style.animationDelay = gecikme + "ms";
      katmanKur().appendChild(el);
      canli++;
      el.addEventListener("animationend", function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        canli--;
      });
    }

    document.addEventListener("click", function (e) {
      // Sınır: aynı anda çok sayıda tıklama geldiğinde efekti atla
      if (canli >= AZAMI) return;
      // Form öğelerinde ve menü içeriğinde etkisiz bırak
      var t = e.target;
      if (t.closest && t.closest("input, select, textarea, .nav-links")) return;

      // Kısa ışık parlaması
      var flash = document.createElement("span");
      flash.className = "spark flash";
      flash.style.left = e.clientX + "px";
      flash.style.top = e.clientY + "px";
      katmanKur().appendChild(flash);
      canli++;
      flash.addEventListener("animationend", function () {
        if (flash.parentNode) flash.parentNode.removeChild(flash);
        canli--;
      });

      // 7 küçük kırmızı parçacık — dışa doğru rastgele dağılır
      var taban = Math.random() * Math.PI * 2;
      for (var i = 0; i < 7; i++) {
        var aci = taban + (i / 7) * Math.PI * 2 + (Math.random() - 0.5);
        var mesafe = 24 + Math.random() * 26;
        parcacikAt(
          e.clientX, e.clientY,
          Math.cos(aci) * mesafe,
          Math.sin(aci) * mesafe,
          Math.random() * 40
        );
      }
    }, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initNavVisibility();
    var pillKont = initNavPill();
    initActiveNav(pillKont);
    initReveal();
    initMagneticButtons();
    initGallery();
    initClickSparks();
  });
})();
