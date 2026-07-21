import unittest
from datetime import datetime, timedelta

from src.application.use_cases import RetryJobUseCase, SubmitJobUseCase
from src.domain.entities import Job
from src.domain.repositories import AnalysisServiceClient, JobRepository


class InMemoryJobRepository(JobRepository):
    def __init__(self):
        self.jobs = {}
        self.next_id = 1

    def save(self, job):
        if job.id is None:
            job.id = self.next_id
            self.next_id += 1
        self.jobs[job.id] = job
        return job

    def get_by_id(self, job_id):
        return self.jobs.get(job_id)

    def claim_for_retry(self, job_id, retry_before):
        job = self.jobs.get(job_id)
        if not job or (job.status != 'ERROR' and job.updated_at > retry_before):
            return None
        job.status = 'PENDIENTE'
        job.sentiment = None
        job.keywords = None
        job.error_message = None
        job.updated_at = datetime.now()
        return job

    def check_health(self):
        return {'status': 'healthy'}


class StubAnalysisClient(AnalysisServiceClient):
    def __init__(self, succeeds=True):
        self.succeeds = succeeds
        self.notified = []

    def notify_analysis(self, job_id):
        self.notified.append(job_id)
        return self.succeeds


class ApplicationUseCasesTest(unittest.TestCase):
    def test_submit_persists_and_notifies(self):
        repository = InMemoryJobRepository()
        client = StubAnalysisClient()
        job = SubmitJobUseCase(repository, client).execute('Excelente servicio')
        self.assertEqual(job.status, 'PENDIENTE')
        self.assertEqual(client.notified, [job.id])

    def test_submit_marks_error_when_java_is_unavailable(self):
        repository = InMemoryJobRepository()
        job = SubmitJobUseCase(repository, StubAnalysisClient(False)).execute('Texto válido')
        self.assertEqual(job.status, 'ERROR')
        self.assertIsNotNone(job.error_message)

    def test_retry_recovers_an_error_job(self):
        repository = InMemoryJobRepository()
        failed_job = repository.save(Job(None, 'Texto', status='ERROR', error_message='Fallo'))
        retried = RetryJobUseCase(repository, StubAnalysisClient()).execute(failed_job.id)
        self.assertEqual(retried.status, 'PENDIENTE')
        self.assertIsNone(retried.error_message)

    def test_retry_recovers_a_stalled_processing_job(self):
        repository = InMemoryJobRepository()
        stalled_job = repository.save(Job(None, 'Texto', status='PROCESANDO',
                                          updated_at=datetime.now() - timedelta(minutes=5)))
        client = StubAnalysisClient()
        retried = RetryJobUseCase(repository, client).execute(stalled_job.id)
        self.assertEqual(retried.status, 'PENDIENTE')
        self.assertEqual(client.notified, [stalled_job.id])

    def test_retry_rejects_a_job_that_is_still_processing(self):
        repository = InMemoryJobRepository()
        active_job = repository.save(Job(None, 'Texto', status='PROCESANDO'))
        with self.assertRaises(ValueError):
            RetryJobUseCase(repository, StubAnalysisClient()).execute(active_job.id)


if __name__ == '__main__':
    unittest.main()
