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

public class JobController implements HttpHandler {
    private final ProcessJobUseCase useCase;
    private final Gson gson = new Gson();

    public JobController(ProcessJobUseCase useCase) {
        this.useCase = useCase;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        // Habilitar CORS
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "POST, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Método no permitido. Utilizar POST.");
            return;
        }

        try {
            // Leer el cuerpo JSON
            InputStreamReader reader = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
            JsonObject body = gson.fromJson(reader, JsonObject.class);
            
            if (body == null || !body.has("jobId")) {
                sendResponse(exchange, 400, "Cuerpo inválido. El campo 'jobId' es requerido.");
                return;
            }

            int jobId = body.get("jobId").getAsInt();

            // Responder de inmediato (202 Accepted) y procesar de manera asíncrona.
            // Esto permite que el flujo de datos no se bloquee y que el polling del frontend
            // pueda registrar de verdad el estado 'PROCESANDO'.
            new Thread(() -> {
                try {
                    useCase.execute(jobId);
                } catch (Exception e) {
                    System.err.println("Error procesando el trabajo de análisis #" + jobId + ": " + e.getMessage());
                    e.printStackTrace();
                }
            }).start();

            sendResponse(exchange, 202, "Trabajo recibido. Iniciando análisis en segundo plano.");

        } catch (Exception e) {
            e.printStackTrace();
            sendResponse(exchange, 500, "Error interno: " + e.getMessage());
        }
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String responseText) throws IOException {
        byte[] bytes = responseText.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
