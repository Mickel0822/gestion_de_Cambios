import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from src.application.use_cases import CheckHealthUseCase, GetJobStatusUseCase, RetryJobUseCase, SubmitJobUseCase
from src.interface.analysis_client import HttpAnalysisServiceClient
from src.interface.database import PostgresJobRepository


def _as_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _allowed_origins() -> list[str]:
    configured = os.getenv('FRONTEND_ORIGIN', 'http://localhost:3000')
    origins = []
    for origin in configured.split(','):
        origin = origin.strip().rstrip('/')
        if origin and not origin.startswith(('http://', 'https://')):
            origin = f'https://{origin}'
        if origin:
            origins.append(origin)
    return origins


def create_app(job_repository=None, analysis_client=None) -> Flask:
    app = Flask(__name__)
    app.config['MAX_TEXT_LENGTH'] = _as_int('MAX_TEXT_LENGTH', 5000)
    app.config['MAX_CONTENT_LENGTH'] = _as_int('MAX_REQUEST_BYTES', 65_536)
    CORS(app, resources={r"/*": {"origins": _allowed_origins()}})

    repository = job_repository or PostgresJobRepository(os.getenv('DATABASE_URL', ''))
    client = analysis_client or HttpAnalysisServiceClient(
        os.getenv('JAVA_SERVICE_URL', 'http://localhost:8080'),
        internal_api_key=os.getenv('INTERNAL_API_KEY', ''),
        max_attempts=_as_int('NOTIFY_MAX_ATTEMPTS', 5),
        timeout_seconds=_as_int('NOTIFY_TIMEOUT_SECONDS', 12),
        initial_backoff_seconds=float(os.getenv('NOTIFY_INITIAL_BACKOFF_SECONDS', '1.5')),
    )
    submit_job = SubmitJobUseCase(repository, client)
    get_job_status = GetJobStatusUseCase(repository)
    retry_job = RetryJobUseCase(repository, client, _as_int('RETRY_AFTER_SECONDS', 120))
    check_health = CheckHealthUseCase(repository)

    @app.get('/')
    def home():
        return jsonify({'service': 'AnalytiCore Submission Service', 'status': 'running', 'VERSION': 'DEMO-V5'})

    @app.errorhandler(413)
    def request_too_large(_error):
        return jsonify({'error': 'La petición supera el tamaño máximo permitido.'}), 413

    @app.get('/health')
    def health():
        try:
            return jsonify(check_health.execute())
        except Exception as error:
            return jsonify({'status': 'error', 'message': str(error)}), 503

    @app.post('/analyze')
    def analyze():
        data = request.get_json(silent=True)
        text = data.get('text') if isinstance(data, dict) else None
        if not isinstance(text, str) or not text.strip():
            return jsonify({'error': 'El campo "text" es obligatorio y debe ser texto.'}), 400
        text = text.strip()
        if len(text) > app.config['MAX_TEXT_LENGTH']:
            return jsonify({'error': f'El texto no puede superar {app.config["MAX_TEXT_LENGTH"]} caracteres.'}), 413
        try:
            job = submit_job.execute(text)
            return jsonify({'jobId': job.id, 'status': job.status}), 201
        except Exception as error:
            app.logger.exception('No se pudo registrar el análisis')
            return jsonify({'error': f'Error al registrar el análisis: {error}'}), 500

    @app.get('/jobs/<int:job_id>')
    def get_job(job_id):
        try:
            job = get_job_status.execute(job_id)
            if not job:
                return jsonify({'error': f'Trabajo con ID {job_id} no encontrado.'}), 404
            return jsonify(job.to_dict())
        except Exception as error:
            app.logger.exception('No se pudo consultar el trabajo')
            return jsonify({'error': f'Error al consultar el trabajo: {error}'}), 500

    @app.post('/jobs/<int:job_id>/retry')
    def retry(job_id):
        try:
            job = retry_job.execute(job_id)
            if not job:
                return jsonify({'error': f'Trabajo con ID {job_id} no encontrado.'}), 404
            return jsonify(job.to_dict()), 202
        except ValueError as error:
            return jsonify({'error': str(error)}), 409
        except Exception as error:
            app.logger.exception('No se pudo reintentar el trabajo')
            return jsonify({'error': f'Error al reintentar el trabajo: {error}'}), 500

    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=_as_int('PORT', 5000), debug=False)
