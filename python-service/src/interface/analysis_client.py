import requests
from src.domain.repositories import AnalysisServiceClient

class HttpAnalysisServiceClient(AnalysisServiceClient):
    def __init__(self, service_url: str):
        # Aseguramos que no termine con una barra para consistencia
        self.service_url = service_url.rstrip('/')

    def notify_analysis(self, job_id: int) -> bool:
        if not self.service_url:
            print("Advertencia: JAVA_SERVICE_URL no configurada. Omitiendo notificación al microservicio Java.")
            return False
            
        url = f"{self.service_url}/process-job"
        payload = {"jobId": job_id}
        
        try:
            # Petición síncrona
            print(f"Notificando al servicio Java en: {url} con carga útil: {payload}")
            response = requests.post(url, json=payload, timeout=5)
            
            if response.status_code in [200, 201, 202]:
                print(f"Notificación exitosa para jobId {job_id}. Respuesta: {response.status_code}")
                return True
            else:
                print(f"Respuesta inesperada del servicio Java para jobId {job_id}: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"Excepción al conectar con el servicio Java para el trabajo {job_id}: {e}")
            raise e
