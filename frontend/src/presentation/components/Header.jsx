import React from 'react';
import { Icon } from './Icon';

const serviceLabels = { checking: 'Verificando servicio', available: 'Servicio disponible', unavailable: 'Servicio sin conexión' };

export function Header({ serviceStatus, showSettings, onToggleSettings }) {
  return <header className="topbar">
    <a className="brand" href="#top" aria-label="AnalytiCore, inicio"><span className="brand-mark"><span /></span><span><strong>AnalytiCore</strong><small>Lectura sensible de texto</small></span></a>
    <div className="topbar-actions">
      <span className={`service-pill ${serviceStatus}`}><i />{serviceLabels[serviceStatus]}</span>
      <button className="soft-button icon-button" onClick={onToggleSettings} aria-expanded={showSettings}><Icon name="tune" /><span>Conexión</span></button>
    </div>
  </header>;
}
