FROM python:3.11-slim

WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt .
# La imagen de runtime no necesita herramientas de build (gunicorn 26 no usa
# setuptools/pkg_resources). Se instalan las dependencias (wheels binarios) y
# luego se retiran setuptools/wheel de site-packages y los wheels que Python
# trae empaquetados en ensurepip/_bundled, que Trivy tambien escanea. Elimina
# los HIGH de la imagen base (p.ej. setuptools CVE-2025-47273).
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y setuptools wheel 2>/dev/null || true \
    && rm -rf /usr/local/lib/python3.11/ensurepip \
       /usr/local/lib/python3.11/site-packages/setuptools* \
       /usr/local/lib/python3.11/site-packages/pkg_resources* \
       /usr/local/lib/python3.11/site-packages/wheel*

# Copiar la aplicación y estructura de arquitectura limpia
COPY --chown=app:app src/ ./src
COPY --chown=app:app app.py .

USER app

# Puerto (Render lo asigna dinámicamente)
ENV PORT=5000
EXPOSE $PORT

# Uso de JSON format + exec para propagar señales del sistema correctamente a Gunicorn
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-1} --timeout ${GUNICORN_TIMEOUT_SECONDS:-180} --access-logfile - app:app"]
