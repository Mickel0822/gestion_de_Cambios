import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => {
    return localStorage.getItem('analyticore_api_url') || import.meta.env.VITE_API_URL || 'http://localhost:5000';
  });
  const [showSettings, setShowSettings] = useState(false);
  
  // Trabajo actual en procesamiento
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [pollingError, setPollingError] = useState(null);
  
  // Historial de trabajos anteriores guardados localmente
  const [jobHistory, setJobHistory] = useState(() => {
    return JSON.parse(localStorage.getItem('analyticore_history')) || [];
  });

  const pollingTimer = useRef(null);

  // Guardar configuración de API URL
  const handleSaveApiUrl = (e) => {
    e.preventDefault();
    localStorage.setItem('analyticore_api_url', apiUrl);
    setShowSettings(false);
  };

  // Guardar historial en localStorage
  useEffect(() => {
    localStorage.setItem('analyticore_history', JSON.stringify(jobHistory));
  }, [jobHistory]);

  // Limpiar timers en desmontaje
  useEffect(() => {
    return () => {
      if (pollingTimer.current) clearTimeout(pollingTimer.current);
    };
  }, []);

  // Función de Polling para consultar estado
  const pollJobStatus = async (jobId) => {
    try {
      const response = await fetch(`${apiUrl}/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error(`Error en servidor: Código ${response.status}`);
      }
      const data = await response.json();
      setJobDetails(data);
      setPollingError(null);

      // Si aún no está completado, seguir haciendo polling
      if (data.status === 'PENDIENTE' || data.status === 'PROCESANDO') {
        pollingTimer.current = setTimeout(() => pollJobStatus(jobId), 2000);
      } else {
        // Finalizó con éxito
        setLoading(false);
        // Agregar al historial si no existe ya
        setJobHistory(prev => {
          if (prev.some(item => item.id === jobId)) return prev;
          return [{ id: data.id, text: data.text, status: data.status, date: new Date().toLocaleTimeString() }, ...prev].slice(0, 10);
        });
      }
    } catch (err) {
      console.error("Error al consultar el estado:", err);
      setPollingError(err.message);
      setLoading(false);
    }
  };

  // Iniciar análisis (POST /analyze)
  const handleSubmitAnalysis = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setPollingError(null);
    setJobDetails(null);
    setCurrentJobId(null);
    if (pollingTimer.current) clearTimeout(pollingTimer.current);

    try {
      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ocurrió un error al enviar el análisis.');
      }

      const data = await response.json();
      setCurrentJobId(data.jobId);
      
      // Iniciar el polling inmediatamente
      pollJobStatus(data.jobId);
    } catch (err) {
      setPollingError(err.message);
      setLoading(false);
    }
  };

  // Cargar trabajo desde el historial
  const loadJobFromHistory = (jobId) => {
    if (pollingTimer.current) clearTimeout(pollingTimer.current);
    setLoading(true);
    setPollingError(null);
    setCurrentJobId(jobId);
    pollJobStatus(jobId);
  };

  // Borrar historial
  const clearHistory = () => {
    setJobHistory([]);
    localStorage.removeItem('analyticore_history');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--panel-border)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem' }}>
            <span className="text-gradient">AnalytiCore</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', fontSize: '0.95rem' }}>
            Plataforma Cloud de Análisis de Sentimiento Políglota
          </p>
        </div>
        
        <div>
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="btn-primary" 
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              boxShadow: 'none', 
              border: '1px solid var(--panel-border)',
              padding: '0.5rem 1.2rem',
              fontSize: '0.9rem'
            }}
          >
            ⚙️ Configurar API
          </button>
        </div>
      </header>

      {/* Settings Modal (Inline) */}
      {showSettings && (
        <div className="glass-panel" style={{ borderLeft: '3px solid var(--accent-cyan)' }}>
          <h3 style={{ marginTop: 0 }}>Configurar Endpoint de la API (Python)</h3>
          <form onSubmit={handleSaveApiUrl} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              value={apiUrl} 
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="Ej. http://localhost:5000"
              style={{
                flex: 1,
                minWidth: '280px',
                background: 'rgba(10, 7, 20, 0.5)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                color: 'white',
                padding: '0.8rem',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.8rem 1.5rem' }}>Guardar</button>
            <button 
              type="button" 
              onClick={() => setShowSettings(false)} 
              className="btn-primary" 
              style={{ background: 'transparent', border: '1px solid var(--panel-border)', boxShadow: 'none' }}
            >
              Cancelar
            </button>
          </form>
          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
            Apunta esta URL al servicio de Python. En local suele ser <code>http://localhost:5000</code>. En Render usa tu URL HTTPS.
          </small>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 5fr)', gap: '2rem', flexWrap: 'wrap' }}>
        
        {/* Left Side: Submission and Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Submit Panel */}
          <section className="glass-panel">
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📝</span> Ingresar Texto para Análisis
            </h2>
            <form onSubmit={handleSubmitAnalysis} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea 
                rows="6"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe o pega el texto que deseas procesar para análisis de sentimiento y palabras clave..."
                disabled={loading}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: text.length > 500 ? 'var(--accent-magenta)' : 'var(--text-muted)' }}>
                  Caracteres: {text.length}
                </span>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading || !text.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {loading && <span className="animate-spin">🔄</span>}
                  {loading ? 'Procesando...' : 'Iniciar Análisis Cloud'}
                </button>
              </div>
            </form>
          </section>

          {/* Results Panel */}
          {(jobDetails || loading || pollingError) && (
            <section className="glass-panel" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', margin: 0 }}>📊 Resultados del Trabajo #{currentJobId}</h2>
                {jobDetails && (
                  <span className={`badge badge-${jobDetails.status.toLowerCase()}`}>
                    {jobDetails.status === 'PENDIENTE' && '⏳ Pendiente'}
                    {jobDetails.status === 'PROCESANDO' && '⚙️ Procesando (Java)'}
                    {jobDetails.status === 'COMPLETADO' && '✅ Completado'}
                  </span>
                )}
              </div>

              {/* Error messages */}
              {pollingError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '1rem', color: 'var(--color-error)', fontSize: '0.95rem' }}>
                  <strong>Error:</strong> {pollingError}
                </div>
              )}

              {/* Loading States */}
              {loading && !jobDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0' }}>
                  <div className="animate-spin" style={{ fontSize: '2.5rem' }}>🌀</div>
                  <p className="animate-pulse" style={{ color: 'var(--text-secondary)' }}>Enviando trabajo a los servicios en la nube...</p>
                </div>
              )}

              {/* Detailed Progress */}
              {jobDetails && (jobDetails.status === 'PENDIENTE' || jobDetails.status === 'PROCESANDO') && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0' }}>
                  <div className="animate-spin" style={{ fontSize: '2.5rem', color: jobDetails.status === 'PROCESANDO' ? 'var(--color-processing)' : 'var(--color-pending)' }}>⚙️</div>
                  <p className="animate-pulse" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {jobDetails.status === 'PENDIENTE' && 'Trabajo registrado en Python. Esperando que el microservicio Java lo recoja...'}
                    {jobDetails.status === 'PROCESANDO' && 'El microservicio Java está analizando el texto...'}
                  </p>
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                    <div 
                      className="animate-pulse" 
                      style={{ 
                        width: jobDetails.status === 'PENDIENTE' ? '30%' : '70%', 
                        height: '100%', 
                        background: 'linear-gradient(90deg, var(--accent-cyan) 0%, var(--primary) 100%)',
                        borderRadius: '8px',
                        transition: 'width 0.5s ease'
                      }} 
                    />
                  </div>
                </div>
              )}

              {/* Completed Results */}
              {jobDetails && jobDetails.status === 'COMPLETADO' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Sentiment Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    <div style={{ 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--panel-border)', 
                      borderRadius: '12px', 
                      padding: '1rem', 
                      textAlign: 'center',
                      borderTop: `3px solid ${
                        jobDetails.sentiment === 'POSITIVO' ? 'var(--color-completed)' :
                        jobDetails.sentiment === 'NEGATIVO' ? 'var(--color-error)' : 'var(--text-secondary)'
                      }`
                    }}>
                      <small style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Sentimiento</small>
                      <h3 style={{ 
                        margin: '0.5rem 0 0 0', 
                        fontSize: '1.5rem',
                        color: jobDetails.sentiment === 'POSITIVO' ? 'var(--color-completed)' :
                              jobDetails.sentiment === 'NEGATIVO' ? 'var(--color-error)' : 'var(--text-secondary)'
                      }}>
                        {jobDetails.sentiment || 'NEUTRO'}
                      </h3>
                    </div>
                  </div>

                  {/* Original Text */}
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Texto Analizado:</h4>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', fontSize: '0.95rem', maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                      {jobDetails.text}
                    </div>
                  </div>

                  {/* Keyword Tags */}
                  <div>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Palabras Clave Extraídas (Java):</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {jobDetails.keywords && jobDetails.keywords.length > 0 ? (
                        jobDetails.keywords.map((kw, idx) => (
                          <span key={idx} className="keyword-tag">{kw}</span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No se extrajeron palabras clave.</span>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </section>
          )}

        </div>

        {/* Right Side: Sidebar History / Architecture Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* History Panel */}
          <section className="glass-panel" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>⏱️ Trabajos Recientes</h2>
              {jobHistory.length > 0 && (
                <button 
                  onClick={clearHistory}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Limpiar
                </button>
              )}
            </div>

            {jobHistory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                Aún no has procesado ningún texto.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                {jobHistory.map((job) => (
                  <div 
                    key={job.id} 
                    onClick={() => loadJobFromHistory(job.id)}
                    className="keyword-tag"
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.8rem', 
                      borderRadius: '10px', 
                      cursor: 'pointer',
                      background: currentJobId === job.id ? 'rgba(143, 59, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                      borderColor: currentJobId === job.id ? 'var(--primary)' : 'var(--panel-border)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', overflow: 'hidden', flex: 1, paddingRight: '1rem' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Trabajo #{job.id}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {job.text}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {job.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Architecture Information */}
          <section className="glass-panel" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'white', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
              💡 Información de la Arquitectura
            </h3>
            <ul style={{ paddingLeft: '1.2rem', margin: '1rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Frontend:</strong> React + Vite, optimizado y servido bajo Nginx.
              </li>
              <li>
                <strong>Orquestador (Python):</strong> Registra trabajos en base de datos PostgreSQL, llama a Java y maneja las consultas periódicas de estado.
              </li>
              <li>
                <strong>Procesador (Java):</strong> Extrae palabras clave y realiza el análisis de sentimiento directamente sobre la persistencia.
              </li>
              <li>
                <strong>Base de datos:</strong> PostgreSQL centralizada, compartida por ambos servicios en la nube.
              </li>
            </ul>
          </section>

        </div>

      </div>
    </div>
  );
}

export default App;
