# Crée test\demo-membres.xlsx : 20 personnes INVENTÉES, pour filmer une démonstration
# sans montrer de vrais membres. Même structure que le vrai fichier.
# Le fichier .xlsx n'est jamais publié (voir .gitignore).

$sortie = Join-Path $PSScriptRoot 'demo-membres.xlsx'
$entetes = @('Nom', 'Prénom', 'Date de naissance', 'Téléphone', 'Email', "Club d'appartenance", 'Statut')

$feuilles = [ordered]@{
  'GAMMA' = @(
    @('BERTRAND', 'Léo', '2012-04-18'), @('CHEVALIER', 'Inès', '2010-09-02'), @('DA SILVA', 'Rafael', '1995-01-27'),
    @('FAVRE', 'Julien', '1988-06-11'), @('MÜLLER', 'Lena', '2014-03-05'), @('NGUYEN', 'Thomas', '2001-12-19'),
    @('ROCHAT', 'Emma', '2013-07-23'), @('ZIMMERMANN', 'Noah', '2009-10-30')
  )
  'LANCY' = @(
    @('BONVIN', 'Sarah', '1999-02-14'), @('DIALLO', 'Moussa', '2011-05-08'), @('FERREIRA', 'Ana', '2008-11-21'),
    @('GIRARD', 'Maxime', '1992-08-03'), @('KELLER', 'Lina', '2015-01-16'), @('PERRET', 'Adam', '2012-06-29')
  )
  'SERVETTE' = @(
    @('BLANC', 'Hugo', '2010-03-12'), @('DUCOMMUN', 'Léa', '2013-09-25'), @('HADDAD', 'Yasmine', '1997-04-07'),
    @('MOREL', 'Nathan', '2006-12-01'), @('RIBEIRO', 'Lucas', '2011-02-20'), @('VUILLE', 'Chloé', '2014-08-14')
  )
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
  $classeur = $excel.Workbooks.Add()
  while ($classeur.Worksheets.Count -lt $feuilles.Count) { [void]$classeur.Worksheets.Add([Type]::Missing, $classeur.Worksheets.Item($classeur.Worksheets.Count)) }

  $i = 1; $n = 10
  foreach ($nomFeuille in $feuilles.Keys) {
    $ws = $classeur.Worksheets.Item($i)
    $ws.Name = $nomFeuille
    for ($c = 0; $c -lt 7; $c++) { $ws.Cells.Item(1, $c + 1).Value2 = $entetes[$c] }
    $ligne = 2
    foreach ($p in $feuilles[$nomFeuille]) {
      $prenomSimple = ($p[1].Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', '').ToLower()
      $nomSimple = (($p[0] -replace ' ', '').Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', '').ToLower()
      $valeurs = @($p[0], $p[1], $null, "079 000 00 $n", "$prenomSimple.$nomSimple@example.com", $nomFeuille, 'Actif')
      for ($c = 0; $c -lt 7; $c++) {
        $cell = $ws.Cells.Item($ligne, $c + 1)
        if ($c -eq 2) { $cell.NumberFormat = 'dd.mm.yyyy'; $cell.Formula = [string][int]([datetime]$p[2]).ToOADate() }
        else { $cell.NumberFormat = '@'; $cell.Value2 = [string]$valeurs[$c] }
      }
      $ligne++; $n++
    }
    [void]$ws.Columns.AutoFit()
    $i++
  }
  if (Test-Path $sortie) { Remove-Item $sortie }
  $classeur.SaveAs($sortie, 51)
  $classeur.Close($false)
  Write-Output "Fichier créé : $sortie"
}
finally {
  $excel.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}
