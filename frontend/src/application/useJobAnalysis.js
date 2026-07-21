import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isActiveJob } from '../domain/job';

const POLLING_INTERVAL_MS = 2_000;

export function useJobAnalysis({ apiClientFactory, historyRepository, initialApiUrl, persistApiUrl }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState(initialApiUrl);
  const [showSettings, setShowSettings] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [error, setError] = useState(null);
  const [historyJobs, setHistoryJobs] = useState([]);
  const [serviceStatus, setServiceStatus] = useState('checking');
  const pollingTimer = useRef(null);
  const pollingGeneration = useRef(0);
  const retryInFlight = useRef(false);
  const api = useMemo(() => apiClientFactory(apiUrl), [apiClientFactory, apiUrl]);
  const maxTextLength = Number(import.meta.env.VITE_MAX_TEXT_LENGTH) || 5_000;
  const retryAfterSeconds = Number(import.meta.env.VITE_RETRY_AFTER_SECONDS) || 120;

  const stopPolling = useCallback(() => {
    pollingGeneration.current += 1;
    if (pollingTimer.current) clearTimeout(pollingTimer.current);
    pollingTimer.current = null;
  }, []);

  const rememberJob = useCallback((job) => {
    historyRepository.add(job.id, api.baseUrl);
    setHistoryJobs((previous) => [job, ...previous.filter((item) => item.id !== job.id)].slice(0, 10));
  }, [api.baseUrl, historyRepository]);

  const pollJobStatus = useCallback(async (jobId, generation = pollingGeneration.current) => {
    try {
      const job = await api.getJob(jobId);
      if (generation !== pollingGeneration.current) return;
      setJobDetails(job);
      setError(null);
      rememberJob(job);
      if (isActiveJob(job)) {
        pollingTimer.current = setTimeout(() => pollJobStatus(jobId, generation), POLLING_INTERVAL_MS);
      } else {
        setLoading(false);
      }
    } catch (pollingError) {
      if (generation !== pollingGeneration.current) return;
      setError(pollingError.message);
      setLoading(false);
    }
  }, [api, rememberJob]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  useEffect(() => {
    let active = true;
    let healthTimer = null;
    setServiceStatus('checking');
    const checkHealth = async () => {
      try {
        await api.health();
        if (active) setServiceStatus('available');
      } catch {
        if (active) setServiceStatus('unavailable');
      } finally {
        if (active) healthTimer = setTimeout(checkHealth, 30_000);
      }
    };
    checkHealth();
    return () => { active = false; clearTimeout(healthTimer); };
  }, [api]);

  useEffect(() => {
    let active = true;
    Promise.allSettled(historyRepository.read(api.baseUrl).map((jobId) => api.getJob(jobId))).then((results) => {
      if (!active) return;
      setHistoryJobs(results.filter((result) => result.status === 'fulfilled').map((result) => result.value));
    });
    return () => { active = false; };
  }, [api, historyRepository]);

  const submitAnalysis = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || value.length > maxTextLength) return;
    stopPolling();
    const generation = pollingGeneration.current;
    setLoading(true);
    setError(null);
    setJobDetails(null);
    setCurrentJobId(null);
    try {
      const created = await api.submit(value);
      if (generation !== pollingGeneration.current) return;
      setText('');
      setCurrentJobId(created.jobId);
      historyRepository.add(created.jobId, api.baseUrl);
      await pollJobStatus(created.jobId, generation);
    } catch (submitError) {
      if (generation !== pollingGeneration.current) return;
      setError(submitError.message);
      setLoading(false);
    }
  };

  const retryJob = async () => {
    if (!currentJobId || retryInFlight.current) return;
    retryInFlight.current = true;
    stopPolling();
    const generation = pollingGeneration.current;
    setLoading(true);
    setError(null);
    try {
      await api.retryJob(currentJobId);
      if (generation !== pollingGeneration.current) return;
      await pollJobStatus(currentJobId, generation);
    } catch (retryError) {
      if (generation !== pollingGeneration.current) return;
      setError(retryError.message);
      setLoading(false);
    } finally {
      retryInFlight.current = false;
    }
  };

  const loadJobFromHistory = (jobId) => {
    stopPolling();
    setLoading(true);
    setError(null);
    setCurrentJobId(jobId);
    pollJobStatus(jobId, pollingGeneration.current);
  };

  const clearHistory = () => {
    historyRepository.clear(api.baseUrl);
    setHistoryJobs([]);
  };

  const saveApiUrl = (value) => {
    stopPolling();
    const normalized = persistApiUrl(value);
    setApiUrl(normalized);
    setLoading(false);
    setError(null);
    setJobDetails(null);
    setCurrentJobId(null);
    setShowSettings(false);
  };

  return {
    text, setText, loading, apiUrl, setApiUrl, showSettings, setShowSettings,
    currentJobId, jobDetails, error, historyJobs, serviceStatus, maxTextLength, retryAfterSeconds,
    submitAnalysis, retryJob, loadJobFromHistory, clearHistory, saveApiUrl,
  };
}
