# INFORME EJECUTIVO: Plataforma "AnalytiCore"

**Para:** Comité de Dirección, AnalytiCore  
**De:** Departamento de Arquitectura de Software  
**Fecha:** 14 de Julio de 2026  
**Asunto:** Prototipo de Arquitectura Orientada a Servicios en la Nube  

---

### 1. El Problema de Negocio
En el dinámico mercado actual, las organizaciones generan grandes volúmenes de texto (comentarios de clientes, correos, publicaciones en redes sociales) que contienen información valiosa sobre su reputación e intereses. Sin embargo, procesar esta información manualmente es ineficiente y costoso. "AnalytiCore" busca capturar esta oportunidad de negocio ofreciendo un servicio en línea rápido, automatizado y escalable de análisis de sentimiento y extracción de palabras clave, que permita a las empresas tomar decisiones basadas en datos en tiempo real.

### 2. La Solución Propuesta y su Valor
Desarrollamos un prototipo funcional basado en una **Arquitectura Orientada a Servicios (SOA)** y contenedorizado con **Docker**, listo para desplegarse en la plataforma de nube **Render**. 
La solución consta de tres componentes desacoplados:
*   **Interfaz de Usuario (React):** Una aplicación moderna y responsiva que permite interactuar con el sistema, enviar textos y ver los resultados en tiempo real de forma visual.
*   **Servicio de Submisión (Python):** Actúa como puerta de entrada segura y orquestador, registrando de inmediato las solicitudes y respondiendo rápidamente al usuario.
*   **Servicio de Análisis (Java):** Un componente de procesamiento dedicado que ejecuta de forma asíncrona algoritmos de lenguaje natural para categorizar el texto y extraer palabras de valor.
*   **Persistencia (PostgreSQL):** Una base de datos relacional externa administrada que centraliza y sincroniza el estado de las solicitudes.

**Valor para el Negocio:** Al separar la interfaz del motor de procesamiento, el usuario experimenta una respuesta instantánea (alta disponibilidad percibida), mientras que el análisis pesado se delega a un motor especializado sin interferir en la experiencia del usuario.

### 3. Beneficios de la Arquitectura Políglota y Multicontenedor

*   **1. Escalabilidad Independiente (Eficiencia de Costos):** 
    En días de alto tráfico, la fase de recepción (Python) y la de análisis (Java) experimentan cargas diferentes. Esta arquitectura permite escalar horizontalmente solo el componente que lo necesite. Por ejemplo, podemos instanciar 5 réplicas del servicio de Java (procesador pesado) y mantener una sola del de Python, optimizando el uso de recursos y disminuyendo costos de infraestructura en la nube.
*   **2. Mantenibilidad y Flexibilidad del Equipo (Estrategia Políglota):** 
    Cada microservicio utiliza el lenguaje de programación idóneo para su propósito: Python por su agilidad y velocidad de desarrollo de APIs, y Java por su robustez, rendimiento y soporte multihilo para tareas de procesamiento pesado. Esto permite incorporar desarrolladores con distintos perfiles técnicos para trabajar en paralelo en diferentes secciones del repositorio, minimizando conflictos en el código y acelerando el tiempo de salida al mercado (*Time-to-Market*).
*   **3. Resiliencia y Tolerancia a Fallos:** 
    Si el motor de análisis en Java sufre una interrupción temporal, el servicio de submisión en Python y el frontend en React seguirán funcionando. Los usuarios podrán seguir enviando textos para análisis y el sistema los almacenará con estado `PENDIENTE`. Una vez que el servicio de Java se restablezca, procesará la cola de trabajos sin pérdida de datos para el negocio.
*   **4. Arquitectura Limpia e Independencia Tecnológica:** 
    Los tres componentes están diseñados bajo la regla de dependencias de la Arquitectura Limpia. Esto significa que las reglas de negocio están totalmente separadas de la base de datos o de los frameworks web. Si en el futuro se decide cambiar la interfaz web React por una app móvil, o cambiar PostgreSQL por otra base de datos, el impacto en el código será mínimo y localizado.
