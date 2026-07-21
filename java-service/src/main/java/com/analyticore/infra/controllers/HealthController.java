package com.analyticore.infra.controllers;

import com.analyticore.domain.repositories.JobRepository;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class HealthController implements HttpHandler {
    private final JobRepository repository;

    public HealthController(JobRepository repository) {
        this.repository = repository;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(405, -1);
            return;
        }
        boolean healthy = repository.checkHealth();
        byte[] response = (healthy ? "{\"status\":\"healthy\"}" : "{\"status\":\"unhealthy\"}")
            .getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(healthy ? 200 : 503, response.length);
        exchange.getResponseBody().write(response);
        exchange.close();
    }
}
