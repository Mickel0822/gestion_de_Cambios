package com.analyticore.domain.entities;

import java.time.LocalDateTime;

public class Job {
    private Integer id;
    private String text;
    private String status;
    private String sentiment;
    private String keywords;
    private LocalDateTime createdAt;

    public Job(Integer id, String text, String status, String sentiment, String keywords, LocalDateTime createdAt) {
        this.id = id;
        this.text = text;
        this.status = status;
        this.sentiment = sentiment;
        this.keywords = keywords;
        this.createdAt = createdAt;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSentiment() {
        return sentiment;
    }

    public void setSentiment(String sentiment) {
        this.sentiment = sentiment;
    }

    public String getKeywords() {
        return keywords;
    }

    public void setKeywords(String keywords) {
        this.keywords = keywords;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
