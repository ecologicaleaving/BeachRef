if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_ANON_KEY) {
  Write-Error "Missing env vars: SUPABASE_URL and SUPABASE_ANON_KEY must be set."
  exit 1
}

$h = @{
  'apikey' = $env:SUPABASE_ANON_KEY
  'Authorization' = "Bearer $($env:SUPABASE_ANON_KEY)"
}

Write-Host "=== Recent matches in Supabase (last_synced desc) ==="
$matches = Invoke-RestMethod -Uri "$($env:SUPABASE_URL)/rest/v1/matches?select=no,tournament_no,team_a_name,team_b_name,status,last_synced&order=last_synced.desc.nullslast&limit=15" -Headers $h
if ($matches) {
  $matches | Format-Table -Property no, tournament_no, team_a_name, team_b_name, status, last_synced -AutoSize
  Write-Host "`nTotal rows returned: $($matches.Count)"
} else {
  Write-Host "No matches found in DB"
}

Write-Host "`n=== Count of matches by tournament_no ==="
$all = Invoke-RestMethod -Uri "$($env:SUPABASE_URL)/rest/v1/matches?select=tournament_no" -Headers $h
if ($all) {
  $all | Group-Object tournament_no | Sort-Object Count -Descending | Select-Object Count, Name -First 10 | Format-Table -AutoSize
  Write-Host "Total matches in DB: $($all.Count)"
} else {
  Write-Host "No matches in DB"
}
