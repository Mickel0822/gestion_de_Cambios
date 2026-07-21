from flask import Flask, jsonify, request
from flask_cors import CORS
import os

from src.interface.database import PostgresJobRepository
from src.interface.analysis_client import HttpAnalysisServiceClient
from src.application.use_cases import (
    SubmitJobUseCase,
    GetJobStatusUseCase,
    CheckHealthUseCase
)

app = Flask(__name__)
# Permitimos CORS para que la aplicación frontend en React pueda realizar peticiones
CORS(app)

# Configuración del entorno
DATABASE_URL = os.getenv('DATABASE_URL', '')
JAVA_SERVICE_URL = os.getenv('JAVA_SERVICE_URL', 'http://localhost:8080')

# Inyección de Dependencias Manual
# 1. Instanciación de componentes de infraestructura
job_repository = PostgresJobRepository(DATABASE_URL)
analysis_client = HttpAnalysisServiceClient(JAVA_SERVICE_URL)

# 2. Instanciación de casos de uso (Capa de Aplicación)
submit_job_use_case = SubmitJobUseCase(job_repository, analysis_client)
get_job_status_use_case = GetJobStatusUseCase(job_repository)
check_health_use_case = CheckHealthUseCase(job_repository)

@app.route('/')
def home():
    return jsonify({
        'service': 'AnalytiCore Submission Service (Python)',
        'status': 'running',
        'database_configured': bool(DATABASE_URL),
        'java_service_url': JAVA_SERVICE_URL
    })

@app.route('/health')
def health():
    """Chequeo de salud del servicio y de la conexión a la base de datos"""
    try:
        health_info = check_health_use_case.execute()
        return jsonify(health_info)
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/analyze', methods=['POST'])
def analyze():
    """Recibe la solicitud de análisis del frontend y orquesta el inicio"""
    data = request.get_json()
    if not data or 'text' not in data or not data['text'].strip():
        return jsonify({'error': 'El campo "text" es obligatorio y no puede estar vacío.'}), 400
        
    text = data['text']
    try:
        job = submit_job_use_case.execute(text)
        return jsonify({'jobId': job.id}), 201
    except Exception as e:
        return jsonify({'error': f'Error al registrar el análisis: {str(e)}'}), 500

@app.route('/jobs/<int:job_id>', methods=['GET'])
def get_job(job_id):
    """Retorna el estado y los resultados del trabajo de análisis"""
    try:
        job = get_job_status_use_case.execute(job_id)
        if not job:
            return jsonify({'error': f'Trabajo con ID {job_id} no encontrado.'}), 404
        return jsonify(job.to_dict()), 200
    except Exception as e:
        return jsonify({'error': f'Error al consultar el trabajo: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"Servidor Python en puerto {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
