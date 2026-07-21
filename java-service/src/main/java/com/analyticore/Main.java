package com.analyticore;

import com.analyticore.application.usecases.ProcessJobUseCase;
import com.analyticore.infra.controllers.HealthController;
import com.analyticore.infra.controllers.JobController;
import com.analyticore.infra.database.PostgresJobRepository;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class Main {
    public static void main(String[] args) {
        String databaseUrl = System.getenv("DATABASE_URL");
        int port = environmentInt("PORT", 8080);
        int workers = environmentInt("WORKER_THREADS", 2);
        int queueCapacity = environmentInt("WORKER_QUEUE_CAPACITY", 50);
        String internalApiKey = System.getenv("INTERNAL_API_KEY");

        if (internalApiKey == null || internalApiKey.isBlank()) {
            throw new IllegalStateException("INTERNAL_API_KEY es obligatoria para iniciar el servicio Java.");
        }

        PostgresJobRepository repository = new PostgresJobRepository(databaseUrl);
        ProcessJobUseCase useCase = new ProcessJobUseCase(repository);
        ThreadPoolExecutor workerPool = new ThreadPoolExecutor(workers, workers, 0L, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(queueCapacity), new ThreadPoolExecutor.AbortPolicy());

        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
            server.createContext("/process-job", new JobController(useCase, workerPool, internalApiKey));
            server.createContext("/health", new HealthController(repository));
            server.start();
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                server.stop(2);
                workerPool.shutdown();
            }));
            System.out.println("AnalytiCore Java escuchando en 0.0.0.0:" + port);
        } catch (IOException error) {
            workerPool.shutdownNow();
            throw new IllegalStateException("No se pudo iniciar el servidor Java.", error);
        }
    }

    private static int environmentInt(String name, int defaultValue) {
        try {
            String value = System.getenv(name);
            return value == null || value.isBlank() ? defaultValue : Integer.parseInt(value);
        } catch (NumberFormatException error) {
            return defaultValue;
        }
    }
}
