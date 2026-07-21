export const JobStatus = Object.freeze({
  PENDING: 'PENDIENTE',
  PROCESSING: 'PROCESANDO',
  COMPLETED: 'COMPLETADO',
  ERROR: 'ERROR',
});

export const ACTIVE_JOB_STATUSES = new Set([JobStatus.PENDING, JobStatus.PROCESSING]);

export const STATUS_LABELS = Object.freeze({
  [JobStatus.PENDING]: 'En espera',
  [JobStatus.PROCESSING]: 'Analizando',
  [JobStatus.COMPLETED]: 'Completado',
  [JobStatus.ERROR]: 'Necesita atención',
});

export function isActiveJob(job) {
  return Boolean(job && ACTIVE_JOB_STATUSES.has(job.status));
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || 'Desconocido';
}

export function sentimentTone(sentiment) {
  return (sentiment || 'NEUTRO').toLowerCase();
}
