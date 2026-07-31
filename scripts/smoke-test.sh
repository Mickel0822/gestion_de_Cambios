#!/usr/bin/env bash
# Smoke test + prueba integral para el entorno de staging efimero (GitHub Actions).
# Levanta el stack completo con docker compose (Postgres desechable) y valida:
#   - /health de Python
#   - flujo funcional POST /analyze -> GET /jobs/{id} hasta COMPLETADO
#   - frontend responde HTTP 200
# Replica scripts/smoke-test.ps1 para runners Linux.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="${SMOKE_PROJECT:-analyticore-smoke}"
KEEP_RUNNING="${KEEP_RUNNING:-0}"

PY_URL="${PY_URL:-http://localhost:5000}"
FRONT_URL="${FRONT_URL:-http://localhost:3000}"

cleanup() {
  if [[ "${KEEP_RUNNING}" != "1" ]]; then
    docker compose --project-directory "${PROJECT_ROOT}" --project-name "${PROJECT_NAME}" down -v || \
      echo "::warning::No se pudo limpiar completamente el entorno de staging."
  fi
}
trap cleanup EXIT

echo "==> Levantando stack de staging (docker compose --wait)"
docker compose --project-directory "${PROJECT_ROOT}" --project-name "${PROJECT_NAME}" up --build -d --wait

echo "==> Health check Python"
health="$(curl -fsS --max-time 10 "${PY_URL}/health")"
echo "    ${health}"
echo "${health}" | grep -q '"status"[[:space:]]*:[[:space:]]*"healthy"' || {
  echo "::error::El servicio Python no esta saludable."; exit 1;
}

echo "==> Prueba integral: POST /analyze"
created="$(curl -fsS --max-time 15 -X POST "${PY_URL}/analyze" \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d '{"text":"El servicio es excelente, rapido y maravilloso. La experiencia fue increible."}')"
echo "    ${created}"
job_id="$(echo "${created}" | sed -n 's/.*"jobId"[[:space:]]*:[[:space:]]*\([0-9]\+\).*/\1/p')"
[[ -n "${job_id}" ]] || { echo "::error::No se obtuvo jobId de /analyze."; exit 1; }

echo "==> Esperando a que el job #${job_id} termine (GET /jobs/{id})"
status=""
sentiment=""
for _ in $(seq 1 40); do
  sleep 0.5
  job="$(curl -fsS --max-time 10 "${PY_URL}/jobs/${job_id}" || true)"
  status="$(echo "${job}" | sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
  if [[ "${status}" == "COMPLETADO" || "${status}" == "ERROR" ]]; then
    sentiment="$(echo "${job}" | sed -n 's/.*"sentiment"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
    break
  fi
done

[[ "${status}" == "COMPLETADO" ]] || { echo "::error::El trabajo termino en estado '${status}'."; exit 1; }
[[ "${sentiment}" == "POSITIVO" ]] || { echo "::error::Sentimiento inesperado: '${sentiment}'."; exit 1; }

echo "==> Health check Frontend"
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${FRONT_URL}")"
[[ "${code}" == "200" ]] || { echo "::error::El frontend respondio HTTP ${code}."; exit 1; }

echo "Smoke test correcto. Job #${job_id}: ${status}, ${sentiment}."
