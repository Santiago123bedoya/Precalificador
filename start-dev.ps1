param(
  [string]$Subdomain = "ia-coop-palenca"
)

Write-Host "=== IA-COOP: Iniciando entorno de desarrollo ===" -ForegroundColor Cyan

# Matar procesos anteriores en :3000
$old = netstat -ano | Select-String ":3000" | Select-String "LISTENING"
if ($old) {
  $oldPid = ($old -split "\s+")[-1]
  Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

Write-Host "[1/3] Iniciando Next.js dev server..." -ForegroundColor Yellow
$devJob = Start-Job -ScriptBlock {
  param($dir)
  Set-Location $dir
  npx next dev -p 3000 2>&1 | Out-File "$env:TEMP\ia-coop-nextdev.log"
} -ArgumentList (Get-Location)

Start-Sleep -Seconds 6

Write-Host "[2/3] Iniciando tunnel público..." -ForegroundColor Yellow
$ltJob = Start-Job -ScriptBlock {
  param($port, $subdomain)
  & "C:\Users\User\AppData\Roaming\npm\lt.cmd" --port $port --subdomain $subdomain 2>&1 | Out-File "$env:TEMP\ia-coop-lt.log"
} -ArgumentList @(3000, $Subdomain)

Start-Sleep -Seconds 5

$tunnelUrl = $null
$retries = 0
while ($retries -lt 15) {
  $log = Get-Content "$env:TEMP\ia-coop-lt.log" -ErrorAction SilentlyContinue
  $match = $log | Select-String "https://.*\.loca\.lt"
  if ($match) {
    $tunnelUrl = $match.Matches[0].Value.Trim()
    break
  }
  Start-Sleep -Seconds 2
  $retries++
}

if (-not $tunnelUrl) {
  Write-Host "ERROR: No se pudo obtener URL del tunnel" -ForegroundColor Red
  Write-Host "Revisa: Get-Content '$env:TEMP\ia-coop-lt.log'" -ForegroundColor Gray
  exit 1
}

Write-Host "[3/3] Actualizando webhook de Palenca -> $tunnelUrl..." -ForegroundColor Yellow
try {
  $body = @{ url = "$tunnelUrl/api/palenca/webhook"; name = "IA-COOP Webhook (Auto)" } | ConvertTo-Json
  $headers = @{ "Content-Type" = "application/json" }
  $resp = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/palenca/setup-webhook" -Method Post -Headers $headers -Body $body -ContentType "application/json"
  if ($resp.success) {
    Write-Host "Webhook actualizado: $($resp.data.webhookId)" -ForegroundColor Green
  }
} catch {
  Write-Host "Error actualizando webhook: $_" -ForegroundColor Red
  Write-Host "Puedes hacerlo manualmente despu�s." -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Dev Server:  http://localhost:3000" -ForegroundColor Green
Write-Host "  Tunnel URL:  $tunnelUrl" -ForegroundColor Green
Write-Host "  Webhook:     $tunnelUrl/api/palenca/webhook" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para detener todo" -ForegroundColor Gray

# Mantener vivo
try {
  while ($true) { Start-Sleep -Seconds 10 }
} finally {
  Write-Host "Deteniendo procesos..." -ForegroundColor Yellow
  Stop-Job $devJob -ErrorAction SilentlyContinue
  Stop-Job $ltJob -ErrorAction SilentlyContinue
  Remove-Job $devJob -ErrorAction SilentlyContinue
  Remove-Job $ltJob -ErrorAction SilentlyContinue
}
