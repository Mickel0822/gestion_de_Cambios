# Etapa 1: Construcción
FROM node:20-alpine AS build

WORKDIR /app

# Copiar configuración de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código y compilar la app React
COPY . .
RUN npm run build

# Etapa 2: Servir archivos estáticos con Nginx
FROM nginx:alpine

# Copiar los archivos compilados al directorio público de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración básica de Nginx para soportar Single Page Applications (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Render asigna el puerto mediante la variable PORT.
# Hacemos que Nginx escuche dinámicamente en el puerto de Render.
CMD ["sh", "-c", "sed -i 's/listen       80;/listen '$PORT';/g' /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
