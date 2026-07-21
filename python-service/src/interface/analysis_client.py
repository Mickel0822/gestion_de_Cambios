import time

import requests

from src.domain.repositories import AnalysisServiceClient


class HttpAnalysisServiceClient(AnalysisServiceClient):
    def __init__(self, service_url: str, internal_api_key: str = '', max_attempts: int = 5,
                 timeout_seconds: float = 12, initial_backoff_seconds: float = 1.5):
        normalized_url = service_url.strip()
        if normalized_url and not normalized_url.startswith(('http://', 'https://')):
            normalized_url = f"https://{normalized_url}"
        self.service_url = normalized_url.rstrip('/')
        self.internal_api_key = internal_api_key
        self.max_attempts = max(1, max_attempts)
        self.timeout_seconds = timeout_seconds
        self.initial_backoff_seconds = initial_backoff_seconds

    def notify_analysis(self, job_id: int) -> bool:
        if not self.service_url:
            print("JAVA_SERVICE_URL no está configurada.")
            return False

        url = f"{self.service_url}/process-job"
        payload = {"jobId": job_id}
        headers = {'X-Internal-Api-Key': self.internal_api_key} if self.internal_api_key else {}

        for attempt in range(1, self.max_attempts + 1):
            try:
                print(f"Notificando a Java para jobId {job_id} (intento {attempt}/{self.max_attempts}).")
                response = requests.post(url, json=payload, headers=headers, timeout=self.timeout_seconds)
                if response.status_code in [200, 201, 202]:
                    return True
                print(f"Java respondió {response.status_code} para jobId {job_id}.")
                if 400 <= response.status_code < 500 and response.status_code != 429:
                    return False
            except requests.exceptions.RequestException as error:
                print(f"No se pudo contactar a Java para jobId {job_id}: {error}")

            if attempt < self.max_attempts:
                time.sleep(self.initial_backoff_seconds * (2 ** (attempt - 1)))
        return False
