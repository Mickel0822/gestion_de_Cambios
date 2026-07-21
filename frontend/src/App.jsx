import React from 'react';
import './App.css';
import { useJobAnalysis } from './application/useJobAnalysis';
import { createApiClient } from './infrastructure/apiClient';
import { getInitialApiUrl, persistApiUrl } from './infrastructure/configuration';
import { addHistoryId, clearHistoryIds, readHistoryIds } from './infrastructure/historyStorage';
import { Composer } from './presentation/components/Composer';
import { Header } from './presentation/components/Header';
import { HistoryPanel } from './presentation/components/HistoryPanel';
import { ResultsPanel } from './presentation/components/ResultsPanel';
import { SettingsDrawer } from './presentation/components/SettingsDrawer';

const historyRepository = { add: addHistoryId, clear: clearHistoryIds, read: readHistoryIds };

function App() {
  const analysis = useJobAnalysis({
    apiClientFactory: createApiClient,
    historyRepository,
    initialApiUrl: getInitialApiUrl(),
    persistApiUrl,
  });

  return (
    <main className="app-shell">
      <Header
        serviceStatus={analysis.serviceStatus}
        showSettings={analysis.showSettings}
        onToggleSettings={() => analysis.setShowSettings((visible) => !visible)}
      />

      {analysis.showSettings && (
        <SettingsDrawer
          apiUrl={analysis.apiUrl}
          onSave={analysis.saveApiUrl}
          onCancel={() => analysis.setShowSettings(false)}
        />
      )}

      <section className="intro" id="top">
        <div>
          <span className="eyebrow">Análisis de lenguaje</span>
          <h1>Descubre el tono<br /><em>detrás de las palabras.</em></h1>
        </div>
        <p>Una lectura clara y cercana del sentimiento, las ideas y las palabras que más pesan en cada texto.</p>
      </section>

      <div className="workspace-grid">
        <div className="main-column">
          <Composer
            text={analysis.text}
            loading={analysis.loading}
            maxTextLength={analysis.maxTextLength}
            onTextChange={analysis.setText}
            onSubmit={analysis.submitAnalysis}
          />

          {(analysis.jobDetails || analysis.loading || analysis.error) && (
            <ResultsPanel
              currentJobId={analysis.currentJobId}
              job={analysis.jobDetails}
              loading={analysis.loading}
              error={analysis.error}
              retryAfterSeconds={analysis.retryAfterSeconds}
              onRetry={analysis.retryJob}
            />
          )}
        </div>

        <HistoryPanel
          jobs={analysis.historyJobs}
          currentJobId={analysis.currentJobId}
          onSelect={analysis.loadJobFromHistory}
          onClear={analysis.clearHistory}
        />
      </div>

      <footer><span>AnalytiCore</span><p>Hecho para escuchar mejor lo que dicen las palabras.</p></footer>
    </main>
  );
}

export default App;
