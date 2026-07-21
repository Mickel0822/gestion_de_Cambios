package com.analyticore.domain.repositories;

import com.analyticore.domain.entities.Job;

public interface JobRepository {
    Job getById(int id);
    void update(Job job);
    boolean checkHealth();
}
