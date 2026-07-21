# Diagramas de arquitectura de AnalytiCore

## 1. Diagrama de componentes

```mermaid
flowchart LR
    User((Usuario)) -->|HTTPS| Frontend[React + Nginx\nContenedor frontend]
    Frontend -->|POST /analyze\nGET /jobs/:id\nPOST /jobs/:id/retry| Python[Flask + Gunicorn\nServicio de submisión]
    Python -->|POST /process-job\nX-Internal-Api-Key| Java[Java 17\nServicio de análisis]
    Python <-->|SQL| DB[(PostgreSQL)]
    Java <-->|SQL| DB

    Java -.->|202 Aceptado| Python
    Python -.->|201 + jobId| Frontend
```

En Render gratuito los tres contenedores son Web Services. Java es públicamente direccionable, pero su operación de procesamiento exige una credencial compartida. En un plan pagado Java debe convertirse en Private Service.

## 2. Flujo de un trabajo

```mermaid
sequenceDiagram
    actor U as Usuario
    participant F as React
    participant P as Python
    participant D as PostgreSQL
    participant J as Java
    U->>F: Envía texto
    F->>P: POST /analyze
    P->>D: INSERT estado PENDIENTE
    P->>J: POST /process-job (con reintentos)
    alt Java acepta
        J-->>P: 202 ACEPTADO
        P-->>F: 201 jobId
        J->>D: UPDATE PROCESANDO
        J->>J: Sentimiento + palabras clave
        J->>D: UPDATE COMPLETADO
    else Java no disponible
        P->>D: UPDATE ERROR + detalle
        P-->>F: 201 jobId + ERROR
        F->>P: POST /jobs/:id/retry
    end
    loop Polling mientras está activo
        F->>P: GET /jobs/:id
        P->>D: SELECT trabajo
        P-->>F: Estado y resultado
    end
```

## 3. Capas del frontend

```mermaid
flowchart TB
    Composition[App.jsx\nComposition Root]
    Presentation[Presentación\nHeader, Composer, Results, History]
    Application[Aplicación\nuseJobAnalysis y polling]
    Domain[Dominio\nJobStatus y reglas de estado]
    Api[Infraestructura\napiClient]
    Storage[Infraestructura\nhistoryStorage + configuration]

    Composition --> Presentation
    Composition --> Application
    Composition --> Api
    Composition --> Storage
    Presentation --> Domain
    Application --> Domain
    Application -. puertos inyectados .-> Api
    Application -. puertos inyectados .-> Storage
    Api --> PythonService((API Python))
```

`App.jsx` actúa como Composition Root e inyecta los adaptadores externos al caso de uso React. La aplicación no importa directamente infraestructura.

## 4. Capas del servicio Python

```mermaid
flowchart TB
    Flask[Interfaz\nFlask routes + CORS]
    UseCases[Aplicación\nSubmit, Get, Retry, Health]
    Entity[Dominio\nJob]
    Ports[Dominio\nJobRepository + AnalysisServiceClient]
    Pg[Infraestructura\nPostgresJobRepository]
    Http[Infraestructura\nHttpAnalysisServiceClient]

    Flask --> UseCases
    UseCases --> Entity
    UseCases --> Ports
    Pg -. implementa .-> Ports
    Http -. implementa .-> Ports
    Pg --> PostgreSQL[(PostgreSQL)]
    Http --> JavaService((API Java))
```

## 5. Capas del servicio Java

```mermaid
flowchart TB
    Controllers[Interfaz\nJobController + HealthController]
    UseCase[Aplicación\nProcessJobUseCase]
    Entity[Dominio\nJob]
    Port[Dominio\nJobRepository]
    JDBC[Infraestructura\nPostgresJobRepository]
    Pool[Infraestructura de ejecución\nThreadPool + cola acotada]

    Controllers --> UseCase
    Controllers --> Pool
    UseCase --> Entity
    UseCase --> Port
    JDBC -. implementa .-> Port
    JDBC --> PostgreSQL[(PostgreSQL)]
```
