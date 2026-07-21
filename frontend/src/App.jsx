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

    const textToSend = text;
    setText(''); // Desaparece del cuadro de texto al enviar a analizar

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
        body: JSON.stringify({ text: textToSend }),
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

  // Determinar colores y estilos según el sentimiento para el diseño pastel premium
  const getSentimentStyle = (sentiment) => {
    if (sentiment === 'POSITIVO') {
      return {
        bg: '#f0fff4',
        border: '2px solid #c6f6d5',
        color: '#22543d',
        shadow: '0 8px 20px -6px rgba(72, 187, 120, 0.2)',
        icon: '😊'
      };
    } else if (sentiment === 'NEGATIVO') {
      return {
        bg: '#fff5f5',
        border: '2px solid #fed7d7',
        color: '#742a2a',
        shadow: '0 8px 20px -6px rgba(245, 101, 101, 0.2)',
        icon: '😢'
      };
    }
    return {
      bg: '#f7fafc',
      border: '2px solid #e2e8f0',
      color: '#4a5568',
      shadow: '0 8px 20px -6px rgba(160, 174, 192, 0.2)',
      icon: '😐'
    };
  };

  const sentimentStyle = jobDetails ? getSentimentStyle(jobDetails.sentiment) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.2rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.8rem', fontWeight: 800 }}>
            <span className="text-gradient">AnalytiCore</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem', fontSize: '1rem', fontWeight: 500 }}>
            Plataforma Cloud de Análisis de Sentimiento Políglota
          </p>
        </div>
        
        <div>
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="btn-primary" 
            style={{ 
              background: 'rgba(255,255,255,0.8)', 
              boxShadow: '0 4px 12px rgba(100, 116, 139, 0.08)', 
              border: '1px solid rgba(226, 232, 240, 0.8)',
              color: 'var(--text-secondary)',
              padding: '0.6rem 1.4rem',
              fontSize: '0.9rem',
              fontWeight: 600
            }}
          >
            ⚙️ Configurar API
          </button>
        </div>
      </header>

      {/* Settings Modal (Inline) */}
      {showSettings && (
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--primary)', background: '#ffffff' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-primary)', fontSize: '1.2rem' }}>Configurar Endpoint de la API (Python)</h3>
          <form onSubmit={handleSaveApiUrl} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <input 
              type="text" 
              value={apiUrl} 
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="Ej. http://localhost:5000"
              className="settings-input"
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.8rem 1.8rem' }}>Guardar</button>
            <button 
              type="button" 
              onClick={() => setShowSettings(false)} 
              className="btn-primary" 
              style={{ 
                background: 'transparent', 
                border: '1px solid rgba(226, 232, 240, 0.8)', 
                color: 'var(--text-secondary)',
                boxShadow: 'none' 
              }}
            >
              Cancelar
            </button>
          </form>
          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.6rem', fontSize: '0.85rem' }}>
            Apunta esta URL al servicio de Python. En local suele ser <code>http://localhost:5000</code>. En Render usa tu URL HTTPS.
          </small>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 8fr) minmax(0, 4fr)', gap: '2.5rem', alignItems: 'start' }}>
        
        {/* Left Side: Submission and Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Submit Panel */}
          <section className="glass-panel">
            <h2 style={{ fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary)', marginBottom: '1.2rem' }}>
              Ingresar Texto para Análisis
            </h2>
            <form onSubmit={handleSubmitAnalysis} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <textarea 
                rows="6"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe o pega el texto que deseas procesar para análisis de sentimiento y palabras clave..."
                disabled={loading}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: text.length > 500 ? 'var(--color-error)' : 'var(--text-muted)', fontWeight: 500 }}>
                  Caracteres: {text.length}
                </span>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading || !text.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                >
                  {loading && <span className="animate-spin" style={{ fontSize: '1.1rem' }}>🌀</span>}
                  {loading ? 'Procesando...' : 'Iniciar Análisis Cloud'}
                </button>
              </div>
            </form>
          </section>

          {/* Results Panel */}
          {(jobDetails || loading || pollingError) && (
            <section className="glass-panel" style={{ borderLeft: '5px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.8rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.45rem', margin: 0, color: 'var(--text-primary)' }}>Análisis número {currentJobId}</h2>
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
                <div style={{ 
                  background: '#fff5f5', 
                  border: '1px solid #fed7d7', 
                  borderRadius: '14px', 
                  padding: '1.2rem', 
                  color: '#c53030', 
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 12px rgba(229, 62, 62, 0.05)'
                }}>
                  <strong style={{ fontWeight: 700 }}>Error:</strong> {pollingError}
                </div>
              )}

              {/* Loading States */}
              {loading && !jobDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', padding: '2.5rem 0' }}>
                  <div className="animate-spin" style={{ fontSize: '2.8rem' }}>🌀</div>
                  <p className="animate-pulse" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Enviando trabajo a los servicios en la nube...</p>
                </div>
              )}

              {/* Detailed Progress */}
              {jobDetails && (jobDetails.status === 'PENDIENTE' || jobDetails.status === 'PROCESANDO') && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', padding: '2.5rem 0' }}>
                  <div className="animate-spin" style={{ fontSize: '2.8rem', color: jobDetails.status === 'PROCESANDO' ? 'var(--color-processing)' : 'var(--color-pending)' }}>⚙️</div>
                  <p className="animate-pulse" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 500, maxWidth: '80%' }}>
                    {jobDetails.status === 'PENDIENTE' && 'Trabajo registrado en Python. Esperando que el microservicio Java lo procese...'}
                    {jobDetails.status === 'PROCESANDO' && 'El microservicio Java está analizando el texto y extrayendo keywords...'}
                  </p>
                  <div style={{ width: '80%', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', height: '10px', overflow: 'hidden', marginTop: '0.5rem' }}>
                    <div 
                      className="animate-pulse" 
                      style={{ 
                        width: jobDetails.status === 'PENDIENTE' ? '35%' : '75%', 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #a9a2fc 0%, var(--primary) 100%)',
                        borderRadius: '10px',
                        transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                      }} 
                    />
                  </div>
                </div>
              )}

              {/* Completed Results */}
              {jobDetails && jobDetails.status === 'COMPLETADO' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                  
                  {/* Sentiment Cards - Pastel Redesign */}
                  {sentimentStyle && (
                    <div style={{ 
                      background: sentimentStyle.bg, 
                      border: sentimentStyle.border, 
                      borderRadius: '16px', 
                      padding: '1.5rem', 
                      textAlign: 'center',
                      boxShadow: sentimentStyle.shadow,
                      transition: 'all 0.3s ease'
                    }}>
                      <small style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                        Sentimiento Detectado
                      </small>
                      <h3 style={{ 
                        margin: '0.6rem 0 0 0', 
                        fontSize: '2.2rem',
                        fontWeight: 800,
                        color: sentimentStyle.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.8rem'
                      }}>
                        <span>{sentimentStyle.icon}</span>
                        <span>{jobDetails.sentiment || 'NEUTRO'}</span>
                      </h3>
                    </div>
                  )}

                  {/* Original Text */}
                  <div>
                    <h4 style={{ margin: '0 0 0.6rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600 }}>Texto Analizado:</h4>
                    <div style={{ 
                      background: '#ffffff', 
                      padding: '1.2rem', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(226, 232, 240, 0.8)', 
                      fontSize: '0.95rem', 
                      color: 'var(--text-primary)',
                      lineHeight: '1.6',
                      maxHeight: '180px', 
                      overflowY: 'auto', 
                      whiteSpace: 'pre-wrap',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                    }}>
                      {jobDetails.text}
                    </div>
                  </div>

                  {/* Keyword Tags */}
                  <div>
                    <h4 style={{ margin: '0 0 0.8rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600 }}>Palabras Clave Extraídas (Java):</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                      {jobDetails.keywords && jobDetails.keywords.length > 0 ? (
                        jobDetails.keywords.map((kw, idx) => (
                          <span key={idx} className="keyword-tag">{kw}</span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No se extrajeron palabras clave de valor.</span>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </section>
          )}

        </div>

        {/* Right Side: Sidebar History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* History Panel */}
          <section className="glass-panel" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>Trabajos Recientes</h2>
              {jobHistory.length > 0 && (
                <button 
                  onClick={clearHistory}
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--text-secondary)', 
                    fontSize: '0.85rem', 
                    fontWeight: 600,
                    cursor: 'pointer', 
                    textDecoration: 'underline',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#c53030'}
                  onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}
                >
                  Limpiar
                </button>
              )}
            </div>

            {jobHistory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontStyle: 'italic', textAlign: 'center', padding: '2.5rem 0' }}>
                Aún no has procesado ningún texto.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '420px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '0.2rem' }}>
                {jobHistory.map((job) => (
                  <div 
                    key={job.id} 
                    onClick={() => loadJobFromHistory(job.id)}
                    className="keyword-tag"
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.9rem 1.1rem', 
                      borderRadius: '12px', 
                      cursor: 'pointer',
                      background: currentJobId === job.id ? 'rgba(139, 128, 249, 0.12)' : 'rgba(255,255,255,0.55)',
                      borderColor: currentJobId === job.id ? 'var(--primary)' : 'rgba(226, 232, 240, 0.8)',
                      boxShadow: currentJobId === job.id ? '0 4px 12px rgba(139, 128, 249, 0.1)' : 'none',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden', flex: 1, paddingRight: '1rem' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>Trabajo #{job.id}</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {job.text}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {job.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

      </div>
    </div>
  );
}

export default App;
