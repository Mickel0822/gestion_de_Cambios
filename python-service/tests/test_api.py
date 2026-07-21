import os
import unittest

from app import create_app
from tests.test_application import InMemoryJobRepository, StubAnalysisClient


class ApiTest(unittest.TestCase):
    def setUp(self):
        os.environ['MAX_TEXT_LENGTH'] = '20'
        os.environ['MAX_REQUEST_BYTES'] = '128'
        self.repository = InMemoryJobRepository()
        self.app = create_app(self.repository, StubAnalysisClient()).test_client()

    def tearDown(self):
        os.environ.pop('MAX_TEXT_LENGTH', None)
        os.environ.pop('MAX_REQUEST_BYTES', None)

    def test_rejects_empty_and_non_string_text(self):
        self.assertEqual(self.app.post('/analyze', json={'text': '  '}).status_code, 400)
        self.assertEqual(self.app.post('/analyze', json={'text': 123}).status_code, 400)

    def test_rejects_oversized_text(self):
        self.assertEqual(self.app.post('/analyze', json={'text': 'x' * 21}).status_code, 413)

    def test_rejects_oversized_request_body(self):
        response = self.app.post('/analyze', json={'text': 'válido', 'padding': 'x' * 256})
        self.assertEqual(response.status_code, 413)

    def test_submit_and_get_job(self):
        created = self.app.post('/analyze', json={'text': 'Texto válido'})
        self.assertEqual(created.status_code, 201)
        job_id = created.get_json()['jobId']
        fetched = self.app.get(f'/jobs/{job_id}')
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.get_json()['status'], 'PENDIENTE')


if __name__ == '__main__':
    unittest.main()
