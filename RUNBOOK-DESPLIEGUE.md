# Runbook de despliegue — Pipeline CI/CD DevSecOps AnalytiCore

Secuencia exacta para poner el pipeline en marcha. El orden importa: Render solo
puede consumir imagenes que **ya existen** en GHCR, así que **primero corre el
pipeline (publica imagenes), luego se recrean los servicios de Render**.

## Estado actual (2026-07-31)

Repo propio (owner = `Mickel0822`, ADMIN): `github.com/Mickel0822/gestion_de_Cambios`.

Listo:
- Codigo alineado al BPMN (ESLint+Vitest, Ruff+pip-audit, SpotBugs+OWASP). Verificado.
- Workflows y scripts creados: `.github/workflows/ci-cd.yml`, `scripts/smoke-test.sh`, `scripts/render-deploy.sh`.
- GitHub secret `RENDER_API_KEY` + variables `RENDER_*_SERVICE_ID` y `PROD_PYTHON_URL`. Listos.
- Environment `production` con reviewer obligatorio (Mickel0822). Creado.
- Blueprint objetivo image-backed: `render.image.yaml`.

Pendiente:
- Commit + push del pipeline (dispara el primer run y publica imagenes en GHCR).
- Hacer publicos los paquetes GHCR.
- Recreacion de los 3 servicios de Render como image-backed.

---

## Paso 1 — Publicar el pipeline (genera las imagenes en GHCR)

```
git checkout -b feat/pipeline-cicd
git add -A
git commit -m "feat: pipeline CI/CD DevSecOps (workflows, alineacion de herramientas)"
git push -u origin feat/pipeline-cicd
# Abrir PR -> el pipeline corre en el PR (CI + staging, SIN publicar ni desplegar).
# Merge a main -> corre completo y PUBLICA imagenes en GHCR.
```
En el primer push a `main`, `paths-filter` detecta los 3 servicios como cambiados
=> se construyen, escanean (Trivy) y publican:
`ghcr.io/mickel0822/analyticore-{frontend,python,java}:latest` y `:sha-xxxx`.

> Si `deploy-production` corre antes de recrear Render, fallara al desplegar
> (los servicios aun son build-desde-Dockerfile). Es esperado en esta primera vuelta.

## Paso 2 — Hacer publicas las imagenes GHCR

Por cada paquete en `github.com/users/Mickel0822/packages`:
Package settings -> Change visibility -> **Public**.
(Alternativa privada: crear PAT `read:packages` y anadirlo como Registry Credential en Render.)

## Paso 3 — Recrear los servicios de Render como image-backed

Los servicios actuales construyen desde Dockerfile y **no** se pueden convertir
in-place. Recrearlos (la base de datos `analyticore-db` se conserva):

Opcion Blueprint:
1. Renombrar `render.image.yaml` -> `render.yaml` (respaldar el actual antes).
2. En Render: eliminar los 3 web services actuales (NO la base de datos).
3. New -> Blueprint -> conectar el repo -> confirma los 3 servicios image-backed + la DB existente.

Opcion Dashboard (por servicio): New -> Web Service -> **Existing Image** ->
`ghcr.io/mickel0822/analyticore-<svc>:latest` -> mismas env vars que en `render.image.yaml`.

## Paso 4 — Corregir la URL del frontend (horneada en build)

1. Copiar la nueva URL publica de `analyticore-python`.
2. `gh variable set PROD_PYTHON_URL --repo Mickel0822/gestion_de_Cambios --body "https://<nueva-url-python>"`
3. Actualizar los IDs si cambiaron:
   `gh variable set RENDER_FRONTEND_SERVICE_ID ...` (idem python/java).
4. Re-lanzar el pipeline (push trivial o `workflow_dispatch`) para reconstruir la
   imagen del frontend con la API URL correcta y desplegarla.

## Paso 5 — Verificar de punta a punta

- El pipeline llega a `deploy-production` -> aprobar en la pestana Actions (reviewer).
- `render-deploy.sh` despliega el tag `sha-xxxx`, hace health check y rollback si falla.
- Probar: abrir el frontend, enviar un texto, confirmar `PENDIENTE -> PROCESANDO -> COMPLETADO`.

## Notas
- OWASP Dependency-Check descarga la base NVD (lenta la 1a vez). Anadir secret
  `NVD_API_KEY` para acelerar; el cache de Actions la conserva entre runs.
- `npm audit` corre con `--omit=dev` (las vulnerabilidades de vite/vitest no llegan a la imagen).
- IDs Render actuales: frontend `srv-d9fn8hok1i2s73b5t4pg`, python `srv-d9fn8hgk1i2s73b5t3qg`, java `srv-d9fn7qgk1i2s73b5rssg`.
