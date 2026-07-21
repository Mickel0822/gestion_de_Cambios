FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar la aplicación y estructura de arquitectura limpia
COPY src/ ./src
COPY app.py .

# Puerto (Render lo asigna dinámicamente)
ENV PORT=5000
EXPOSE $PORT

# Uso de JSON format + exec para propagar señales del sistema correctamente a Gunicorn
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:$PORT --workers 1 app:app"]
