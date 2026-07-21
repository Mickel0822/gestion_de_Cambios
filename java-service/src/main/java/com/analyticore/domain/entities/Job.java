package com.analyticore.domain.entities;

import java.time.LocalDateTime;

public class Job {
    private final Integer id;
    private final String text;
    private String status;
    private String sentiment;
    private String keywords;
    private String errorMessage;
    private final LocalDateTime createdAt;

    public Job(Integer id, String text, String status, String sentiment, String keywords,
               String errorMessage, LocalDateTime createdAt) {
        this.id = id;
        this.text = text;
        this.status = status;
        this.sentiment = sentiment;
        this.keywords = keywords;
        this.errorMessage = errorMessage;
        this.createdAt = createdAt;
    }

    public Integer getId() { return id; }
    public String getText() { return text; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getSentiment() { return sentiment; }
    public void setSentiment(String sentiment) { this.sentiment = sentiment; }
    public String getKeywords() { return keywords; }
    public void setKeywords(String keywords) { this.keywords = keywords; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
