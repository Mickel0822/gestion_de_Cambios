# Informe ejecutivo: AnalytiCore

**Fecha:** 21 de julio de 2026
**Propósito:** Prototipo de arquitectura orientada a servicios en la nube

## Problema de negocio

Las organizaciones reciben grandes cantidades de comentarios, reseñas y mensajes que contienen señales valiosas sobre la satisfacción de sus clientes. Revisarlos manualmente consume tiempo, dificulta reaccionar con rapidez y no escala cuando aumenta el volumen. AnalytiCore permite enviar un texto y obtener una lectura simple de su sentimiento junto con las palabras que más se repiten y aportan significado.

## Solución y valor

La solución separa la experiencia de usuario, la recepción de solicitudes, el análisis y la persistencia. React ofrece una interfaz clara y responsive; Python valida cada solicitud, registra un trabajo y coordina su procesamiento; Java analiza el texto; PostgreSQL conserva el estado y el resultado. El usuario recibe un identificador y observa la transición entre pendiente, procesando, completado o error sin perder trazabilidad.

Cada componente está empaquetado en su propia imagen Docker y se despliega independientemente en Render. Si Java tarda en iniciar o no responde, Python realiza reintentos y registra un estado de error visible. El usuario puede volver a solicitar el procesamiento, evitando trabajos bloqueados indefinidamente.

## Beneficios arquitectónicos

- **Escalabilidad:** frontend, recepción y análisis pueden crecer de manera independiente según su carga.
- **Mantenibilidad:** la arquitectura limpia separa reglas de negocio, casos de uso e infraestructura, reduciendo el impacto de los cambios.
- **Flexibilidad tecnológica:** React, Python y Java permiten asignar cada responsabilidad a una tecnología apropiada y habilitan trabajo paralelo del equipo.
- **Trazabilidad:** PostgreSQL es la fuente de verdad; los servicios no dependen de estado persistente en memoria.
- **Seguridad operativa:** el motor Java exige una credencial interna y la API Python restringe el origen autorizado del frontend.

AnalytiCore demuestra la viabilidad técnica de una arquitectura políglota y contenedorizada. El análisis lingüístico es deliberadamente sencillo para el prototipo; la separación actual permite sustituirlo posteriormente por un modelo más avanzado o incorporar una cola durable sin rediseñar toda la plataforma.
