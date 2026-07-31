import { test, expect } from 'vitest';
import { getStatusLabel, isActiveJob, JobStatus, sentimentTone } from './job.js';

test('identifica únicamente trabajos activos', () => {
  expect(isActiveJob({ status: JobStatus.PENDING })).toBe(true);
  expect(isActiveJob({ status: JobStatus.PROCESSING })).toBe(true);
  expect(isActiveJob({ status: JobStatus.COMPLETED })).toBe(false);
  expect(isActiveJob({ status: JobStatus.ERROR })).toBe(false);
});

test('presenta etiquetas y sentimiento seguros', () => {
  expect(getStatusLabel(JobStatus.ERROR)).toBe('Necesita atención');
  expect(sentimentTone('POSITIVO')).toBe('positivo');
  expect(sentimentTone(null)).toBe('neutro');
});
