#!/usr/bin/env bash
# Despliega una imagen de GHCR en un servicio de Render y valida su salud.
# Si el deploy falla o el health check no pasa, hace ROLLBACK al deploy live previo.
#
# Requiere: RENDER_API_KEY (env), jq, curl.
# Uso: render-deploy.sh <SERVICE_ID> <IMAGE_URL> [HEALTH_PATH]
#   HEALTH_PATH por defecto: /health   (frontend usa "/")
set -euo pipefail

SERVICE_ID="${1:?Falta SERVICE_ID}"
IMAGE_URL="${2:?Falta IMAGE_URL}"
HEALTH_PATH="${3:-/health}"
API="https://api.render.com/v1"
: "${RENDER_API_KEY:?Falta RENDER_API_KEY}"
# Defensa: eliminar cualquier espacio/salto de linea del secret (un \n en el
# header Authorization provoca 401 en Render).
RENDER_API_KEY="$(printf '%s' "$RENDER_API_KEY" | tr -d '[:space:]')"

auth=(-H "Authorization: Bearer ${RENDER_API_KEY}" -H "Accept: application/json")

echo "==> [${SERVICE_ID}] Deploy previo (para rollback)"
prev_deploy="$(curl -fsS "${auth[@]}" "${API}/services/${SERVICE_ID}/deploys?limit=20" \
  | jq -r '[.[].deploy | select(.status=="live")][0].id // empty')"
echo "    previo live: ${prev_deploy:-<ninguno>}"

echo "==> [${SERVICE_ID}] Disparando deploy de ${IMAGE_URL}"
deploy_id="$(curl -fsS "${auth[@]}" -H "Content-Type: application/json" \
  -X POST "${API}/services/${SERVICE_ID}/deploys" \
  -d "$(jq -nc --arg u "${IMAGE_URL}" '{imageUrl:$u}')" | jq -r '.id')"
[[ -n "${deploy_id}" && "${deploy_id}" != "null" ]] || { echo "::error::No se creo el deploy."; exit 1; }
echo "    deploy: ${deploy_id}"

echo "==> [${SERVICE_ID}] Esperando a que el deploy termine"
status=""
for _ in $(seq 1 60); do   # hasta ~10 min
  sleep 10
  status="$(curl -fsS "${auth[@]}" "${API}/services/${SERVICE_ID}/deploys/${deploy_id}" | jq -r '.status')"
  echo "    status=${status}"
  case "${status}" in
    live) break ;;
    build_failed|update_failed|canceled|deactivated) break ;;
  esac
done

rollback() {
  if [[ -n "${prev_deploy:-}" ]]; then
    echo "::warning::[${SERVICE_ID}] Ejecutando ROLLBACK a ${prev_deploy}"
    curl -fsS "${auth[@]}" -H "Content-Type: application/json" \
      -X POST "${API}/services/${SERVICE_ID}/rollback" \
      -d "$(jq -nc --arg d "${prev_deploy}" '{deployId:$d}')" >/dev/null || \
      echo "::error::El rollback fallo."
  else
    echo "::error::[${SERVICE_ID}] Sin deploy previo para rollback."
  fi
}

if [[ "${status}" != "live" ]]; then
  echo "::error::[${SERVICE_ID}] El deploy no llego a 'live' (status=${status})."
  rollback
  exit 1
fi

echo "==> [${SERVICE_ID}] Health check post-deploy (${HEALTH_PATH})"
url="$(curl -fsS "${auth[@]}" "${API}/services/${SERVICE_ID}" | jq -r '.serviceDetails.url')"
[[ -n "${url}" && "${url}" != "null" ]] || { echo "::error::No se obtuvo la URL del servicio."; rollback; exit 1; }

ok=0
for _ in $(seq 1 20); do   # tolera arranque en frio del plan free
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "${url}${HEALTH_PATH}" || echo 000)"
  echo "    GET ${url}${HEALTH_PATH} -> ${code}"
  if [[ "${code}" == "200" ]]; then ok=1; break; fi
  sleep 15
done

if [[ "${ok}" != "1" ]]; then
  echo "::error::[${SERVICE_ID}] Health check fallo tras el deploy."
  rollback
  exit 1
fi

echo "[${SERVICE_ID}] Despliegue saludable: ${url}${HEALTH_PATH}"
