from datetime import datetime, timedelta
from typing import Dict, Optional

from src.domain.entities import Job
from src.domain.repositories import AnalysisServiceClient, JobRepository


class SubmitJobUseCase:
    def __init__(self, job_repository: JobRepository, analysis_client: AnalysisServiceClient):
        self.job_repository = job_repository
        self.analysis_client = analysis_client

    def execute(self, text: str) -> Job:
        saved_job = self.job_repository.save(Job(id=None, text=text, status="PENDIENTE"))
        if saved_job.id and not self.analysis_client.notify_analysis(saved_job.id):
            saved_job.status = "ERROR"
            saved_job.error_message = "No fue posible iniciar el servicio de análisis después de varios intentos."
            self.job_repository.save(saved_job)
        return saved_job


class RetryJobUseCase:
    def __init__(self, job_repository: JobRepository, analysis_client: AnalysisServiceClient,
                 retry_after_seconds: int = 120):
        self.job_repository = job_repository
        self.analysis_client = analysis_client
        self.retry_after_seconds = max(1, retry_after_seconds)

    def execute(self, job_id: int) -> Optional[Job]:
        job = self.job_repository.get_by_id(job_id)
        if not job:
            return None
        if job.status not in {"ERROR", "PENDIENTE", "PROCESANDO"}:
            raise ValueError("Solo se pueden reintentar trabajos pendientes, en proceso o con error.")
        if job.status in {"PENDIENTE", "PROCESANDO"}:
            last_update = job.updated_at or job.created_at
            retry_at = last_update + timedelta(seconds=self.retry_after_seconds)
            if datetime.now() < retry_at:
                remaining = max(1, int((retry_at - datetime.now()).total_seconds()))
                raise ValueError(f"El trabajo sigue activo. Intenta nuevamente en {remaining} segundos.")

        retry_before = datetime.now() - timedelta(seconds=self.retry_after_seconds)
        job = self.job_repository.claim_for_retry(job_id, retry_before)
        if not job:
            raise ValueError("El trabajo ya fue reiniciado por otra petición.")

        if not self.analysis_client.notify_analysis(job_id):
            job.status = "ERROR"
            job.error_message = "El servicio de análisis continúa sin estar disponible."
            self.job_repository.save(job)
        return job


class GetJobStatusUseCase:
    def __init__(self, job_repository: JobRepository):
        self.job_repository = job_repository

    def execute(self, job_id: int) -> Optional[Job]:
        return self.job_repository.get_by_id(job_id)


class CheckHealthUseCase:
    def __init__(self, job_repository: JobRepository):
        self.job_repository = job_repository

    def execute(self) -> Dict:
        return self.job_repository.check_health()
