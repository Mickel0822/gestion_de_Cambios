# Etapa 1: Construcción
FROM node:20-alpine AS build

WORKDIR /app

# Copiar configuración de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci

# Copiar el resto del código y compilar la app React
COPY . .
ARG VITE_API_URL
ARG VITE_MAX_TEXT_LENGTH=5000
ARG VITE_RETRY_AFTER_SECONDS=120
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MAX_TEXT_LENGTH=$VITE_MAX_TEXT_LENGTH
ENV VITE_RETRY_AFTER_SECONDS=$VITE_RETRY_AFTER_SECONDS
RUN npm run build

# Etapa 2: Servir archivos estáticos con Nginx
FROM nginxinc/nginx-unprivileged:alpine

# Copiar los archivos compilados al directorio público de Nginx
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copiar configuración básica de Nginx para soportar Single Page Applications (SPA)
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

USER nginx
EXPOSE 8080
