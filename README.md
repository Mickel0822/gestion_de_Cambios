# AnalytiCore

Prototipo cloud de análisis de sentimiento y extracción de palabras clave construido como una arquitectura orientada a servicios políglota. React ofrece la experiencia de usuario, Python recibe y orquesta trabajos, Java realiza el análisis y PostgreSQL conserva todo el estado de negocio.

## Arquitectura

```text
Navegador → React + Nginx → API Python → API Java
                                ↓           ↓
                              PostgreSQL compartido
```

Cada aplicación se construye en su propia imagen Docker y se comunica exclusivamente mediante HTTP REST. Python y Java son stateless: los estados `PENDIENTE`, `PROCESANDO`, `COMPLETADO` y `ERROR` viven en PostgreSQL. El frontend conserva localmente solo los identificadores de las últimas diez lecturas.

Consulta [DIAGRAMS.md](DIAGRAMS.md) para los diagramas de componentes y capas.

## Requisitos

- Docker Desktop con Docker Compose.
- Para desarrollo sin Docker: Node.js 20+, Python 3.11+ y Java 17 con Maven 3.9+.

## Ejecución local

1. Copia `.env.example` como `.env` y cambia las dos credenciales de desarrollo.
2. Construye e inicia los servicios:

```powershell
docker compose up --build -d --wait
```

3. Abre [http://localhost:3000](http://localhost:3000).
4. Comprueba la salud de las APIs:

```powershell
Invoke-RestMethod http://localhost:5000/health
Invoke-RestMethod http://localhost:8080/health
```

5. Detén el entorno cuando termines:

```powershell
docker compose down
```

Para eliminar también los datos locales de PostgreSQL utiliza `docker compose down -v`.

## Pruebas

```powershell
cd frontend
npm ci
npm run lint
npm test
npm run build

cd ..\python-service
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v

cd ..\java-service
mvn test
```

La verificación completa con contenedores ejecuta un trabajo real de extremo a extremo:

```powershell
.\scripts\smoke-test.ps1
```

El script usa el proyecto Compose aislado `analyticore-smoke` y elimina únicamente sus contenedores y volumen temporal; no modifica el volumen del entorno de desarrollo.

## API

| Método | Ruta | Propósito |
|---|---|---|
| `GET` | `/health` | Salud de la API Python y PostgreSQL |
| `POST` | `/analyze` | Crea y notifica un trabajo |
| `GET` | `/jobs/{id}` | Consulta estado y resultado |
| `POST` | `/jobs/{id}/retry` | Reintenta un trabajo pendiente, en proceso o fallido |
| `GET` | Java `/health` | Salud del worker y PostgreSQL |
| `POST` | Java `/process-job` | Inicia el procesamiento interno |

Ejemplo:

```powershell
$job = Invoke-RestMethod -Method Post -Uri http://localhost:5000/analyze `
  -ContentType 'application/json' -Body '{"text":"El servicio fue excelente"}'
Invoke-RestMethod "http://localhost:5000/jobs/$($job.jobId)"
```

## Variables de entorno

### Python

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | URL de PostgreSQL |
| `JAVA_SERVICE_URL` | URL pública o interna del servicio Java |
| `INTERNAL_API_KEY` | Credencial compartida con Java |
| `FRONTEND_ORIGIN` | Origen CORS permitido; admite valores separados por coma |
| `MAX_TEXT_LENGTH` | Límite del texto; predeterminado `5000` |
| `MAX_REQUEST_BYTES` | Tamaño máximo del cuerpo HTTP; predeterminado `65536` bytes |
| `NOTIFY_MAX_ATTEMPTS` | Intentos para despertar/notificar Java |
| `NOTIFY_TIMEOUT_SECONDS` | Timeout de cada intento |
| `RETRY_AFTER_SECONDS` | Antigüedad mínima para reiniciar un trabajo aún activo; predeterminado `120` |
| `WEB_CONCURRENCY` | Workers HTTP de Gunicorn; Render usa `2` para conservar `/health` durante un arranque en frío |
| `GUNICORN_TIMEOUT_SECONDS` | Tiempo máximo de una petición; Render usa `180` para cubrir los reintentos al worker Java |

### Java

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | URL de PostgreSQL |
| `INTERNAL_API_KEY` | Protege `/process-job` |
| `PORT` | Puerto HTTP |
| `WORKER_THREADS` | Procesamientos simultáneos |
| `WORKER_QUEUE_CAPACITY` | Máximo de trabajos esperando en la instancia |

### Frontend

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL pública de Python, incorporada durante el build |
| `VITE_MAX_TEXT_LENGTH` | Límite mostrado en la interfaz |
| `VITE_RETRY_AFTER_SECONDS` | Espera antes de ofrecer recuperación manual de un trabajo activo |

## Despliegue en Render

El repositorio incluye `render.yaml`. En Render selecciona **New → Blueprint**, conecta el repositorio y confirma los cuatro recursos. El Blueprint crea tres Web Services Docker y PostgreSQL en la misma región, comparte la credencial interna sin escribirla en Git e inyecta las URLs públicas durante el build.

Cuando el despliegue termine:

1. Abre `https://analyticore-python.onrender.com/health`.
2. Abre `https://analyticore-java.onrender.com/health`.
3. Entra al frontend y envía un texto.
4. Confirma en los logs la transición `PENDIENTE → PROCESANDO → COMPLETADO`.

Los nombres pueden recibir un sufijo si ya existen en Render. En ese caso, las referencias del Blueprint siguen enlazando los servicios.

### Limitaciones del plan gratuito

- Los Web Services se suspenden después de un periodo sin tráfico. Python reintenta la notificación a Java para tolerar el arranque en frío.
- El primer análisis puede tardar más de un minuto.
- PostgreSQL gratuito expira después de 30 días y no incluye copias de seguridad.
- Java debe ser un Web Service público en el plan gratuito; `/process-job` permanece protegido por `INTERNAL_API_KEY`.

Para una demostración, abre primero los endpoints `/health` de Java y Python. Para un entorno estable usa instancias pagadas y convierte Java en Private Service.

## Decisiones y límites del prototipo

El análisis utiliza un vocabulario controlado en español y frecuencia de términos, no un modelo de aprendizaje automático. La cola acotada de Java evita crear hilos ilimitados, pero no sustituye a un broker durable. Si el producto creciera, el siguiente paso sería incorporar una cola administrada y migraciones de base de datos versionadas.

El prototipo no implementa cuentas de usuario ni autorización por propietario: los identificadores de trabajo son públicos dentro de la API. No debe usarse con textos sensibles; una evolución de producto debe añadir autenticación, identificadores no enumerables y autorización por trabajo.
