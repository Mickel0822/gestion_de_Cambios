FROM python:3.11-slim

WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar la aplicación y estructura de arquitectura limpia
COPY --chown=app:app src/ ./src
COPY --chown=app:app app.py .

USER app

# Puerto (Render lo asigna dinámicamente)
ENV PORT=5000
EXPOSE $PORT

# Uso de JSON format + exec para propagar señales del sistema correctamente a Gunicorn
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-1} --timeout ${GUNICORN_TIMEOUT_SECONDS:-180} --access-logfile - app:app"]
