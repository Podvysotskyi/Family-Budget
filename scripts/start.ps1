$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
$composeCommand = Get-Command docker-compose -ErrorAction SilentlyContinue
$composeExecutable = if ($composeCommand) { $composeCommand.Source } else { $null }
if (-not $dockerCommand -and -not $composeExecutable -and (Test-Path -LiteralPath '.runtime/docker-compose.exe')) {
    $composeExecutable = Join-Path (Get-Location) '.runtime/docker-compose.exe'
}
if (-not $dockerCommand -and -not $composeExecutable) { throw 'Docker with Linux containers and Compose v2 is required. Start Docker, then rerun this script.' }
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
$configuration = Get-Content -LiteralPath '.env' -Raw
if ($configuration -match '(?m)^APP_KEY=[ \t]*\r?$') {
    $keyBytes = [byte[]]::new(32)
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($keyBytes) } finally { $generator.Dispose() }
    $configuration = [regex]::Replace($configuration, '(?m)^APP_KEY=[ \t]*\r?$', 'APP_KEY=base64:' + [Convert]::ToBase64String($keyBytes))
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), $configuration, [System.Text.UTF8Encoding]::new($false))
}
if ($composeExecutable) { & $composeExecutable up --build --detach --wait }
else { & $dockerCommand.Source compose up --build --detach --wait }
if ($LASTEXITCODE -ne 0) { throw 'Compose did not start successfully. Inspect docker compose logs.' }
Write-Host 'Household is ready at http://localhost:8080'
