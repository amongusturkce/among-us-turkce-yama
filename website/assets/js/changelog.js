/* Among Us Türkçe — Güncelleme geçmişi arayüzü
   Sol taraftaki listeden sürüm seçilir; sağdaki panel o sürümün detayını gösterir. */

(function () {
  "use strict";

  var surumler = window.AUT_SURUMLER || [];
  var listeEl = document.getElementById("surumListesi");
  var detayEl = document.getElementById("surumDetay");
  var sayacEl = document.getElementById("surumSayisi");
  if (!listeEl || !detayEl) return;

  var ETIKETLER = {
    taslak:     { metin: "Taslak",      sinif: "tag-draft" },
    planlandi:  { metin: "Planlandı",   sinif: "tag-planned" },
    yayinda:    { metin: "Yayında",     sinif: "tag-released" }
  };

  /* --- SVG simgeleri --- */
  function ikonAd(type) {
    if (type === "added") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
    }
    if (type === "fixed") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';
  }

  function ikonTarih() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  }

  function ikonPlatform() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';
  }

  function ikonUyarı() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
  }

  function guvenliMetin(metin) {
    var span = document.createElement("span");
    span.textContent = metin == null ? "" : String(metin);
    return span.innerHTML;
  }

  function listeMadde(liste, tip) {
    if (!liste || !liste.length) return "";
    var madde = "";
    for (var i = 0; i < liste.length; i++) {
      madde += '<li>' + guvenliMetin(liste[i]) + "</li>";
    }
    return (
      '<div class="change-group g-' + tip + '">' +
        "<h3><span class=\"g-icon\">" + ikonAd(tip === "added" ? "added" : tip === "fixed" ? "fixed" : "compat") + "</span>" +
        (tip === "added" ? "Eklenenler" : tip === "fixed" ? "Düzeltmeler" : "Uyumluluk") +
        "</h3>" +
        '<ul class="change-list">' + madde + "</ul>" +
      "</div>"
    );
  }

  /* --- Sürüm listesini çiz --- */
  function listeyiCiz(aktifId) {
    listeEl.innerHTML = "";
    for (var i = 0; i < surumler.length; i++) {
      var s = surumler[i];
      var etiket = ETIKETLER[s.durum] || ETIKETLER.taslak;

      var li = document.createElement("li");
      li.className = "version-item";
      li.setAttribute("role", "presentation");

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "version-btn" + (s.id === aktifId ? " active" : "");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", s.id === aktifId ? "true" : "false");
      btn.setAttribute("data-id", s.id);

      var icerik =
        '<span class="v-top">' +
          '<span class="v-name">' + guvenliMetin(s.ad) + "</span>" +
          '<span class="tag ' + etiket.sinif + '">' + etiket.metin + "</span>" +
        "</span>" +
        '<span class="v-date">' + guvenliMetin(s.tarih) + "</span>" +
        '<span class="v-summary">' + guvenliMetin(s.ozet) + "</span>";

      btn.innerHTML = icerik;
      // Listedeki ilk kayıt en güncel olandır; görsel olarak ayrılır
      if (i === 0) btn.classList.add("is-latest");
      li.appendChild(btn);
      listeEl.appendChild(li);
    }
    if (sayacEl) sayacEl.textContent = surumler.length + " kayıt";
  }

  /* --- Detay panelini çiz --- */
  function detayiCiz(surum) {
    if (!surum) {
      detayEl.innerHTML = "<p>Bu sürüm için detay bulunmuyor.</p>";
      return;
    }
    var etiket = ETIKETLER[surum.durum] || ETIKETLER.taslak;
    var u = surum.uyumluluk || {};

    var uyumlulukMaddeleri = [];
    if (u.platform) uyumlulukMaddeleri.push("Platform: " + u.platform);
    if (u.oyunSurumu) uyumlulukMaddeleri.push("Oyun sürümü: " + u.oyunSurumu);
    if (u.kurulum) uyumlulukMaddeleri.push("Kurulum: " + u.kurulum);
    if (u.bilinenSinirlamalar) uyumlulukMaddeleri.push("Bilinen sınırlamalar: " + u.bilinenSinirlamalar);

    var html =
      '<div class="detail-head fade-in">' +
        "<h2>" + guvenliMetin(surum.ad) + "</h2>" +
        '<span class="tag ' + etiket.sinif + '">' + etiket.metin + "</span>" +
      "</div>" +
      '<div class="detail-meta fade-in">' +
        "<span>" + ikonTarih() + guvenliMetin(surum.tarih) + "</span>" +
        "<span>" + ikonPlatform() + "PC odaklı</span>" +
      "</div>" +
      '<p class="detail-summary fade-in">' + guvenliMetin(surum.ozet) + "</p>" +
      '<div class="fade-in">' +
        listeMadde(surum.eklenenler, "added") +
        listeMadde(surum.duzeltmeler, "fixed") +
        listeMadde(uyumlulukMaddeleri, "compat") +
      "</div>";

    if (surum.durum !== "yayinda") {
      html +=
        '<div class="detail-draft-note fade-in">' + ikonUyarı() +
        "<div><strong>Bu sürüm henüz kesinleşmedi.</strong><br>" +
        guvenliMetin(surum.not || "Yukarıdaki bilgiler taslak/örnek olarak sunulmuştur.") +
        "</div></div>";
    }

    detayEl.innerHTML = html;
  }

  /* --- Seçim --- */
  function sec(id) {
    var secili = null;
    for (var i = 0; i < surumler.length; i++) {
      if (surumler[i].id === id) { secili = surumler[i]; break; }
    }
    if (!secili && surumler.length) secili = surumler[0];
    listeyiCiz(secili ? secili.id : null);
    detayiCiz(secili);
    // Detay paneline yumuşak kaydırma (yalnızca mobil yatay liste durumunda gerekebilir)
  }

  listeEl.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".version-btn") : null;
    if (!btn) return;
    sec(btn.getAttribute("data-id"));
  });

  // Klavye erişimi: liste tuşları
  listeEl.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    var btns = listeEl.querySelectorAll(".version-btn");
    var aktifIndex = -1;
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].classList.contains("active")) { aktifIndex = i; break; }
    }
    var yeni = (e.key === "ArrowDown" || e.key === "ArrowRight") ? aktifIndex + 1 : aktifIndex - 1;
    if (yeni < 0 || yeni >= btns.length) return;
    e.preventDefault();
    btns[yeni].focus();
    sec(btns[yeni].getAttribute("data-id"));
  });

  // İlk yükleme: ilk sürüm seçili gelir
  if (surumler.length) sec(surumler[0].id);
  else detayEl.innerHTML = "<p>Henüz sürüm kaydı eklenmedi.</p>";
})();
