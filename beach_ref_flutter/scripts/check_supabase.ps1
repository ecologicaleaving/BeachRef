$h = @{
  'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrdm1pcm1rYXllZ2t2eHRjc3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTQxNTYsImV4cCI6MjA1MzgzMDE1Nn0.2JTOepMRLOBw4fRClS68MR7x9LbN0hzCxaHIwhxmKLU'
  'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrdm1pcm1rYXllZ2t2eHRjc3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTQxNTYsImV4cCI6MjA1MzgzMDE1Nn0.2JTOepMRLOBw4fRClS68MR7x9LbN0hzCxaHIwhxmKLU'
}

Write-Host "=== Recent matches in Supabase (last_synced desc) ==="
$matches = Invoke-RestMethod -Uri 'https://ykvmirmkayegkvxtcsrj.supabase.co/rest/v1/matches?select=no,tournament_no,team_a_name,team_b_name,status,last_synced&order=last_synced.desc.nullslast&limit=15' -Headers $h
if ($matches) {
  $matches | Format-Table -Property no, tournament_no, team_a_name, team_b_name, status, last_synced -AutoSize
  Write-Host "`nTotal rows returned: $($matches.Count)"
} else {
  Write-Host "No matches found in DB"
}

Write-Host "`n=== Count of matches by tournament_no ==="
$all = Invoke-RestMethod -Uri 'https://ykvmirmkayegkvxtcsrj.supabase.co/rest/v1/matches?select=tournament_no' -Headers $h
if ($all) {
  $all | Group-Object tournament_no | Sort-Object Count -Descending | Select-Object Count, Name -First 10 | Format-Table -AutoSize
  Write-Host "Total matches in DB: $($all.Count)"
} else {
  Write-Host "No matches in DB"
}
