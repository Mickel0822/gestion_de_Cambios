package com.analyticore.application.usecases;

import com.analyticore.domain.entities.Job;
import com.analyticore.domain.repositories.JobRepository;

import java.text.Normalizer;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

public class ProcessJobUseCase {
    private static final Set<String> POSITIVE_WORDS = Set.of(
        "bueno", "excelente", "genial", "feliz", "encanta", "amor", "buena", "bien",
        "increible", "maravilloso", "gusto", "satisfecho", "satisfecha"
    );
    private static final Set<String> NEGATIVE_WORDS = Set.of(
        "malo", "pesimo", "horrible", "triste", "enojo", "odio", "mala", "mal",
        "terrible", "desastre", "fracaso", "decepcion"
    );
    private static final Set<String> STOP_WORDS = Set.of(
        "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "y", "o", "pero",
        "para", "por", "con", "sin", "sobre", "en", "que", "como", "este", "esta", "estos", "estas", "es",
        "son", "se", "lo", "mi", "tu", "su", "nos", "me", "te", "le", "les", "nosotros", "ellos", "ellas",
        "muy", "mas", "tambien", "sino", "entonces", "cuando", "donde", "quien", "cual", "cuales"
    );

    private final JobRepository repository;

    public ProcessJobUseCase(JobRepository repository) {
        this.repository = repository;
    }

    public void execute(int jobId) {
        Job job = repository.getById(jobId);
        if (job == null) throw new IllegalArgumentException("Trabajo con ID " + jobId + " no encontrado.");
        if ("COMPLETADO".equals(job.getStatus()) || "PROCESANDO".equals(job.getStatus())) return;

        try {
            job.setStatus("PROCESANDO");
            job.setErrorMessage(null);
            repository.update(job);

            job.setSentiment(analyzeSentiment(job.getText()));
            job.setKeywords(extractKeywords(job.getText()));
            job.setStatus("COMPLETADO");
            repository.update(job);
        } catch (RuntimeException error) {
            job.setStatus("ERROR");
            job.setErrorMessage(safeMessage(error));
            try {
                repository.update(job);
            } catch (RuntimeException updateError) {
                error.addSuppressed(updateError);
            }
            throw error;
        }
    }

    private String safeMessage(RuntimeException error) {
        String message = error.getMessage() == null ? "Error inesperado durante el análisis." : error.getMessage();
        return message.length() > 500 ? message.substring(0, 500) : message;
    }

    private String analyzeSentiment(String text) {
        List<String> words = normalizedWords(text);
        long positive = words.stream().filter(POSITIVE_WORDS::contains).count();
        long negative = words.stream().filter(NEGATIVE_WORDS::contains).count();
        if (positive > negative) return "POSITIVO";
        if (negative > positive) return "NEGATIVO";
        return "NEUTRO";
    }

    private String extractKeywords(String text) {
        List<String> candidates = normalizedWords(text).stream()
            .filter(word -> word.length() > 4 && !STOP_WORDS.contains(word))
            .toList();
        Map<String, Long> frequencies = candidates.stream().collect(Collectors.groupingBy(
            Function.identity(), LinkedHashMap::new, Collectors.counting()));
        return frequencies.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(7)
            .map(Map.Entry::getKey)
            .collect(Collectors.joining(", "));
    }

    private List<String> normalizedWords(String text) {
        if (text == null || text.isBlank()) return List.of();
        String normalized = Normalizer.normalize(text.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        return Arrays.stream(normalized.split("[^a-zñ]+"))
            .filter(word -> !word.isBlank())
            .toList();
    }
}
