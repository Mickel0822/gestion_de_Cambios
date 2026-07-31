
import psycopg2
from psycopg2.extras import RealDictCursor

from src.domain.entities import Job
from src.domain.repositories import JobRepository


class PostgresJobRepository(JobRepository):
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.table_created = False

    def _get_connection(self):
        if not self.database_url:
            raise RuntimeError('DATABASE_URL no está configurada.')
        connection = psycopg2.connect(self.database_url, cursor_factory=RealDictCursor, connect_timeout=10)
        if not self.table_created:
            self._ensure_table_exists(connection)
        return connection

    def _ensure_table_exists(self, connection):
        with connection.cursor() as cursor:
            # Serializa el DDL inicial entre los workers de Gunicorn.
            cursor.execute("SELECT pg_advisory_xact_lock(20260721, 1)")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id SERIAL PRIMARY KEY,
                    text TEXT NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
                    sentiment VARCHAR(50),
                    keywords TEXT,
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS error_message TEXT")
            cursor.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP")  # noqa: E501
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)")
        connection.commit()
        self.table_created = True

    def save(self, job: Job) -> Job:
        with self._get_connection() as connection, connection.cursor() as cursor:
            if job.id is None:
                cursor.execute(
                    """INSERT INTO jobs (text, status, sentiment, keywords, error_message)
                       VALUES (%s, %s, %s, %s, %s)
                       RETURNING id, created_at, updated_at""",
                    (job.text, job.status, job.sentiment, job.keywords, job.error_message),
                )
                row = cursor.fetchone()
                job.id = row['id']
                job.created_at = row['created_at']
                job.updated_at = row['updated_at']
            else:
                cursor.execute(
                    """UPDATE jobs
                       SET text = %s, status = %s, sentiment = %s, keywords = %s, error_message = %s,
                           updated_at = CURRENT_TIMESTAMP
                       WHERE id = %s RETURNING created_at, updated_at""",
                    (job.text, job.status, job.sentiment, job.keywords, job.error_message, job.id),
                )
                row = cursor.fetchone()
                if not row:
                    raise LookupError(f'Trabajo con ID {job.id} no encontrado.')
                job.created_at = row['created_at']
                job.updated_at = row['updated_at']
        return job

    def get_by_id(self, job_id: int) -> Job | None:
        with self._get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, text, status, sentiment, keywords, error_message, created_at, updated_at FROM jobs WHERE id = %s",  # noqa: E501
                (job_id,),
            )
            row = cursor.fetchone()
        if not row:
            return None
        return Job(id=row['id'], text=row['text'], status=row['status'], sentiment=row['sentiment'],
                   keywords=row['keywords'], error_message=row['error_message'], created_at=row['created_at'],
                   updated_at=row['updated_at'])

    def claim_for_retry(self, job_id: int, retry_before) -> Job | None:
        with self._get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """UPDATE jobs
                   SET status = 'PENDIENTE', sentiment = NULL, keywords = NULL, error_message = NULL,
                       updated_at = CURRENT_TIMESTAMP
                   WHERE id = %s
                     AND (status = 'ERROR'
                          OR (status IN ('PENDIENTE', 'PROCESANDO') AND updated_at <= %s))
                   RETURNING id, text, status, sentiment, keywords, error_message, created_at, updated_at""",
                (job_id, retry_before),
            )
            row = cursor.fetchone()
        if not row:
            return None
        return Job(id=row['id'], text=row['text'], status=row['status'], sentiment=row['sentiment'],
                   keywords=row['keywords'], error_message=row['error_message'], created_at=row['created_at'],
                   updated_at=row['updated_at'])

    def check_health(self) -> dict:
        with self._get_connection() as connection, connection.cursor() as cursor:
            cursor.execute('SELECT version(), NOW()')
            result = cursor.fetchone()
        return {'status': 'healthy', 'postgres': 'connected',
                'version': result['version'].split(',')[0], 'timestamp': result['now'].isoformat()}
