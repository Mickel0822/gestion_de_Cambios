import assert from 'node:assert/strict';
import test from 'node:test';
import { getStatusLabel, isActiveJob, JobStatus, sentimentTone } from './job.js';

test('identifica únicamente trabajos activos', () => {
  assert.equal(isActiveJob({ status: JobStatus.PENDING }), true);
  assert.equal(isActiveJob({ status: JobStatus.PROCESSING }), true);
  assert.equal(isActiveJob({ status: JobStatus.COMPLETED }), false);
  assert.equal(isActiveJob({ status: JobStatus.ERROR }), false);
});

test('presenta etiquetas y sentimiento seguros', () => {
  assert.equal(getStatusLabel(JobStatus.ERROR), 'Necesita atención');
  assert.equal(sentimentTone('POSITIVO'), 'positivo');
  assert.equal(sentimentTone(null), 'neutro');
});
