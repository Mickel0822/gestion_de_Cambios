package com.analyticore.infra.controllers;

import com.analyticore.application.usecases.ProcessJobUseCase;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;

public final class JobController implements HttpHandler {
    private final ProcessJobUseCase useCase;
    private final ExecutorService workerPool;
    private final String internalApiKey;
    private final Gson gson = new Gson();

    public JobController(ProcessJobUseCase useCase, ExecutorService workerPool, String internalApiKey) {
        if (internalApiKey == null || internalApiKey.isBlank()) {
            throw new IllegalArgumentException("INTERNAL_API_KEY es obligatoria.");
        }
        this.useCase = useCase;
        this.workerPool = workerPool;
        this.internalApiKey = internalApiKey;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendJson(exchange, 405, Map.of("error", "Método no permitido."));
            return;
        }
        if (!internalApiKey.equals(exchange.getRequestHeaders().getFirst("X-Internal-Api-Key"))) {
            sendJson(exchange, 401, Map.of("error", "Credencial interna inválida."));
            return;
        }

        try (InputStreamReader reader = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8)) {
            JsonObject body = gson.fromJson(reader, JsonObject.class);
            if (body == null || !body.has("jobId") || !body.get("jobId").isJsonPrimitive()) {
                sendJson(exchange, 400, Map.of("error", "El campo jobId es requerido."));
                return;
            }
            int jobId = body.get("jobId").getAsInt();
            workerPool.submit(() -> {
                try {
                    useCase.execute(jobId);
                } catch (RuntimeException error) {
                    System.err.println("Falló el trabajo #" + jobId + ": " + error.getMessage());
                    error.printStackTrace();
                }
            });
            sendJson(exchange, 202, Map.of("jobId", jobId, "status", "ACEPTADO"));
        } catch (RejectedExecutionException error) {
            sendJson(exchange, 503, Map.of("error", "La cola de análisis está llena. Intenta nuevamente."));
        } catch (RuntimeException error) {
            sendJson(exchange, 400, Map.of("error", "El cuerpo de la petición no es válido."));
        }
    }

    private void sendJson(HttpExchange exchange, int statusCode, Map<String, ?> response) throws IOException {
        byte[] bytes = gson.toJson(response).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}
