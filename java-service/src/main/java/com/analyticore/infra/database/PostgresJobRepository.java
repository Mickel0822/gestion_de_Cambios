package com.analyticore.infra.database;

import com.analyticore.domain.entities.Job;
import com.analyticore.domain.exceptions.RepositoryException;
import com.analyticore.domain.repositories.JobRepository;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.Properties;

public final class PostgresJobRepository implements JobRepository {
    private final String jdbcUrl;
    private final Properties connectionProperties;

    public PostgresJobRepository(String databaseUrl) {
        DatabaseConfig config = parseDatabaseUrl(databaseUrl);
        this.jdbcUrl = config.jdbcUrl();
        this.connectionProperties = config.properties();
        this.connectionProperties.putIfAbsent("connectTimeout", "10");
        this.connectionProperties.putIfAbsent("socketTimeout", "30");
        this.connectionProperties.putIfAbsent("tcpKeepAlive", "true");
        try {
            Class.forName("org.postgresql.Driver");
        } catch (ClassNotFoundException error) {
            throw new IllegalStateException("No se pudo cargar el driver JDBC de PostgreSQL.", error);
        }
    }

    private DatabaseConfig parseDatabaseUrl(String databaseUrl) {
        if (databaseUrl == null || databaseUrl.isBlank()) {
            return new DatabaseConfig("", new Properties());
        }
        if (databaseUrl.startsWith("jdbc:postgresql://")) {
            return new DatabaseConfig(databaseUrl, new Properties());
        }
        try {
            URI uri = URI.create(databaseUrl);
            String host = uri.getHost();
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String database = uri.getPath() == null ? "" : uri.getPath();
            String query = uri.getQuery();
            boolean local = host != null && (host.equals("localhost") || host.equals("127.0.0.1") || host.equals("postgres-db"));
            String sslQuery = (query == null || query.isBlank()) && !local ? "sslmode=require" : query;
            String jdbc = "jdbc:postgresql://" + host + ":" + port + database + (sslQuery == null ? "" : "?" + sslQuery);

            Properties properties = new Properties();
            if (uri.getRawUserInfo() != null) {
                String userInfo = uri.getRawUserInfo();
                int separator = userInfo.indexOf(':');
                String user = separator >= 0 ? userInfo.substring(0, separator) : userInfo;
                String password = separator >= 0 ? userInfo.substring(separator + 1) : "";
                properties.setProperty("user", decodeUserInfo(user));
                properties.setProperty("password", decodeUserInfo(password));
            }
            return new DatabaseConfig(jdbc, properties);
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("DATABASE_URL no tiene un formato PostgreSQL válido.", error);
        }
    }

    private String decodeUserInfo(String value) {
        return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
    }

    private Connection getConnection() throws SQLException {
        if (jdbcUrl.isBlank()) throw new SQLException("DATABASE_URL no está configurada.");
        return DriverManager.getConnection(jdbcUrl, connectionProperties);
    }

    @Override
    public Job getById(int id) {
        String sql = "SELECT id, text, status, sentiment, keywords, error_message, created_at FROM jobs WHERE id = ?";
        try (Connection connection = getConnection(); PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, id);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) return null;
                Timestamp timestamp = result.getTimestamp("created_at");
                LocalDateTime createdAt = timestamp == null ? LocalDateTime.now() : timestamp.toLocalDateTime();
                return new Job(result.getInt("id"), result.getString("text"), result.getString("status"),
                    result.getString("sentiment"), result.getString("keywords"), result.getString("error_message"), createdAt);
            }
        } catch (SQLException error) {
            throw new RepositoryException("No se pudo obtener el trabajo #" + id + ".", error);
        }
    }

    @Override
    public void update(Job job) {
        String sql = "UPDATE jobs SET status = ?, sentiment = ?, keywords = ?, error_message = ?, " +
            "updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        try (Connection connection = getConnection(); PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, job.getStatus());
            statement.setString(2, job.getSentiment());
            statement.setString(3, job.getKeywords());
            statement.setString(4, job.getErrorMessage());
            statement.setInt(5, job.getId());
            if (statement.executeUpdate() != 1) throw new SQLException("El trabajo no existe.");
        } catch (SQLException error) {
            throw new RepositoryException("No se pudo actualizar el trabajo #" + job.getId() + ".", error);
        }
    }

    @Override
    public boolean checkHealth() {
        try (Connection connection = getConnection(); Statement statement = connection.createStatement();
             ResultSet ignored = statement.executeQuery("SELECT 1")) {
            return true;
        } catch (SQLException error) {
            return false;
        }
    }

    private record DatabaseConfig(String jdbcUrl, Properties properties) {}
}
