param(
  [string]$MoviesPath = "$(Split-Path -Parent $PSScriptRoot)\movies.json"
)

$headers = @{ "User-Agent" = "PersonalMovieLibraryApp/1.0 (one-time cover art batch lookup; contact: admin@aaronlandry.net)" }
$movies = Get-Content $MoviesPath -Raw -Encoding UTF8 | ConvertFrom-Json

$found = 0
$notFound = New-Object System.Collections.Generic.List[string]

for ($i = 0; $i -lt $movies.Count; $i++) {
  $m = $movies[$i]
  if ($m.cover) { continue }

  $query = "$($m.title) $($m.year) film"
  $searchUrl = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + [uri]::EscapeDataString($query) + "&srlimit=1&format=json"

  $attempt = 0
  $done = $false
  while (-not $done -and $attempt -lt 3) {
    $attempt++
    try {
      $searchResult = Invoke-RestMethod -Uri $searchUrl -Headers $headers -TimeoutSec 10
      if ($searchResult.query.search.Count -gt 0) {
        $pageTitle = $searchResult.query.search[0].title
        $summaryUrl = "https://en.wikipedia.org/api/rest_v1/page/summary/" + [uri]::EscapeDataString($pageTitle.Replace(' ', '_'))
        $summary = Invoke-RestMethod -Uri $summaryUrl -Headers $headers -TimeoutSec 10

        $looksLikeFilm = $summary.description -match '(?i)film|movie'
        if ($summary.thumbnail.source -and $looksLikeFilm) {
          $m.cover = $summary.thumbnail.source
          $found++
        } else {
          $notFound.Add("$($m.title) (matched '$pageTitle', desc: '$($summary.description)')")
        }
      } else {
        $notFound.Add($m.title)
      }
      $done = $true
    } catch {
      if ($_.Exception.Message -match '429' -and $attempt -lt 3) {
        Start-Sleep -Seconds (3 * $attempt)
      } else {
        $notFound.Add("$($m.title) (error: $($_.Exception.Message))")
        $done = $true
      }
    }
  }

  Start-Sleep -Milliseconds 300

  if (($i + 1) % 25 -eq 0) {
    Write-Host "Processed $($i + 1)/$($movies.Count)..."
  }
}

$movies | ConvertTo-Json -Depth 5 | Set-Content -Path $MoviesPath -Encoding utf8
Write-Host "Done. Found covers for $found movies. $($notFound.Count) without covers."
$notFoundPath = Join-Path (Split-Path -Parent $MoviesPath) ".claude\covers-not-found.txt"
$notFound | Set-Content -Path $notFoundPath -Encoding utf8
Write-Host "Not-found list written to $notFoundPath"
