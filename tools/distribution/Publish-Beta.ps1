#requires -Version 5.1
<#
    ATR - Beta dagitim araci.

    Dogrulanmis aday paketleri BETA kanalina yayimlar.

    Tasarim kurallari:
      - Yalnizca BETA kanalina yazar; STABLE kanalina ASLA dokunmaz.
      - Paket SHA-256 ve boyutu yuklemeden ONCE dogrulanir.
      - ZIP icerigi manifestteki dosya listesiyle birebir karsilastirilir.
      - Manifest yalnizca yukleme + geri indirme dogrulamasi basariliysa guncellenir.
      - Ayni surum etiketinin uzerine yazilmaz.
      - Hata halinde onceki beta manifesti korunur, yarim paket klasoru temizlenir.
      - Token/anahtar koda gomulmez; GitHub icin gh CLI oturumu kullanilir.

    Kullanim:
      # Dogrulama (hicbir sey yazmaz)
      .\Publish-Beta.ps1 -Dene

      # Yerel siteye yayin (paketler website/updates/beta/packages/<etiket>/)
      .\Publish-Beta.ps1 -Onayla

      # GitHub Releases'e yayin (gh CLI oturumu gerekir)
      .\Publish-Beta.ps1 -GitHub -Onayla

      # Yalnizca belirli platformlar
      .\Publish-Beta.ps1 -Platform epic -Dene
#>
[CmdletBinding()]
param(
    [string[]]$Platform = @(),
    [ValidateSet('beta')]
    [string]$Kanal = 'beta',
    [string]$Etiket = '',
    [string]$YerelHedef = '',
    [switch]$Dene,
    [switch]$Onayla,
    [switch]$GitHub,
    [switch]$GitPush,
    [ValidateSet('', 'yukleme', 'dogrulama', 'manifest')]
    [string]$HataEnjeksiyonu = '',
    [string]$Yapilandirma = ''
)

$ErrorActionPreference = 'Stop'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue

$script:Kok = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $Yapilandirma) { $Yapilandirma = Join-Path $PSScriptRoot 'config\distribution.json' }

function Yaz([string]$Metin = '', [string]$Renk = '') {
    if ($Renk) { Write-Host $Metin -ForegroundColor $Renk } else { Write-Host $Metin }
}

function Fail([string]$Mesaj) {
    Write-Host "[HATA] $Mesaj" -ForegroundColor Red
    exit 1
}

function Get-Sha256([string]$Yol) {
    return (Get-FileHash -LiteralPath $Yol -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Read-Json([string]$Yol) {
    $ham = Get-Content -LiteralPath $Yol -Raw -Encoding UTF8
    $ham = $ham.TrimStart([char]0xFEFF)
    return ($ham | ConvertFrom-Json)
}

function Write-JsonAtomik([string]$Yol, $Nesne) {
    $d = Split-Path -Parent $Yol
    if (-not (Test-Path -LiteralPath $d)) { $null = New-Item -ItemType Directory -Force -Path $d }
    $g = Join-Path $d ('.' + [IO.Path]::GetFileName($Yol) + '.' + [guid]::NewGuid().ToString('N') + '.tmp')
    $metin = ($Nesne | ConvertTo-Json -Depth 20)
    $enc = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($g, $metin + "`n", $enc)
    # Yazilan JSON tekrar okunabiliyor mu?
    $null = Read-Json $g
    Move-Item -LiteralPath $g -Destination $Yol -Force
}

function Get-StreamSha256($Akis) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $b = $sha.ComputeHash($Akis)
        return (($b | ForEach-Object { $_.ToString('x2') }) -join '')
    } finally { $sha.Dispose() }
}

function Get-ZipUyeleri([string]$ZipYolu) {
    $zip = [IO.Compression.ZipFile]::OpenRead($ZipYolu)
    try {
        $sonuc = @{}
        foreach ($e in $zip.Entries) {
            if ($e.FullName.EndsWith('/')) { continue }
            $ad = $e.FullName -replace '\\', '/'
            $s = $e.Open()
            try { $sonuc[$ad] = Get-StreamSha256 $s } finally { $s.Dispose() }
        }
        return $sonuc
    } finally { $zip.Dispose() }
}

function Get-Boyut([long]$Bayt) {
    if ($Bayt -ge 1GB) { return ('{0:N2} GB' -f ($Bayt / 1GB)) }
    if ($Bayt -ge 1MB) { return ('{0:N1} MB' -f ($Bayt / 1MB)) }
    return ('{0:N0} KB' -f ($Bayt / 1KB))
}

# ------------------------------------------------------------------ yapilandirma

if (-not (Test-Path -LiteralPath $Yapilandirma)) { Fail "Yapilandirma bulunamadi: $Yapilandirma" }
$ayar = Read-Json $Yapilandirma
$siteKok = if ($YerelHedef) { $YerelHedef } else { [string]$ayar.site.kok }
if (-not [IO.Path]::IsPathRooted($siteKok)) { $siteKok = Join-Path $script:Kok $siteKok }
$betaKok = Join-Path $siteKok ([string]$ayar.site.guncelleme_klasoru + '\beta')
$stableYol = Join-Path $siteKok ([string]$ayar.site.guncelleme_klasoru + '\stable\latest.json')

if (-not [bool]$ayar.kanallar.beta.acik) { Fail 'Beta kanali yapilandirmada kapali.' }
if ([bool]$ayar.kanallar.stable.acik) {
    Fail 'Guvenlik: Stable kanali bu aracla acik olamaz. Stable yalnizca ayri ve acik bir yayin sureciyle guncellenir.'
}

$platformlar = @()
if ($Platform.Count -gt 0) {
    foreach ($p in $Platform) {
        if (-not $ayar.platformlar.PSObject.Properties[$p]) { Fail "Bilinmeyen platform: $p" }
        $platformlar += $p
    }
} else {
    foreach ($p in $ayar.platformlar.PSObject.Properties.Name) {
        $tanim = $ayar.platformlar.$p
        if ($tanim.aday) { $platformlar += $p }
        elseif ($p -eq 'steam') { Yaz ("  [ATLANDI] {0}: aday paket yok (sahte girdi olusturulmaz)." -f $p) 'Yellow' }
    }
}
if ($platformlar.Count -eq 0) { Fail 'Yayinlanacak platform bulunamadi (aday paket yok).' }

$kanal = 'beta'
$urunAd = [string]$ayar.urun.ad
$urunEtiket = [string]$ayar.urun.surum_etiketi
$minimumAtr = [string]$ayar.minimum_atr

Yaz ''
Yaz '==============================================================' 'Cyan'
Yaz ("  ATR Beta Dagitim  |  {0} {1}" -f $urunAd, $urunEtiket) 'Cyan'
Yaz ("  Kanal: {0}   Mod: {1}" -f $kanal, $(if ($GitHub) { 'GitHub Releases' } else { 'Yerel site' })) 'Cyan'
Yaz '==============================================================' 'Cyan'

# ------------------------------------------------------------------ paket dogrulama

$yeniPaketler = @()
$teknikSurum = $null
$notlar = @()
$oyunSurumleri = New-Object System.Collections.Generic.List[string]
$tempDosyalar = @()

foreach ($kod in $platformlar) {
    $tanim = $ayar.platformlar.$kod
    $adayKok = [string]$tanim.aday
    if (-not [IO.Path]::IsPathRooted($adayKok)) { $adayKok = Join-Path $script:Kok $adayKok }
    $manifestYolu = Join-Path $adayKok ([string]$tanim.manifest)
    if (-not (Test-Path -LiteralPath $manifestYolu)) { Fail "Aday manifest bulunamadi: $manifestYolu" }

    $m = Read-Json $manifestYolu
    if ([int]$m.semasi -ne 1) { Fail "Desteklenmeyen manifest semasi ($kod): $($m.semasi)" }
    if (-not $m.paketler) { Fail "Aday manifestte paket yok: $manifestYolu" }
    $p = @($m.paketler | Where-Object { [string]$_.platform -eq $kod })
    if ($p.Count -ne 1) { Fail ("{0}: manifestte tam olarak bir '{1}' paketi bekleniyordu, bulunan: {2}" -f $kod, $kod, $p.Count) }
    $p = $p[0]

    if ($teknikSurum -and [string]$m.yama.surum -ne $teknikSurum) {
        Fail ("Platformlarin teknik paket surumu ayni olmali: {0} != {1}" -f $teknikSurum, $m.yama.surum)
    }
    $teknikSurum = [string]$m.yama.surum
    if ($m.yama.notlar) { $notlar += [string]$m.yama.notlar }
    foreach ($s in @($m.oyun.surumler)) { if (-not $oyunSurumleri.Contains([string]$s)) { $oyunSurumleri.Add([string]$s) } }

    $zipAdi = [string]$p.dosya
    if (-not $zipAdi) { Fail "${kod}: paket dosya adi yok." }
    $zipYol = Join-Path $adayKok $zipAdi
    if (-not (Test-Path -LiteralPath $zipYol -PathType Leaf)) { Fail "Paket ZIP bulunamadi: $zipYol" }
    $gercekBoyut = (Get-Item -LiteralPath $zipYol).Length
    if ($gercekBoyut -ne [long]$p.boyut) { Fail ("{0}: boyut uyusmuyor (manifest {1}, disk {2})." -f $kod, $p.boyut, $gercekBoyut) }
    $gercekSha = Get-Sha256 $zipYol
    if ($gercekSha -ne ([string]$p.sha256).ToLowerInvariant()) { Fail ("{0}: SHA-256 uyusmuyor (manifest {1}, disk {2})." -f $kod, $p.sha256, $gercekSha) }

    # ZIP icerigi manifestteki dosya listesiyle birebir olmali.
    $uyeler = Get-ZipUyeleri $zipYol
    $beklenen = @($p.dosyalar)
    if ($beklenen.Count -eq 0) { Fail "${kod}: paket dosya listesi bos." }
    if ($uyeler.Count -ne $beklenen.Count) {
        Fail ("{0}: ZIP uye sayisi uyusmuyor (manifest {1}, ZIP {2})." -f $kod, $beklenen.Count, $uyeler.Count)
    }
    foreach ($d in $beklenen) {
        $py = [string]$d.paket_yolu
        if (-not $py) { $py = [string]$d.hedef }
        if (-not $uyeler.ContainsKey($py)) { Fail ("{0}: ZIP icinde dosya yok: {1}" -f $kod, $py) }
        if ($uyeler[$py] -ne ([string]$d.sha256).ToLowerInvariant()) {
            Fail ("{0}: ZIP icerigi manifest ile uyusmuyor: {1}" -f $kod, $py)
        }
    }

    Yaz ("  [OK] {0}: {1} | {2} | {3}" -f $kod, $zipAdi, (Get-Boyut $gercekBoyut), $gercekSha.Substring(0, 16)) 'Green'
    $yeniPaketler += [pscustomobject]@{
        kod = $kod
        ad = [string]$tanim.ad
        dosya = $zipAdi
        yol = $zipYol
        boyut = $gercekBoyut
        sha256 = $gercekSha
        dosyalar = $beklenen
        oyun_surumleri = @($p.oyun_surumleri)
        notlar = $(if ($p.notlar) { [string]$p.notlar } elseif ($m.yama.notlar) { [string]$m.yama.notlar } else { '' })
    }
}

if (-not $teknikSurum) { Fail 'Teknik paket surumu belirlenemedi.' }

# ------------------------------------------------------------------ etiket

$simdi = Get-Date
if ($Etiket) {
    if ($Etiket -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$') { Fail "Gecersiz etiket: $Etiket" }
    $etiket = $Etiket
} else {
    $etiket = ('{0}-beta.{1}' -f $teknikSurum, $simdi.ToString('yyyyMMddTHHmmss'))
}

$oncekiManifestYolu = Join-Path $betaKok 'latest.json'
$oncekiManifest = $null
if (Test-Path -LiteralPath $oncekiManifestYolu) {
    try { $oncekiManifest = Read-Json $oncekiManifestYolu } catch { $oncekiManifest = $null }
}

# Ayni etiketin uzerine yazma.
if (Test-Path -LiteralPath (Join-Path $betaKok ('packages\' + $etiket))) {
    Fail "Bu etiket zaten yayinlanmis (yerel): $etiket"
}
if ($GitHub) {
    $ghCmd = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $ghCmd) {
        Fail 'GitHub modu icin gh CLI gerekli. Kurulum: winget install --id GitHub.cli  (ayrintili adimlar tools/distribution/README.md).'
    }
    $owner = [string]$ayar.github.owner
    $repo = [string]$ayar.github.repo
    if (-not $owner -or -not $repo) {
        Fail 'GitHub deposu yapilandirilmamis (config/distribution.json -> github.owner/repo).'
    }
    # gh, basarisiz kontrollerde stderr'e yazar; bu normaldir ve hata sayilmamali.
    $eap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & gh auth status *> $null
        $authOk = ($LASTEXITCODE -eq 0)
        $etiketVar = $false
        if ($authOk) {
            & gh release view $etiket --repo "$owner/$repo" *> $null
            $etiketVar = ($LASTEXITCODE -eq 0)
        }
    } finally { $ErrorActionPreference = $eap }
    if (-not $authOk) {
        Fail 'gh CLI oturumu yok. Once "gh auth login" calistirin.'
    }
    if ($etiketVar) { Fail "Bu etiket GitHub'da zaten var: $etiket" }
}

# ------------------------------------------------------------------ manifest

$paketKayitlari = @()
foreach ($p in $yeniPaketler) {
    $url = if ($GitHub) {
        ('https://github.com/{0}/{1}/releases/download/{2}/{3}' -f $ayar.github.owner, $ayar.github.repo, $etiket, $p.dosya)
    } else {
        ('packages/{0}/{1}' -f $etiket, $p.dosya)
    }
    $paketKayitlari += [pscustomobject][ordered]@{
        platform = $p.kod
        platform_adi = $p.ad
        oyun_surumleri = @($p.oyun_surumleri)
        dosya = $p.dosya
        url = $url
        boyut = [long]$p.boyut
        sha256 = $p.sha256
        tarih = $simdi.ToString('yyyy-MM-dd')
        notlar = $p.notlar
        dosyalar = @($p.dosyalar)
    }
}

# Onceki beta manifestindeki diger platformlari koru (ayni teknik surumse).
$korunan = @()
if ($oncekiManifest -and -not [bool]$oncekiManifest.kilitli -and [string]$oncekiManifest.yama.surum -eq $teknikSurum) {
    foreach ($op in @($oncekiManifest.paketler)) {
        if ($platformlar -contains [string]$op.platform) { continue }
        $korunan += $op
    }
    foreach ($os in @($oncekiManifest.oyun.surumler)) {
        if (-not $oyunSurumleri.Contains([string]$os)) { $oyunSurumleri.Add([string]$os) }
    }
}

$birlesikPaketler = @($paketKayitlari) + @($korunan)

$manifest = [pscustomobject][ordered]@{
    semasi = 1
    urun = [pscustomobject][ordered]@{ ad = $urunAd; surum_etiketi = $urunEtiket }
    kanal = 'beta'
    kilitli = $false
    yama = [pscustomobject][ordered]@{
        surum = $teknikSurum
        tarih = $simdi.ToString('yyyy-MM-dd')
        notlar = (($notlar | Select-Object -Unique) -join ' ')
        minimum_atr = $minimumAtr
    }
    oyun = [pscustomobject][ordered]@{ surumler = @($oyunSurumleri) }
    beta = [pscustomobject][ordered]@{
        etiket = $etiket
        yayin = $simdi.ToString('o')
    }
    paketler = $birlesikPaketler
}

Yaz ''
Yaz ("  Etiket          : {0}" -f $etiket)
Yaz ("  Teknik surum    : {0}" -f $teknikSurum)
Yaz ("  Urun etiketi    : {0}" -f $urunEtiket)
Yaz ("  Platformlar     : {0}" -f (($birlesikPaketler | ForEach-Object { $_.platform }) -join ', '))
Yaz ("  Oyun surumleri  : {0}" -f (($oyunSurumleri) -join ', '))
Yaz ("  Toplam boyut    : {0}" -f (Get-Boyut (($yeniPaketler | Measure-Object -Property boyut -Sum).Sum)))
Yaz ''

if ($Dene) {
    Yaz '[DENEME] Hicbir dosya yazilmadi, hicbir sey yuklenmedi. Dogrulama gecti.' 'Yellow'
    exit 0
}

if (-not $Onayla) {
    Fail 'Gercek yayin icin -Onayla ekleyin (once -Dene ile deneyin).'
}

# ------------------------------------------------------------------ stable korumasi

$stableOnce = $null
if (Test-Path -LiteralPath $stableYol) { $stableOnce = [IO.File]::ReadAllBytes($stableYol) }

$basarili = $false
$paketKlasoru = $null
$olusturulanPaketKlasoru = $false

try {
    if ($GitHub) {
        # --- GitHub Releases
        $notDosyasi = Join-Path $env:TEMP ('atr-beta-not-' + [guid]::NewGuid().ToString('N') + '.md')
        $icik = @()
        $icik += "# $urunAd $urunEtiket (beta)"
        $icik += ''
        $icik += "Teknik paket surumu: ``$teknikSurum``"
        $icik += ''
        foreach ($p in $yeniPaketler) {
            $icik += "## $($p.ad)"
            $icik += ''
            $icik += "- Dosya: ``$($p.dosya)``"
            $icik += "- Boyut: $($p.boyut) bayt"
            $icik += "- SHA-256: ``$($p.sha256)``"
            $icik += ''
        }
        Set-Content -LiteralPath $notDosyasi -Value ($icik -join "`n") -Encoding UTF8
        $tempDosyalar += $notDosyasi

        $argumanlar = @('release', 'create', $etiket, '--repo', "$($ayar.github.owner)/$($ayar.github.repo)",
            '--prerelease', '--title', "$urunAd $urunEtiket ($etiket)", '--notes-file', $notDosyasi)
        foreach ($p in $yeniPaketler) { $argumanlar += $p.yol }
        Yaz '  [..] GitHub Release olusturuluyor ve paketler yukleniyor...'
        $eap = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try { & gh @argumanlar } finally { $ErrorActionPreference = $eap }
        if ($LASTEXITCODE -ne 0) { throw "GitHub Release olusturulamadi (gh kodu $LASTEXITCODE)." }

        if ($HataEnjeksiyonu -eq 'yukleme') { throw 'Hata enjeksiyonu: yukleme asamasi.' }

        # Yukleme sonrasi gercek indirme ile dogrulama.
        $dogrulamaKok = Join-Path $env:TEMP ('atr-beta-dogrula-' + [guid]::NewGuid().ToString('N'))
        $null = New-Item -ItemType Directory -Force -Path $dogrulamaKok
        $tempDosyalar += $dogrulamaKok
        foreach ($p in $yeniPaketler) {
            $eap = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            try {
                & gh release download $etiket --repo "$($ayar.github.owner)/$($ayar.github.repo)" --dir $dogrulamaKok --pattern $p.dosya --clobber
            } finally { $ErrorActionPreference = $eap }
            if ($LASTEXITCODE -ne 0) { throw "Release varligi indirilemedi: $($p.dosya)" }
            $in = Join-Path $dogrulamaKok $p.dosya
            if ((Get-Item -LiteralPath $in).Length -ne $p.boyut) { throw "Indirilen boyut uyusmuyor: $($p.dosya)" }
            if ((Get-Sha256 $in) -ne $p.sha256) { throw "Indirilen SHA-256 uyusmuyor: $($p.dosya)" }
            Yaz ("  [OK] Sunucudan indirildi ve dogrulandi: {0}" -f $p.dosya) 'Green'
        }
        if ($HataEnjeksiyonu -eq 'dogrulama') { throw 'Hata enjeksiyonu: dogrulama asamasi.' }

        $betaKok = Join-Path $siteKok ([string]$ayar.site.guncelleme_klasoru + '\beta')
    } else {
        # --- Yerel site
        $paketKlasoru = Join-Path $betaKok ('packages\' + $etiket)
        if (-not (Test-Path -LiteralPath $paketKlasoru)) {
            $null = New-Item -ItemType Directory -Force -Path $paketKlasoru
            $olusturulanPaketKlasoru = $true
        }
        foreach ($p in $yeniPaketler) {
            $hedef = Join-Path $paketKlasoru $p.dosya
            Copy-Item -LiteralPath $p.yol -Destination $hedef -Force
            if ((Get-Item -LiteralPath $hedef).Length -ne $p.boyut) { throw "Kopya boyutu uyusmuyor: $($p.dosya)" }
            if ((Get-Sha256 $hedef) -ne $p.sha256) { throw "Kopya SHA-256 uyusmuyor: $($p.dosya)" }
            Yaz ("  [OK] Yerel depoya kopyalandi ve dogrulandi: {0}" -f $p.dosya) 'Green'
        }
        if ($HataEnjeksiyonu -eq 'yukleme') { throw 'Hata enjeksiyonu: yukleme asamasi.' }
        if ($HataEnjeksiyonu -eq 'dogrulama') { throw 'Hata enjeksiyonu: dogrulama asamasi.' }
    }

    if ($HataEnjeksiyonu -eq 'manifest') { throw 'Hata enjeksiyonu: manifest asamasi.' }

    # --- Once tam manifest anlik goruntusu (geri alma icin), sonra yayindaki manifest.
    $gecmisKlasoru = Join-Path $betaKok 'history'
    Write-JsonAtomik (Join-Path $gecmisKlasoru ($etiket + '.json')) $manifest

    # --- Manifest yalnizca basarili yukleme + dogrulamadan sonra yazilir.
    Write-JsonAtomik $oncekiManifestYolu $manifest

    # Surum gecmisi (releases.json)
    $gecmisYolu = Join-Path $betaKok 'releases.json'
    $gecmis = @()
    if (Test-Path -LiteralPath $gecmisYolu) {
        try { $gecmis = @((Read-Json $gecmisYolu).surumler) } catch { $gecmis = @() }
    }
    $gecmis = @($gecmis | Where-Object { [string]$_.etiket -ne $etiket })
    $gecmis = @([pscustomobject][ordered]@{
        etiket = $etiket
        tarih = $simdi.ToString('o')
        teknik_surum = $teknikSurum
        urun_etiketi = $urunEtiket
        paketler = @($yeniPaketler | ForEach-Object {
            [pscustomobject][ordered]@{ platform = $_.kod; dosya = $_.dosya; boyut = $_.boyut; sha256 = $_.sha256 }
        })
    }) + $gecmis
    Write-JsonAtomik $gecmisYolu ([pscustomobject][ordered]@{ semasi = 1; kanal = 'beta'; surumler = @($gecmis) })

    $basarili = $true
} catch {
    $mesaj = $_.Exception.Message
    Yaz ''
    Yaz ("[HATA] Beta yayini tamamlanmadi: {0}" -f $mesaj) 'Red'
    if ($olusturulanPaketKlasoru -and $paketKlasoru -and (Test-Path -LiteralPath $paketKlasoru)) {
        Remove-Item -LiteralPath $paketKlasoru -Recurse -Force -ErrorAction SilentlyContinue
        Yaz '        Yarim kalan paket klasoru temizlendi.' 'Yellow'
    }
    Yaz '        Onceki beta manifesti degistirilmedi.' 'Yellow'
} finally {
    foreach ($t in $tempDosyalar) {
        if (Test-Path -LiteralPath $t) { Remove-Item -LiteralPath $t -Recurse -Force -ErrorAction SilentlyContinue }
    }
    # Stable kanali bu arac tarafindan degistirilemez.
    if ($null -ne $stableOnce) {
        $stableSonra = [IO.File]::ReadAllBytes($stableYol)
        if ([Convert]::ToBase64String($stableOnce) -ne [Convert]::ToBase64String($stableSonra)) {
            [IO.File]::WriteAllBytes($stableYol, $stableOnce)
            Yaz '[HATA] Stable manifesti degismisti; geri yuklendi.' 'Red'
            $basarili = $false
        }
    }
}

if (-not $basarili) { exit 1 }

# ------------------------------------------------------------------ rapor

$manifestYolu = $oncekiManifestYolu
Yaz ''
Yaz '[OK] Beta yayini tamamlandi.' 'Green'
Yaz ("  Manifest : {0}" -f $manifestYolu)
Yaz ("  Gecmis   : {0}" -f (Join-Path $betaKok 'releases.json'))
foreach ($p in $paketKayitlari) {
    Yaz ("  {0,-6} {1}" -f $p.platform, $p.url)
}
Yaz ("  Urun     : {0} {1}  (teknik {2})" -f $urunAd, $urunEtiket, $teknikSurum)
if (-not $GitHub) {
    Yaz ("  Yerel taban: {0}" -f $betaKok)
}
Yaz ''
Yaz 'Dogrulama: ATR -Kanal beta -Dene  veya  powershell -File tools/distribution/Test-Distribution.ps1' 'Cyan'
exit 0
