FROM python:3.11-slim

WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt .
# La imagen de runtime no necesita herramientas de empaquetado: gunicorn 26,
# Flask y psycopg2 no usan pip/setuptools/pkg_resources en ejecucion. Tras
# instalar las dependencias se purgan pip, setuptools, wheel, pkg_resources y
# ensurepip (incluidos sus paquetes vendored como msgpack), que la imagen base
# arrastra y Trivy marca como HIGH.
RUN pip install --no-cache-dir -r requirements.txt \
    && find /usr/local/lib/python3.11 -depth \( \
         -name 'pip' -o -name 'pip-*' \
         -o -name 'setuptools' -o -name 'setuptools-*' \
         -o -name 'pkg_resources' \
         -o -name 'wheel' -o -name 'wheel-*' \
         -o -name '_distutils_hack' -o -name 'ensurepip' \
       \) -exec rm -rf {} + \
    && rm -rf /usr/local/bin/pip /usr/local/bin/pip3 /usr/local/bin/wheel

# Copiar la aplicación y estructura de arquitectura limpia
COPY --chown=app:app src/ ./src
COPY --chown=app:app app.py .

USER app

# Puerto (Render lo asigna dinámicamente)
ENV PORT=5000
EXPOSE $PORT

# Uso de JSON format + exec para propagar señales del sistema correctamente a Gunicorn
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-1} --timeout ${GUNICORN_TIMEOUT_SECONDS:-180} --access-logfile - app:app"]
