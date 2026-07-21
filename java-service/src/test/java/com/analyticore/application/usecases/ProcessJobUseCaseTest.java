package com.analyticore.application.usecases;

import com.analyticore.domain.entities.Job;
import com.analyticore.domain.repositories.JobRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class ProcessJobUseCaseTest {
    @Test
    void detectsPositiveSentimentAndFrequentKeywords() {
        InMemoryRepository repository = new InMemoryRepository(new Job(1,
            "Excelente servicio, excelente atención y experiencia maravillosa", "PENDIENTE", null, null, null, LocalDateTime.now()));
        new ProcessJobUseCase(repository).execute(1);
        assertEquals("COMPLETADO", repository.job.getStatus());
        assertEquals("POSITIVO", repository.job.getSentiment());
        assertTrue(repository.job.getKeywords().startsWith("excelente"));
    }

    @Test
    void matchesWholeWordsAndAccentedVocabulary() {
        InMemoryRepository repository = new InMemoryRepository(new Job(2,
            "El animal está tranquilo, pero el soporte fue pésimo", "PENDIENTE", null, null, null, LocalDateTime.now()));
        new ProcessJobUseCase(repository).execute(2);
        assertEquals("NEGATIVO", repository.job.getSentiment());
    }

    @Test
    void isIdempotentForCompletedJobs() {
        InMemoryRepository repository = new InMemoryRepository(new Job(3, "Excelente", "COMPLETADO", "POSITIVO", "excelente", null, LocalDateTime.now()));
        new ProcessJobUseCase(repository).execute(3);
        assertEquals(0, repository.updates);
    }

    private static class InMemoryRepository implements JobRepository {
        private final Job job;
        private int updates;
        private InMemoryRepository(Job job) { this.job = job; }
        public Job getById(int id) { return job.getId() == id ? job : null; }
        public void update(Job job) { updates++; }
        public boolean checkHealth() { return true; }
    }
}
