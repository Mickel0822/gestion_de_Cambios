FROM python:3.11-slim

WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt .
# Parchear herramientas de build y luego retirarlas: la imagen de runtime no las
# necesita (gunicorn 26 no usa setuptools/pkg_resources). Elimina 2 HIGH de Trivy
# (jaraco.context en setuptools/_vendor y wheel).
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y setuptools wheel

# Copiar la aplicación y estructura de arquitectura limpia
COPY --chown=app:app src/ ./src
COPY --chown=app:app app.py .

USER app

# Puerto (Render lo asigna dinámicamente)
ENV PORT=5000
EXPOSE $PORT

# Uso de JSON format + exec para propagar señales del sistema correctamente a Gunicorn
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-1} --timeout ${GUNICORN_TIMEOUT_SECONDS:-180} --access-logfile - app:app"]
