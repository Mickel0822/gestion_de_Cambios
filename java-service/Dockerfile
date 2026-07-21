# Etapa 1: Compilación
FROM maven:3.9-eclipse-temurin-17-alpine AS build

WORKDIR /app

# Copiar archivo pom.xml para descargar dependencias
COPY pom.xml .

# Descargar dependencias en caché
RUN mvn dependency:go-offline

# Copiar el código fuente y compilar el jar ejecutable
COPY src ./src
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copiar el jar compilado desde la etapa de construcción
COPY --from=build /app/target/java-service-1.0-SNAPSHOT.jar ./app.jar

# Configuración del puerto
ENV PORT=8080
EXPOSE $PORT

# Comando para ejecutar la aplicación
CMD ["sh", "-c", "exec java -jar app.jar"]
