import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, Dict
from src.domain.entities import Job
from src.domain.repositories import JobRepository

class PostgresJobRepository(JobRepository):
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.table_created = False

    def _get_connection(self):
        conn = psycopg2.connect(self.database_url, cursor_factory=RealDictCursor)
        # Crear la tabla de manera diferida (Lazy) en la primera conexión exitosa.
        # Esto evita fallos debido al retardo de inicio (booting) de Postgres en Docker.
        if not self.table_created:
            self._ensure_table_exists(conn)
        return conn

    def _ensure_table_exists(self, conn):
        if not self.database_url:
            return
        try:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id SERIAL PRIMARY KEY,
                    text TEXT NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
                    sentiment VARCHAR(50),
                    keywords TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            cursor.close()
            self.table_created = True
            print("Tabla 'jobs' verificada/creada exitosamente.")
        except Exception as e:
            print(f"Error al asegurar la existencia de la tabla 'jobs': {e}")

    def save(self, job: Job) -> Job:
        conn = self._get_connection()
        cursor = conn.cursor()
        if job.id is None:
            # Es un nuevo trabajo
            cursor.execute(
                """
                INSERT INTO jobs (text, status, sentiment, keywords)
                VALUES (%s, %s, %s, %s)
                RETURNING id, text, status, sentiment, keywords, created_at
                """,
                (job.text, job.status, job.sentiment, job.keywords)
            )
            row = cursor.fetchone()
            job.id = row['id']
            job.created_at = row['created_at']
        else:
            # Actualización
            cursor.execute(
                """
                UPDATE jobs
                SET text = %s, status = %s, sentiment = %s, keywords = %s
                WHERE id = %s
                RETURNING id, text, status, sentiment, keywords, created_at
                """,
                (job.text, job.status, job.sentiment, job.keywords, job.id)
            )
            row = cursor.fetchone()
            if row:
                job.created_at = row['created_at']
        conn.commit()
        cursor.close()
        conn.close()
        return job

    def get_by_id(self, job_id: int) -> Optional[Job]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, text, status, sentiment, keywords, created_at FROM jobs WHERE id = %s",
            (job_id,)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if not row:
            return None
        return Job(
            id=row['id'],
            text=row['text'],
            status=row['status'],
            sentiment=row['sentiment'],
            keywords=row['keywords'],
            created_at=row['created_at']
        )

    def check_health(self) -> Dict:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT version(), NOW()')
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        return {
            'status': 'healthy',
            'postgres': 'connected',
            'version': result['version'].split(',')[0],
            'timestamp': result['now'].isoformat()
        }
