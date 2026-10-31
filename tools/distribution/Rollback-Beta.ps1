#requires -Version 5.1
<#
    ATR - Beta kanali geri alma araci.

    Daha once yayinlanmis bir beta surumunun tam manifest anlik goruntusunu
    (website/updates/beta/history/<etiket>.json) tekrar yayina alir.
    Boylece hatali bir beta dagitiminda onceki beta surumune donulebilir.

    Kurallar:
      - Yalnizca BETA kanalina dokunur; STABLE kanali korunur.
      - Paket dosyalari gercekten duruyor ve SHA-256 tutuyor mu diye kontrol eder.
      - Onceki surumlerin paketleri SILINMEZ.
      - Her geri alma, releases.json icine islenir.

    Kullanim:
      # Mevcut surumden bir onceki betaya don (deneme)
      .\Rollback-Beta.ps1 -Dene

      # Belirli bir etikete don
      .\Rollback-Beta.ps1 -Etiket 2.4.0-beta.20261031T061500 -Dene

      # Gercek geri alma
      .\Rollback-Beta.ps1 -Etiket <etiket> -Onayla
#>
[CmdletBinding()]
param(
    [string]$Etiket = '',
    [switch]$Dene,
    [switch]$Onayla,
    [string]$YerelHedef = '',
    [string]$Yapilandirma = ''
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

$script:Kok = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $Yapilandirma) { $Yapilandirma = Join-Path $PSScriptRoot 'config\distribution.json' }

function Yaz([string]$M = '', [string]$R = '') { if ($R) { Write-Host $M -ForegroundColor $R } else { Write-Host $M } }
function Fail([string]$M) { Write-Host "[HATA] $M" -ForegroundColor Red; exit 1 }
function Get-Sha256([string]$Y) { return (Get-FileHash -LiteralPath $Y -Algorithm SHA256).Hash.ToLowerInvariant() }
function Read-Json([string]$Y) { $h = Get-Content -LiteralPath $Y -Raw -Encoding UTF8; return ($h.TrimStart([char]0xFEFF) | ConvertFrom-Json) }
function Write-JsonAtomik([string]$Y, $N) {
    $d = Split-Path -Parent $Y
    if (-not (Test-Path -LiteralPath $d)) { $null = New-Item -ItemType Directory -Force -Path $d }
    $g = Join-Path $d ('.' + [IO.Path]::GetFileName($Y) + '.' + [guid]::NewGuid().ToString('N') + '.tmp')
    $enc = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($g, (($N | ConvertTo-Json -Depth 20) + "`n"), $enc)
    $null = Read-Json $g
    Move-Item -LiteralPath $g -Destination $Y -Force
}

if (-not (Test-Path -LiteralPath $Yapilandirma)) { Fail "Yapilandirma bulunamadi: $Yapilandirma" }
$ayar = Read-Json $Yapilandirma
$siteKok = if ($YerelHedef) { $YerelHedef } else { [string]$ayar.site.kok }
if (-not [IO.Path]::IsPathRooted($siteKok)) { $siteKok = Join-Path $script:Kok $siteKok }
$betaKok = Join-Path $siteKok ([string]$ayar.site.guncelleme_klasoru + '\beta')
$stableYol = Join-Path $siteKok ([string]$ayar.site.guncelleme_klasoru + '\stable\latest.json')
$latestYol = Join-Path $betaKok 'latest.json'
$gecmisKlasoru = Join-Path $betaKok 'history'
$gecmisYolu = Join-Path $betaKok 'releases.json'

if (-not (Test-Path -LiteralPath $latestYol)) { Fail "Beta manifesti yok: $latestYol" }
$mevcut = Read-Json $latestYol
$mevcutEtiket = if ($mevcut.PSObject.Properties['beta'] -and $mevcut.beta.etiket) { [string]$mevcut.beta.etiket } else { '' }

if (-not (Test-Path -LiteralPath $gecmisKlasoru)) { Fail 'Geri alinacak surum gecmisi yok (history/ bos).' }
$adaylar = @(Get-ChildItem -LiteralPath $gecmisKlasoru -Filter '*.json' -File | Sort-Object LastWriteTime -Descending)

if ($Etiket) {
    $secim = $adaylar | Where-Object { [IO.Path]::GetFileNameWithoutExtension($_.Name) -eq $Etiket } | Select-Object -First 1
    if (-not $secim) { Fail "Gecmiste bu etiket yok: $Etiket" }
} else {
    $secim = $adaylar | Where-Object { [IO.Path]::GetFileNameWithoutExtension($_.Name) -ne $mevcutEtiket } | Select-Object -First 1
    if (-not $secim) { Fail 'Geri alinacak onceki surum bulunamadi.' }
}

$hedef = Read-Json $secim.FullName
if (-not $hedef.paketler -or @($hedef.paketler).Count -eq 0) { Fail "Gecmis kaydinda paket yok: $($secim.Name)" }

$sorun = 0
foreach ($p in @($hedef.paketler)) {
    $url = [string]$p.url
    if ($url -match '^https?://') {
        Yaz ("  [BILGI] Uzak paket (varligi varsayildi): {0}" -f $url) 'Yellow'
        continue
    }
    $yerel = Join-Path $betaKok ($url -replace '/', '\')
    if (-not (Test-Path -LiteralPath $yerel -PathType Leaf)) {
        Yaz ("  [HATA] Paket bulunamadi: {0}" -f $url) 'Red'; $sorun++; continue
    }
    if ((Get-Item -LiteralPath $yerel).Length -ne [long]$p.boyut) { Yaz ("  [HATA] Boyut uyusmuyor: {0}" -f $url) 'Red'; $sorun++; continue }
    if ((Get-Sha256 $yerel) -ne ([string]$p.sha256).ToLowerInvariant()) { Yaz ("  [HATA] SHA-256 uyusmuyor: {0}" -f $url) 'Red'; $sorun++; continue }
    Yaz ("  [OK] Paket dogrulandi: {0}" -f [IO.Path]::GetFileName($yerel)) 'Green'
}
if ($sorun -gt 0) { Fail 'Geri alma durduruldu: paket dogrulamasi basarisiz.' }

Yaz ''
Yaz ("  Mevcut beta : {0}" -f $(if ($mevcutEtiket) { $mevcutEtiket } else { '(bilinmiyor)' }))
Yaz ("  Hedef beta  : {0}" -f [string]$hedef.beta.etiket)
Yaz ("  Teknik surum: {0}" -f [string]$hedef.yama.surum)
Yaz ("  Paketler    : {0}" -f ((@($hedef.paketler) | ForEach-Object { $_.platform }) -join ', '))
Yaz ''

if ($Dene) { Yaz '[DENEME] Hicbir dosya yazilmadi.' 'Yellow'; exit 0 }
if (-not $Onayla) { Fail 'Gercek geri alma icin -Onayla ekleyin (once -Dene ile deneyin).' }

$stableOnce = $null
if (Test-Path -LiteralPath $stableYol) { $stableOnce = [IO.File]::ReadAllBytes($stableYol) }

try {
    $yeni = ($hedef | ConvertTo-Json -Depth 20 | ConvertFrom-Json)
    $yeni | Add-Member -NotePropertyName geri_alindi -NotePropertyValue $true -Force
    $yeni | Add-Member -NotePropertyName geri_alma_tarihi -NotePropertyValue ((Get-Date).ToString('o')) -Force
    $yeni | Add-Member -NotePropertyName onceki_etiket -NotePropertyValue $mevcutEtiket -Force
    Write-JsonAtomik $latestYol $yeni

    if (Test-Path -LiteralPath $gecmisYolu) {
        try {
            $g = Read-Json $gecmisYolu
            $liste = @($g.surumler)
            $liste = @([pscustomobject][ordered]@{
                etiket = [string]$hedef.beta.etiket
                tarih = (Get-Date).ToString('o')
                teknik_surum = [string]$hedef.yama.surum
                urun_etiketi = if ($hedef.PSObject.Properties['urun']) { [string]$hedef.urun.surum_etiketi } else { '' }
                geri_alindi = $true
                paketler = @()
            }) + $liste
            Write-JsonAtomik $gecmisYolu ([pscustomobject][ordered]@{ semasi = 1; kanal = 'beta'; surumler = @($liste) })
        } catch { Yaz '  [UYARI] releases.json guncellenemedi (manifest yine de geri alindi).' 'Yellow' }
    }
} finally {
    if ($null -ne $stableOnce) {
        $sonra = [IO.File]::ReadAllBytes($stableYol)
        if ([Convert]::ToBase64String($stableOnce) -ne [Convert]::ToBase64String($sonra)) {
            [IO.File]::WriteAllBytes($stableYol, $stableOnce)
            Fail 'Stable manifesti degismisti; geri yuklendi.'
        }
    }
}

Yaz ("[OK] Beta kanali geri alindi: {0}" -f [string]$hedef.beta.etiket) 'Green'
exit 0
