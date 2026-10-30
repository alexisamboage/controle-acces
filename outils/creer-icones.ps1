# Crée les icônes de l'app à partir du logo du club.
# Usage : powershell -ExecutionPolicy Bypass -File outils\creer-icones.ps1 -Logo "chemin\du\logo.webp"
# L'emblème rond est repéré par son centre et son rayon dans l'image d'origine (942 x 970 px).
param(
  [Parameter(Mandatory)][string]$Logo,
  [double]$CentreX = 473, [double]$CentreY = 516.5, [double]$Rayon = 303.5
)
Add-Type -AssemblyName PresentationCore, WindowsBase

$dossier = Join-Path (Split-Path $PSScriptRoot -Parent) 'images'
New-Item -ItemType Directory -Force $dossier | Out-Null

$source = [System.Windows.Media.Imaging.BitmapDecoder]::Create([Uri](Resolve-Path $Logo).Path, 'None', 'OnLoad').Frames[0]

# taille = côté de l'image ; part = diamètre de l'emblème / côté ; fond = $true pour un fond noir
function Creer-Icone([string]$nom, [int]$taille, [double]$part, [bool]$fond) {
  $diam = $taille * $part
  $echelle = $diam / (2 * $Rayon)
  $c = $taille / 2
  $visuel = New-Object System.Windows.Media.DrawingVisual
  [System.Windows.Media.RenderOptions]::SetBitmapScalingMode($visuel, 'HighQuality')
  $dc = $visuel.RenderOpen()
  if ($fond) { $dc.DrawRectangle([System.Windows.Media.Brushes]::Black, $null, (New-Object System.Windows.Rect(0, 0, $taille, $taille))) }
  $dc.PushClip((New-Object System.Windows.Media.EllipseGeometry((New-Object System.Windows.Point($c, $c)), ($diam / 2), ($diam / 2))))
  $dc.DrawImage($source, (New-Object System.Windows.Rect(($c - $CentreX * $echelle), ($c - $CentreY * $echelle), ($source.PixelWidth * $echelle), ($source.PixelHeight * $echelle))))
  $dc.Pop()
  $dc.Close()
  $rendu = New-Object System.Windows.Media.Imaging.RenderTargetBitmap($taille, $taille, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
  $rendu.Render($visuel)
  $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($rendu))
  $flux = [IO.File]::Create((Join-Path $dossier $nom))
  try { $enc.Save($flux) } finally { $flux.Close() }
  Write-Output "OK : images\$nom"
}

Creer-Icone 'embleme.png'            512 1.00 $false  # logo dans l'app (fond transparent)
Creer-Icone 'icone-192.png'          192 0.92 $true   # icône Android
Creer-Icone 'icone-512.png'          512 0.92 $true
Creer-Icone 'icone-maskable-512.png' 512 0.74 $true   # icône Android découpable (cercle, goutte…)
Creer-Icone 'apple-touch-icon.png'   180 0.92 $true   # icône iPhone
