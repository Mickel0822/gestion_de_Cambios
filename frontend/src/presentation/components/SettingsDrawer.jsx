import React, { useState } from 'react';

export function SettingsDrawer({ apiUrl, onSave, onCancel }) {
  const [draftUrl, setDraftUrl] = useState(apiUrl);
  return <section className="settings-drawer" aria-label="Configuración de conexión">
    <div><span className="eyebrow">Conexión</span><h2>¿Dónde vive tu API?</h2><p>En producción esta dirección se configura automáticamente.</p></div>
    <form onSubmit={(event) => { event.preventDefault(); onSave(draftUrl); }}><label htmlFor="api-url">URL del servicio</label><div className="settings-row">
      <input id="api-url" type="text" value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} placeholder="https://analyticore-python.onrender.com" required />
      <button className="primary-button" type="submit">Guardar</button><button className="soft-button" type="button" onClick={onCancel}>Cancelar</button>
    </div></form>
  </section>;
}
