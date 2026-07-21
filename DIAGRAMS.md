# Diagramas de Arquitectura - AnalytiCore

Este documento contiene el **Diagrama de Componentes** y los **Diagramas de Capas** (Clean Architecture) de cada uno de los microservicios de la plataforma "AnalytiCore".

---

## 1. Diagrama de Componentes (Arquitectura General)

Muestra la interacción a través de la red (APIs REST) de los contenedores Docker desplegados y la base de datos centralizada en Render.

```mermaid
graph TD
    subgraph Red_Publica [Red Pública / Cliente]
        User((Usuario))
        ReactApp[Contenedor 1: React Frontend<br/>Servido por Nginx<br/>Puerto: $PORT]
    end

    subgraph Red_Privada [Red Privada Render]
        PythonApp[Contenedor 2: Python Service<br/>Flask + Gunicorn<br/>Puerto: $PORT]
        JavaApp[Contenedor 3: Java Service<br/>HttpServer Nativo<br/>Puerto: $PORT]
        Postgres[(Base de Datos:<br/>PostgreSQL Render)]
    end

    User -->|Navega / Interactúa| ReactApp
    ReactApp -->|1. Envía Texto & 4. Polling de Estado<br/>HTTP REST /analyze| PythonApp
    PythonApp -->|2. Inserta Trabajo PENDIENTE| Postgres
    PythonApp -->|3. Notifica Trabajo síncronamente<br/>HTTP REST /process-job| JavaApp
    JavaApp -->|5. Cambia estado a PROCESANDO| Postgres
    JavaApp -->|6. Analiza sentimiento y palabras clave| JavaApp
    JavaApp -->|7. Registra resultados y estado COMPLETADO| Postgres

    style ReactApp fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    style PythonApp fill:#3776ab,stroke:#333,stroke-width:2px,color:#fff
    style JavaApp fill:#ed8b00,stroke:#333,stroke-width:2px,color:#fff
    style Postgres fill:#336791,stroke:#333,stroke-width:2px,color:#fff
```

---

## 2. Diagramas de Capas (Arquitectura Limpia Interna)

La regla de dependencia establece que las capas externas solo conocen y dependen de las capas internas.

### A. Componente 1: Frontend (`frontend`)

```mermaid
graph RL
    subgraph Capa_Presentacion [Capa de Presentación - React]
        UI[App.jsx Components<br/>Formularios, Vistas de Estado, Historial]
    end

    subgraph Capa_Adaptadores [Capa de Adaptadores / Clientes]
        APIClient[fetch / Axios Client<br/>Llamadas a /analyze y /jobs]
    end

    UI -->|Depende de| APIClient
    APIClient -.->|Envía peticiones HTTP| PythonService((Servicio Python))
    
    style UI fill:#bbf,stroke:#333,stroke-width:2px,color:#000
    style APIClient fill:#dfd,stroke:#333,stroke-width:2px,color:#000
```

### B. Componente 2: Python Service (`python-service`)

```mermaid
graph TD
    subgraph Interfaz_Infraestructura [Capa de Interfaz y Adaptadores]
        Routes[Flask App / Rutas<br/>POST /analyze y GET /jobs]
        DBRepo[PostgresJobRepository<br/>psycopg2 SQL queries]
        HttpClient[HttpAnalysisServiceClient<br/>requests API Client]
    end

    subgraph Aplicacion [Capa de Aplicación - Casos de Uso]
        UC1[SubmitJobUseCase]
        UC2[GetJobStatusUseCase]
        UC3[CheckHealthUseCase]
    end

    subgraph Dominio [Capa de Dominio - Core]
        Job[Entidad: Job]
        JobRepoInterface[Interfaz: JobRepository]
        ClientInterface[Interfaz: AnalysisServiceClient]
    end

    %% Relaciones de dependencia
    Routes -->|Invoca| UC1
    Routes -->|Invoca| UC2
    
    UC1 -->|Usa| JobRepoInterface
    UC1 -->|Usa| ClientInterface
    UC2 -->|Usa| JobRepoInterface
    
    DBRepo -->|Implementa| JobRepoInterface
    HttpClient -->|Implementa| ClientInterface
    
    JobRepoInterface -->|Retorna| Job

    style Dominio fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style Aplicacion fill:#bbf,stroke:#333,stroke-width:2px,color:#000
    style Interfaz_Infraestructura fill:#dfd,stroke:#333,stroke-width:2px,color:#000
```

### C. Componente 3: Java Service (`java-service`)

```mermaid
graph TD
    subgraph Java_Interfaz [Capa de Interfaz y Adaptadores]
        Server[HttpServer Nativo<br/>JobController /process-job]
        JDBCRepo[PostgresJobRepository<br/>JDBC queries]
    end

    subgraph Java_Aplicacion [Capa de Aplicación - Casos de Uso]
        UCJava[ProcessJobUseCase<br/>Sentiment Analysis & Keywords]
    end

    subgraph Java_Dominio [Capa de Dominio - Core]
        JobJava[Entidad: Job]
        JobRepoJavaInterface[Interfaz: JobRepository]
    end

    %% Relaciones de dependencia
    Server -->|Invoca en Hilo Asíncrono| UCJava
    UCJava -->|Usa| JobRepoJavaInterface
    JDBCRepo -->|Implementa| JobRepoJavaInterface
    JobRepoJavaInterface -->|Manipula| JobJava

    style Java_Dominio fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style Java_Aplicacion fill:#bbf,stroke:#333,stroke-width:2px,color:#000
    style Java_Interfaz fill:#dfd,stroke:#333,stroke-width:2px,color:#000
```
