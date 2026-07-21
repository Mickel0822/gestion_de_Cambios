package com.analyticore.infra.database;

import com.analyticore.domain.entities.Job;
import com.analyticore.domain.repositories.JobRepository;

import java.sql.*;
import java.time.LocalDateTime;

public class PostgresJobRepository implements JobRepository {
    private final String dbUrl;

    public PostgresJobRepository(String databaseUrl) {
        this.dbUrl = convertDatabaseUrl(databaseUrl);
        // Intentar registrar el driver de PostgreSQL
        try {
            Class.forName("org.postgresql.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("No se pudo cargar el driver JDBC de PostgreSQL: " + e.getMessage());
        }
    }

    private String convertDatabaseUrl(String databaseUrl) {
        if (databaseUrl == null || databaseUrl.isEmpty()) {
            return "";
        }
        
        // Conversión del formato estándar de variables de entorno postgres:// a jdbc:postgresql://
        if (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")) {
            String cleanUrl = databaseUrl.replaceFirst("postgres(ql)?://", "");
            String[] parts = cleanUrl.split("@");
            if (parts.length < 2) return databaseUrl;
            
            String credentials = parts[0];
            String hostDb = parts[1];
            
            String[] credParts = credentials.split(":");
            String user = credParts[0];
            String password = credParts.length > 1 ? credParts[1] : "";
            
            String sslParams = "";
            if (!hostDb.contains("?") && !hostDb.contains("postgres-db") && !hostDb.contains("localhost") && !hostDb.contains("127.0.0.1")) {
                sslParams = "?sslmode=require";
            }
            
            String connector = "jdbc:postgresql://" + hostDb + sslParams;
            connector += (connector.contains("?") ? "&" : "?") + "user=" + user + "&password=" + password;
            return connector;
        }
        return databaseUrl;
    }

    private Connection getConnection() throws SQLException {
        if (dbUrl.isEmpty()) {
            throw new SQLException("DATABASE_URL no está configurada.");
        }
        return DriverManager.getConnection(dbUrl);
    }

    @Override
    public Job getById(int id) {
        String sql = "SELECT id, text, status, sentiment, keywords, created_at FROM jobs WHERE id = ?";
        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    Timestamp ts = rs.getTimestamp("created_at");
                    LocalDateTime createdAt = ts != null ? ts.toLocalDateTime() : LocalDateTime.now();
                    return new Job(
                        rs.getInt("id"),
                        rs.getString("text"),
                        rs.getString("status"),
                        rs.getString("sentiment"),
                        rs.getString("keywords"),
                        createdAt
                    );
                }
            }
        } catch (SQLException e) {
            System.err.println("Error al obtener trabajo #" + id + " de Postgres: " + e.getMessage());
        }
        return null;
    }

    @Override
    public void update(Job job) {
        String sql = "UPDATE jobs SET status = ?, sentiment = ?, keywords = ? WHERE id = ?";
        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, job.getStatus());
            stmt.setString(2, job.getSentiment());
            stmt.setString(3, job.getKeywords());
            stmt.setInt(4, job.getId());
            stmt.executeUpdate();
        } catch (SQLException e) {
            System.err.println("Error al actualizar trabajo #" + job.getId() + " en Postgres: " + e.getMessage());
        }
    }
}
