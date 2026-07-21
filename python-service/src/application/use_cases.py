from typing import Optional, Dict
from src.domain.entities import Job
from src.domain.repositories import JobRepository, AnalysisServiceClient

class SubmitJobUseCase:
    def __init__(self, job_repository: JobRepository, analysis_client: AnalysisServiceClient):
        self.job_repository = job_repository
        self.analysis_client = analysis_client

    def execute(self, text: str) -> Job:
        # 1. Crear el trabajo inicial con estado PENDIENTE
        job = Job(id=None, text=text, status="PENDIENTE")
        
        # 2. Persistir en la base de datos
        saved_job = self.job_repository.save(job)
        
        # 3. Notificar síncronamente al servicio Java de que hay un nuevo trabajo
        if saved_job.id:
            try:
                self.analysis_client.notify_analysis(saved_job.id)
            except Exception as e:
                # Logueamos el error pero permitimos retornar el jobId para no bloquear el flujo del usuario
                print(f"Error al notificar al servicio de análisis: {e}")
                
        return saved_job

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
