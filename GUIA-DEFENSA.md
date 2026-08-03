# 🎓 Guía de defensa en vivo — AnalytiCore CI/CD DevSecOps

> Todo lo de aquí está **operativo y verificado**. Úsalo como cheat-sheet durante la presentación.

---

## 0) Recursos en vivo (formato .env — cópialo/mira estos enlaces)

```env
# --- Producción (Render, image-backed desde GHCR) ---
FRONTEND_URL=https://analyticore-frontend-nfuf.onrender.com
PYTHON_API_URL=https://analyticore-python-6z9t.onrender.com
JAVA_URL=https://analyticore-java-dobc.onrender.com

# --- Endpoints de salud (para "despertar" antes de la demo) ---
FRONTEND_HEALTH=https://analyticore-frontend-nfuf.onrender.com/
PYTHON_HEALTH=https://analyticore-python-6z9t.onrender.com/health
JAVA_HEALTH=https://analyticore-java-dobc.onrender.com/health

# --- Repositorio y CI/CD ---
REPO=https://github.com/Mickel0822/gestion_de_Cambios
ACTIONS=https://github.com/Mickel0822/gestion_de_Cambios/actions
PACKAGES_GHCR=https://github.com/Mickel0822?tab=packages
ENVIRONMENTS=https://github.com/Mickel0822/gestion_de_Cambios/settings/environments

# --- IDs de servicios Render (image-backed) ---
RENDER_FRONTEND_ID=srv-d9o3mcu7bikc73ctj8cg
RENDER_PYTHON_ID=srv-d9o3l4u417fc73ef9fk0
RENDER_JAVA_ID=srv-d9o3knbncjis73b6mmu0
RENDER_DB_ID=dpg-d9fn7hgk1i2s73b5rdd0-a
```

---

## 1) PRE-FLIGHT (haz esto 2 min ANTES de exponer)

El plan **free de Render suspende** los servicios por inactividad → la primera petición puede tardar 30–60s (arranque en frío). Despiértalos primero:

**PowerShell:**
```powershell
irm https://analyticore-java-dobc.onrender.com/health
irm https://analyticore-python-6z9t.onrender.com/health
Start-Process https://analyticore-frontend-nfuf.onrender.com/
```

Salida esperada de Python (confirma DB conectada):
```json
{"postgres":"connected","status":"healthy","version":"PostgreSQL 18.4 ..."}
```

---

## 2) DEMO A — La app funcionando (lo que más convence)

1. Abre **FRONTEND_URL**. Verifica el punto verde **"Servicio disponible"** (significa que el health check frontend→python pasa con CORS OK).
2. Escribe en el textarea:
   > *El servicio fue excelente, rápido y maravilloso. Una experiencia increíble.*
3. Clic **"Analizar texto"**.
4. En **"Lecturas recientes"** aparece la lectura con estado **PENDIENTE → COMPLETADO**, con **sentimiento POSITIVO** y **palabras clave**.

**Frase:** *"Esta imagen es exactamente la que Trivy escaneó y se publicó en GHCR; Render la consume, no la reconstruye."*

### (Opcional) Demo por API pura desde terminal
```powershell
# 1. Crear análisis
$job = irm -Method Post https://analyticore-python-6z9t.onrender.com/analyze `
  -ContentType 'application/json' `
  -Body '{"text":"El servicio fue excelente, rapido y maravilloso."}'
$job   # -> jobId, status: PENDIENTE

# 2. Consultar resultado
irm "https://analyticore-python-6z9t.onrender.com/jobs/$($job.jobId)"
```
Salida esperada:
```json
{"id":10,"status":"COMPLETADO","sentiment":"POSITIVO",
 "keywords":["servicio","excelente","rapido","maravilloso","experiencia"], ...}
```
Esto prueba en vivo la cadena **python → java → PostgreSQL**.

---

## 3) DEMO B — El pipeline verde (GitHub Actions)

1. Abre **ACTIONS**. Entra al último run **completo (verde)**.
2. Muestra los **jobs como carriles del BPMN**:
   `Detectar servicios → Gitleaks → CI Frontend / CI Python / CI Java → Staging → (Aprobación y despliegue)`
3. Entra a **CI Python** y recorre los steps:
   `Ruff → unittest → pip-audit → Construir imagen → Trivy → Publicar en GHCR`

**Frase:** *"Cada símbolo del BPMN tiene un job o step real que lo ejecuta."*

---

## 4) DEMO C — Despliegue independiente por servicio (criterio clave)

- Muestra un run donde solo cambió un servicio: **CI Frontend** y **CI Java** aparecen **`skipped`**, solo corre **CI Python**.
- Explica: uso `dorny/paths-filter` → si solo cambia `python-service/`, únicamente se construye, escanea, publica y despliega **ese** servicio.
- Es el **gateway inclusivo** del BPMN: 1, 2 o los 3.

---

## 5) DEMO D — Imágenes versionadas + aprobación

- **PACKAGES_GHCR**: los 3 paquetes `analyticore-*` con tags `latest` y **`sha-<commit>`** (tag inmutable = trazabilidad al commit).
- **ENVIRONMENTS → production**: muestra el **reviewer obligatorio** → *"Producción exige aprobación humana antes de desplegar."*

---

## 6) Cadena de herramientas (di esto de memoria)

| Etapa | Frontend (React) | Python (Flask) | Java (Maven) |
|---|---|---|---|
| Análisis estático / calidad | **ESLint** | **Ruff** | **SpotBugs** |
| Pruebas unitarias | **Vitest** | **unittest** | **JUnit** |
| Vulnerab. dependencias | **npm audit** | **pip-audit** | **OWASP Dependency-Check** |
| Imagen Docker | **Trivy** | **Trivy** | **Trivy** |
| Secretos (todo el repo) | **Gitleaks** | | |
| Registro | **GHCR** (Docker) | | |
| Despliegue | **Render** (staging en CI + prod image-backed) | | |

---

## 7) Seguridad integrada en TODO el flujo (shift-left)

1. **Antes de construir** → Gitleaks bloquea secretos.
2. **Dependencias** → npm audit / pip-audit / OWASP revisan CVEs.
3. **Imagen** → Trivy escanea antes de publicar.
4. **Solo lo escaneado** llega a GHCR y a producción.
5. **Antes de prod** → aprobación humana (GitHub Environments).
6. **Después del deploy** → health check + **rollback** automático.

**Presume esto:** *"Cuando Trivy encontró CVEs reales en las imágenes base, las remedié (en Python purgué pip/setuptools/wheel; en Java apliqué `apk upgrade`). El gate hizo su trabajo, no lo silencié."*

---

## 8) Preguntas probables + respuestas

- **¿Por qué gateway inclusivo?** Un cambio puede afectar 1, 2 o 3 servicios; no obligas a ejecutar todos ni limitas a uno.
- **¿Por qué no hay flecha de retorno al fallar?** Cada ejecución es inmutable; la corrección es un nuevo commit → pipeline nuevo.
- **¿Cómo logras despliegue independiente?** `paths-filter` + jobs condicionales + deploy por servicio con su `service ID`.
- **¿Y si producción queda inestable?** `render-deploy.sh` hace health check y **rollback** al deploy anterior.
- **¿Por qué GHCR y no reconstruir en Render?** Para desplegar la **misma imagen escaneada** (integridad de la cadena) y evitar doble build.
- **¿Qué aporta DevSecOps vs DevOps?** La seguridad está **integrada y automatizada** desde el commit, no como revisión manual al final.

---

## 9) Decisiones de ingeniería (muestra madurez si hay tiempo)

- **Staging en CI (docker-compose efímero):** el free de Render solo permite 1 PostgreSQL por workspace; levantar el stack con una base desechable en el runner da **aislamiento real** sin costo y cumple la intención del BPMN.
- **OWASP no-bloqueante:** NVD rate-limita la IP compartida de los runners (403 aun con key válida). Corre y reporta; **Trivy** es el gate duro. Se vuelve bloqueante con caché NVD poblada.
- **Tag `sha-<commit>` inmutable:** cada deploy es trazable; el rollback restaura el deploy live previo.

---

## 10) Cierre

> *"En resumen: un pipeline que valida calidad, integra seguridad en cada capa, construye y publica imágenes trazables, despliega cada servicio de forma autónoma, y llega a producción con aprobación humana y rollback. Está operativo y verificado en vivo, no solo diagramado."*
