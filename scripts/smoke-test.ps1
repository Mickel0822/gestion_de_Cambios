param([switch]$KeepRunning)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$smokeProject = 'analyticore-smoke'

try {
    docker compose --project-directory $projectRoot --project-name $smokeProject up --build -d --wait
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose no pudo iniciar el entorno (código $LASTEXITCODE)." }

    $health = Invoke-RestMethod -Uri 'http://localhost:5000/health' -TimeoutSec 10
    if ($health.status -ne 'healthy') { throw 'El servicio Python no está saludable.' }

    $created = Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/analyze' `
        -ContentType 'application/json; charset=utf-8' `
        -Body (@{ text = 'El servicio es excelente, rápido y maravilloso. La experiencia fue increíble.' } | ConvertTo-Json)

    $job = $null
    foreach ($attempt in 1..30) {
        Start-Sleep -Milliseconds 500
        $job = Invoke-RestMethod -Uri ("http://localhost:5000/jobs/{0}" -f $created.jobId)
        if ($job.status -in @('COMPLETADO', 'ERROR')) { break }
    }

    if ($job.status -ne 'COMPLETADO') { throw "El trabajo terminó en estado $($job.status)." }
    if ($job.sentiment -ne 'POSITIVO') { throw "Sentimiento inesperado: $($job.sentiment)." }
    if ((Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing).StatusCode -ne 200) {
        throw 'El frontend no respondió HTTP 200.'
    }

    Write-Host "Smoke test correcto. Job #$($job.id): $($job.status), $($job.sentiment)." -ForegroundColor Green
}
finally {
    if (-not $KeepRunning) {
        docker compose --project-directory $projectRoot --project-name $smokeProject down -v
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Docker Compose no pudo limpiar completamente el entorno."
        }
    }
}
