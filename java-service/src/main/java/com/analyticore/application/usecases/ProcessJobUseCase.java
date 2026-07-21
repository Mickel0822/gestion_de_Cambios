package com.analyticore.application.usecases;

import com.analyticore.domain.entities.Job;
import com.analyticore.domain.repositories.JobRepository;
import java.util.*;
import java.util.stream.Collectors;

public class ProcessJobUseCase {
    private final JobRepository repository;

    public ProcessJobUseCase(JobRepository repository) {
        this.repository = repository;
    }

    public void execute(int jobId) {
        Job job = repository.getById(jobId);
        if (job == null) {
            System.out.println("Error: Trabajo con ID " + jobId + " no encontrado.");
            return;
        }

        // 1. Cambiar estado a PROCESANDO y actualizar base de datos
        job.setStatus("PROCESANDO");
        repository.update(job);
        System.out.println("Trabajo #" + jobId + " marcado como PROCESANDO.");

        // Simular retardo de análisis de 1 segundo
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // 2. Ejecutar análisis de sentimiento simple
        String text = job.getText();
        String sentiment = analyzeSentiment(text);
        job.setSentiment(sentiment);

        // 3. Ejecutar extracción de palabras clave
        String keywords = extractKeywords(text);
        job.setKeywords(keywords);

        // 4. Cambiar estado a COMPLETADO y actualizar base de datos
        job.setStatus("COMPLETADO");
        repository.update(job);
        System.out.println("Trabajo #" + jobId + " analizado con éxito y marcado como COMPLETADO.");
    }

    private String analyzeSentiment(String text) {
        if (text == null) return "NEUTRO";
        String normalized = text.toLowerCase();
        
        List<String> positiveWords = Arrays.asList(
            "bueno", "excelente", "genial", "feliz", "encanta", "amor", "buena", "bien", "increible", "maravilloso", "gusto", "satisfecho"
        );
        List<String> negativeWords = Arrays.asList(
            "malo", "pesimo", "horrible", "triste", "enojo", "odio", "mala", "mal", "terrible", "desastre", "fracaso", "decepcion"
        );

        int positiveCount = 0;
        int negativeCount = 0;

        for (String word : positiveWords) {
            if (normalized.contains(word)) {
                positiveCount++;
            }
        }
        for (String word : negativeWords) {
            if (normalized.contains(word)) {
                negativeCount++;
            }
        }

        if (positiveCount > negativeCount) {
            return "POSITIVO";
        } else if (negativeCount > positiveCount) {
            return "NEGATIVO";
        }
        return "NEUTRO";
    }

    private String extractKeywords(String text) {
        if (text == null || text.trim().isEmpty()) return "";
        
        // Remover signos de puntuación básicos
        String cleaned = text.replaceAll("[^a-zA-ZáéíóúñÁÉÍÓÚÑ\\s]", "");
        String[] words = cleaned.split("\\s+");

        // Stop words comunes en español para filtrar
        Set<String> stopWords = new HashSet<>(Arrays.asList(
            "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "y", "o", "pero", "para", 
            "por", "con", "sin", "sobre", "en", "que", "como", "este", "esta", "estos", "estas", "es", "son",
            "se", "lo", "mi", "tu", "su", "nos", "me", "te", "le", "les", "nosotros", "ellos", "ellas", "muy",
            "mas", "tambien", "esta", "sino", "entonces", "cuando", "donde", "quien", "cual", "cuales"
        ));

        List<String> candidates = new ArrayList<>();
        for (String word : words) {
            String lw = word.toLowerCase().trim();
            // Filtrar palabras cortas o que sean stop words
            if (lw.length() > 4 && !stopWords.contains(lw)) {
                candidates.add(lw);
            }
        }

        // Obtener palabras únicas ordenadas por frecuencia o simplemente distintas (primeras 5)
        return candidates.stream()
            .distinct()
            .limit(5)
            .collect(Collectors.joining(", "));
    }
}
