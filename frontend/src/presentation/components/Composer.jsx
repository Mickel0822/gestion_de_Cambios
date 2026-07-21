import React from 'react';
import { Icon } from './Icon';

export function Composer({ text, loading, maxTextLength, onTextChange, onSubmit }) {
  const tooLong = text.length > maxTextLength;
  return <section className="clay-card composer-card">
    <div className="section-heading"><div><span className="step-number">01</span><span><small>Nueva lectura</small><h2>Comparte un texto</h2></span></div><span className={`counter ${tooLong ? 'over' : ''}`}>{text.length} / {maxTextLength}</span></div>
    <form onSubmit={onSubmit}><div className="textarea-well"><textarea rows="7" value={text} maxLength={maxTextLength + 1} onChange={(event) => onTextChange(event.target.value)} placeholder="Pega aquí una reseña, comentario o fragmento que quieras comprender mejor…" disabled={loading} aria-label="Texto para analizar" /><span className="input-corner" /></div>
      <div className="composer-footer"><span><Icon name="cloud" size={17} /> Procesamiento seguro en la nube</span><button type="submit" className="primary-button analyze-button" disabled={loading || !text.trim() || tooLong}>{loading ? <span className="loader" /> : <Icon name="spark" size={18} />}{loading ? 'Leyendo el texto…' : 'Analizar texto'}{!loading && <Icon name="arrow" size={18} />}</button></div>
    </form>
  </section>;
}
