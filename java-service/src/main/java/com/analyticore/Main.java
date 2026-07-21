package com.analyticore;

import com.analyticore.application.usecases.ProcessJobUseCase;
import com.analyticore.infra.controllers.JobController;
import com.analyticore.infra.database.PostgresJobRepository;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;

public class Main {
    public static void main(String[] args) {
        // 1. Cargar variables de entorno
        String databaseUrl = System.getenv("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isEmpty()) {
            System.err.println("Advertencia: La variable DATABASE_URL no está configurada.");
        }

        int port = 8080;
        String portEnv = System.getenv("PORT");
        if (portEnv != null && !portEnv.isEmpty()) {
            try {
                port = Integer.parseInt(portEnv);
            } catch (NumberFormatException e) {
                System.err.println("Puerto inválido en PORT. Usando puerto por defecto: 8080");
            }
        }

        // 2. Inyección de Dependencias Manual (Arquitectura Limpia)
        // a. Capa de Infraestructura (Base de datos)
        PostgresJobRepository repository = new PostgresJobRepository(databaseUrl);

        // b. Capa de Aplicación (Caso de Uso)
        ProcessJobUseCase useCase = new ProcessJobUseCase(repository);

        // c. Capa de Interfaz (Controlador)
        JobController controller = new JobController(useCase);

        // 3. Inicialización del servidor HTTP (Sun HttpServer nativo)
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
            server.createContext("/process-job", controller);
            server.setExecutor(null); // crea un ejecutor por defecto
            server.start();
            System.out.println("Servidor Java (Análisis) ejecutándose en el puerto " + port);
            System.out.println("Endpoint disponible en: POST http://localhost:" + port + "/process-job");
        } catch (IOException e) {
            System.err.println("Error al iniciar el servidor HTTP Java: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
