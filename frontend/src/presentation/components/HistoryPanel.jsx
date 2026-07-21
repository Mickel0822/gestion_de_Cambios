import React from 'react';
import { Icon } from './Icon';

export function HistoryPanel({ jobs, currentJobId, onSelect, onClear }) {
  return <aside className="clay-card history-card"><div className="history-header"><div className="history-icon"><Icon name="clock" /></div><div><small>Tu actividad</small><h2>Lecturas recientes</h2></div>{jobs.length > 0 && <button onClick={onClear} className="trash-button" aria-label="Limpiar historial"><Icon name="trash" size={17} /></button>}</div>
    {jobs.length === 0 ? <div className="empty-history"><div className="empty-rings"><Icon name="clock" size={25} /></div><strong>Aquí aparecerán tus lecturas</strong><p>Analiza tu primer texto para comenzar a construir el historial.</p></div> : <div className="history-list">{jobs.map((job, index) => <button key={job.id} onClick={() => onSelect(job.id)} className={`history-item ${currentJobId === job.id ? 'active' : ''}`}><span className="history-index">{String(index + 1).padStart(2, '0')}</span><span className="history-copy"><strong>Lectura #{job.id}</strong><small>{job.text}</small></span><time>{job.status}</time></button>)}</div>}
    <div className="history-note"><span className="tiny-leaf" />Solo guardamos identificadores; el contenido permanece en PostgreSQL.</div>
  </aside>;
}
