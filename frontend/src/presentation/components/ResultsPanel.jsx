import React from 'react';
import { getStatusLabel, isActiveJob, JobStatus, sentimentTone } from '../../domain/job';
import { Icon } from './Icon';

export function ResultsPanel({ currentJobId, job, loading, error, retryAfterSeconds, onRetry }) {
  const sentiment = sentimentTone(job?.sentiment);
  const jobError = job?.status === JobStatus.ERROR;
  const lastUpdate = job?.updated_at ? new Date(job.updated_at).getTime() : Number.NaN;
  const activeRetryAvailable = isActiveJob(job) && Number.isFinite(lastUpdate)
    && Date.now() - lastUpdate >= retryAfterSeconds * 1_000;
  return <section className="clay-card result-card">
    <div className="section-heading result-heading"><div><span className="step-number">02</span><span><small>Resultado</small><h2>Lectura #{currentJobId || '—'}</h2></span></div>{job && <span className={`status-badge ${job.status.toLowerCase()}`}><i />{getStatusLabel(job.status)}</span>}</div>
    {error && <div className="error-message"><Icon name="alert" /><div><strong>No pudimos consultar la lectura</strong><p>{error}</p></div></div>}
    {jobError && <div className="error-message job-error"><Icon name="alert" /><div><strong>El análisis no pudo completarse</strong><p>{job.error_message || 'El servicio de análisis no estuvo disponible.'}</p><button type="button" className="retry-button" onClick={onRetry} disabled={loading}><Icon name="retry" size={16} /> Reintentar análisis</button></div></div>}
    {loading && (!job || isActiveJob(job)) && <div className="processing-state"><div className="processing-orbit"><span /><i /></div><div><strong>{job?.status === JobStatus.PROCESSING ? 'Encontrando matices…' : 'Preparando la lectura…'}</strong><p>{job?.status === JobStatus.PROCESSING ? 'Estamos identificando el tono y las ideas principales.' : 'Tu texto ya está en la fila de análisis.'}</p></div><div className="progress-track"><span className={job?.status === JobStatus.PROCESSING ? 'advanced' : ''} /></div>{activeRetryAvailable && <button type="button" className="slow-retry-button" onClick={onRetry}>¿Está tardando demasiado? Reiniciar lectura</button>}</div>}
    {job?.status === JobStatus.COMPLETED && <div className="result-content"><div className={`sentiment-block ${sentiment}`}><div className="sentiment-face" aria-hidden="true"><span className="eye left" /><span className="eye right" /><span className="mouth" /></div><div><small>Sentimiento predominante</small><h3>{job.sentiment || 'NEUTRO'}</h3><p>El tono general que atraviesa este texto.</p></div><span className="confidence"><Icon name="check" size={15} /> Detectado</span></div><div className="result-detail"><div><small className="detail-label">Texto analizado</small><div className="text-inset">{job.text}</div></div><div><small className="detail-label">Ideas que más resuenan</small><div className="keyword-list">{job.keywords?.length ? job.keywords.map((keyword, index) => <span key={`${keyword}-${index}`}>{keyword}</span>) : <em>No encontramos palabras clave relevantes.</em>}</div></div></div></div>}
  </section>;
}
