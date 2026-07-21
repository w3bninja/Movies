param(
  [string]$InPath = "$PSScriptRoot\source_library.json",
  [string]$OutPath = "$(Split-Path -Parent $PSScriptRoot)\movies.json"
)

$source = Get-Content $InPath -Raw -Encoding UTF8 | ConvertFrom-Json
$movies = @()
$counter = 0

foreach ($category in $source.media_library.categories) {
  foreach ($sub in $category.subcategories) {
    foreach ($item in $sub.items) {
      $counter++
      $title = $item
      $year = ""
      $m = [regex]::Match($item, '\((\d{4})(?:\s+[^)]*)?\)\s*$')
      if ($m.Success) {
        $year = [int]$m.Groups[1].Value
        $title = $item.Substring(0, $m.Index).Trim()
      }
      $movies += [PSCustomObject]@{
        id           = "m{0:D4}" -f $counter
        title        = $title
        year         = $year
        category     = $category.category_name
        subcategory  = $sub.name
        cover        = ""
      }
    }
  }
}

$movies | ConvertTo-Json -Depth 5 | Set-Content -Path $OutPath -Encoding utf8
Write-Host "Wrote $($movies.Count) movies to $OutPath"
