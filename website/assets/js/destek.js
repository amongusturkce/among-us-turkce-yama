/* Among Us Türkçe — Destek formu doğrulaması
   ÖNEMLİ: Bu formun gerçek bir gönderim altyapısı YOKTUR.
   Betik yalnızca alan doğrulaması yapar ve kullanıcıya dürüst bilgi verir;
   mesajı hiçbir yere iletmez, "gönderildi" gibi sahte bir başarı göstermez.
   Gerçek bir servis bağlandığında bu dosyada gönderim kısmı açılacaktır. */

(function () {
  "use strict";

  var form = document.getElementById("destekForm");
  if (!form) return;

  var durumEl = document.getElementById("formDurum");
  var mesajEl = document.getElementById("mesaj");
  var sayacEl = document.getElementById("mesajSayac");
  var AZAMI_MESAJ = 5000;

  /* --- Karakter sayacı --- */
  if (mesajEl && sayacEl) {
    mesajEl.addEventListener("input", function () {
      sayacEl.textContent = mesajEl.value.length + " / " + AZAMI_MESAJ;
    });
  }

  /* --- Alan hataları --- */
  function hataGoster(id, metin) {
    var alan = document.getElementById(id);
    var hata = document.getElementById(id + "Error");
    if (alan) alan.setAttribute("aria-invalid", metin ? "true" : "false");
    if (hata) {
      if (metin) { hata.textContent = metin; hata.hidden = false; }
      else { hata.textContent = ""; hata.hidden = true; }
    }
  }

  function durumGoster(metin, hataMi) {
    if (!durumEl) return;
    durumEl.textContent = metin;
    durumEl.classList.toggle("is-error", !!hataMi);
    durumEl.hidden = !metin;
  }

  var epostaDeseni = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function dogrula() {
    var ilkHata = null;

    var ad = document.getElementById("ad");
    var adDeger = ad ? ad.value.trim() : "";
    if (!adDeger) { hataGoster("ad", "Lütfen adını yaz."); ilkHata = ilkHata || ad; }
    else if (adDeger.length < 2) { hataGoster("ad", "Ad en az 2 karakter olmalı."); ilkHata = ilkHata || ad; }
    else hataGoster("ad", "");

    var eposta = document.getElementById("eposta");
    var epostaDeger = eposta ? eposta.value.trim() : "";
    if (!epostaDeger) { hataGoster("eposta", "Lütfen bir e-posta adresi yaz."); ilkHata = ilkHata || eposta; }
    else if (!epostaDeseni.test(epostaDeger)) { hataGoster("eposta", "Geçerli bir e-posta adresi değil."); ilkHata = ilkHata || eposta; }
    else hataGoster("eposta", "");

    var konu = document.getElementById("konu");
    if (!konu || !konu.value) { hataGoster("konu", "Lütfen bir konu seç."); ilkHata = ilkHata || konu; }
    else hataGoster("konu", "");

    var mesaj = document.getElementById("mesaj");
    var mesajDeger = mesaj ? mesaj.value.trim() : "";
    if (!mesajDeger) { hataGoster("mesaj", "Lütfen mesajını yaz."); ilkHata = ilkHata || mesaj; }
    else if (mesajDeger.length < 10) { hataGoster("mesaj", "Mesaj biraz daha açıklayıcı olabilir (en az 10 karakter)."); ilkHata = ilkHata || mesaj; }
    else if (mesaj.value.length > AZAMI_MESAJ) { hataGoster("mesaj", "Mesaj çok uzun; en fazla " + AZAMI_MESAJ + " karakter."); ilkHata = ilkHata || mesaj; }
    else hataGoster("mesaj", "");

    return ilkHata;
  }

  // Kullanıcı yazdıkça o alanın hatasını temizle
  form.addEventListener("input", function (e) {
    if (e.target && e.target.id) hataGoster(e.target.id, "");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var ilkHata = dogrula();
    if (ilkHata) {
      durumGoster("Formda eksik ya da hatalı alanlar var; işaretli yerleri kontrol et.", true);
      if (ilkHata.focus) ilkHata.focus();
      return;
    }

    /* Gönderim altyapısı yok → sahte başarı gösterilmez.
       Kullanıcıya durumun kendisi dürüstçe anlatılır. */
    durumGoster(
      "Form doğrulamayı geçti, ancak gönderim altyapısı henüz bağlanmadı — " +
      "mesajın şu anda hiçbir yere iletilmedi. Bağlantılar için " +
      "Telegram topluluğunu kullanabilirsin: t.me/amongusturkce",
      false
    );
  });
})();
