# Crée test\faux-membres.xlsx : 10 personnes FICTIVES réparties sur 3 feuilles.
# Le fichier contient volontairement des pièges (espaces en trop, dates vides,
# date en texte, ligne vide, club vide, colonnes dans un autre ordre...).
# Le fichier .xlsx n'est jamais publié (voir .gitignore).

$sortie = Join-Path $PSScriptRoot 'faux-membres.xlsx'
$entetes = @('Nom', 'Prénom', 'Date de naissance', 'Téléphone', 'Email', "Club d'appartenance", 'Statut')

$feuilles = [ordered]@{
  'GAMMA' = @(
    @('  DUPONT ', 'Léa', [datetime]'2012-03-14', '079 000 00 01', 'lea.dupont@example.com', 'GAMMA', 'Actif'),
    @('MARTIN', ' Roméo  ', $null, '079 000 00 02', 'romeo.martin@example.com', 'GAMMA', 'Inactif'),
    @($null, $null, $null, $null, $null, $null, $null),
    @('Lefèvre', 'Chloé', '05.11.2009', '079 000 00 03', '', 'GAMMA', ''),
    @('TESTEUR', 'Axel', [datetime]'1990-07-01', '079 000 00 04', 'axel@example.com', '', 'Actif')
  )
  'LANCY' = @(
    @('BERNARD', 'Noah', [datetime]'2015-01-20', '079 000 00 05', '', 'LANCY', 'Actif'),
    @('MARTIN', 'Roméo', [datetime]'2011-06-02', '', '', 'LANCY', 'Actif'),
    @('Dubois', 'Inès', [datetime]'2008-09-30', '079 000 00 06', 'ines@example.com', 'LANCY', 'Suspendu'),
    @('', '', $null, '079 000 00 99', '', 'LANCY', '')
  )
  'SERVETTE' = @(
    @('GARCIA', 'Hugo', [datetime]'2013-12-12', '079 000 00 07', '', 'SERVETTE', 'Actif'),
    @('ROUX ', 'Manon', $null, '', 'manon@example.com', 'SERVETTE', ''),
    @('FAUX', 'Jean-Marc', [datetime]'1985-04-04', '079 000 00 08', '', 'SERVETTE', 'Actif')
  )
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
  $classeur = $excel.Workbooks.Add()
  while ($classeur.Worksheets.Count -lt $feuilles.Count) { [void]$classeur.Worksheets.Add([Type]::Missing, $classeur.Worksheets.Item($classeur.Worksheets.Count)) }

  $i = 1
  foreach ($nomFeuille in $feuilles.Keys) {
    $ws = $classeur.Worksheets.Item($i)
    $ws.Name = $nomFeuille

    # Sur SERVETTE, en-têtes en majuscules sans accents et dans un autre ordre,
    # pour vérifier que l'app repère les colonnes par leur nom.
    $ordre = 0..6
    $titres = $entetes
    if ($nomFeuille -eq 'SERVETTE') {
      $ordre = @(1, 0, 5, 2, 3, 4, 6)
      $titres = @('PRENOM', 'NOM', 'club d appartenance', 'date de naissance', 'Telephone', 'E-mail', 'statut')
    }

    for ($c = 0; $c -lt 7; $c++) { $ws.Cells.Item(1, $c + 1).Value2 = $titres[$c] }

    $ligne = 2
    foreach ($p in $feuilles[$nomFeuille]) {
      for ($c = 0; $c -lt 7; $c++) {
        $v = $p[$ordre[$c]]
        $cell = $ws.Cells.Item($ligne, $c + 1)
        if ($v -is [datetime]) { $cell.NumberFormat = 'dd.mm.yyyy'; $cell.Formula = [string][int]$v.ToOADate() }
        elseif ($null -ne $v -and $v -ne '') { $cell.NumberFormat = '@'; $cell.Value2 = [string]$v }
      }
      $ligne++
    }
    [void]$ws.Columns.AutoFit()
    $i++
  }

  if (Test-Path $sortie) { Remove-Item $sortie }
  $classeur.SaveAs($sortie, 51)  # 51 = format .xlsx
  $classeur.Close($false)
  Write-Output "Fichier créé : $sortie"
}
finally {
  $excel.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}
