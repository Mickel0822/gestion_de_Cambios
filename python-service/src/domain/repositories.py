from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, Dict
from src.domain.entities import Job

class JobRepository(ABC):
    @abstractmethod
    def save(self, job: Job) -> Job:
        """Guarda o actualiza un trabajo en la base de datos."""
        pass

    @abstractmethod
    def get_by_id(self, job_id: int) -> Optional[Job]:
        """Obtiene un trabajo por su ID."""
        pass

    @abstractmethod
    def claim_for_retry(self, job_id: int, retry_before: datetime) -> Optional[Job]:
        """Reinicia un trabajo elegible de forma atómica; devuelve None si otra petición lo reclamó."""
        pass

    @abstractmethod
    def check_health(self) -> Dict:
        """Verifica el estado de la conexión a la base de datos."""
        pass

class AnalysisServiceClient(ABC):
    @abstractmethod
    def notify_analysis(self, job_id: int) -> bool:
        """Notifica al microservicio Java para que empiece a procesar el trabajo."""
        pass
