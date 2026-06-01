import { useState } from 'react';
import { predict } from '../api';
import type { PredictResult } from '../types';
import { IconSpark } from './icons';

const LABEL_COLOR: Record<string, string> = {
  positive: 'var(--pos)',
  negative: 'var(--neg)',
  neutral: 'var(--neu)',
};
const LABEL_BG: Record<string, string> = {
  positive: '#e7efe5',
  negative: '#f4e3dc',
  neutral: '#efe9dd',
};
const LABEL_BORDER: Record<string, string> = {
  positive: '#bcd0bd',
  negative: '#e0bbaa',
  neutral: '#d6cbb4',
};
const LABEL_DE: Record<string, string> = {
  positive: 'Positiv',
  negative: 'Negativ',
  neutral: 'Neutral',
};

const SAMPLES = [
  'Absolutely the best coffee I have ever had, rich, smooth, and worth every penny.',
  'Arrived broken and the seller never responded to my emails. Very disappointed.',
];

export default function LiveAnalysis() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await predict(trimmed));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }

  const label = result?.label.toLowerCase() ?? '';
  const labelColor = LABEL_COLOR[label] ?? 'var(--neu)';
  const labelDe = LABEL_DE[label] ?? label;
  const canSubmit = !loading && text.trim().length > 0;

  return (
    <section className="panel panel-pad">
      <div className="panel-head">
        <span className="panel-eyebrow">Live-Inferenz · DistilBERT</span>
        <h3 className="panel-title">Ton eines neuen Textes ohne Sternebewertung bestimmen</h3>
        <p className="panel-desc">
          Support-Mails, Social-Media-Posts oder neue Rezensionen, direkt durch das Modell klassifiziert.
        </p>
      </div>

      <textarea
        className="textarea"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
        placeholder="Rezensions-Text oder Support-Nachricht hier einfügen…"
        rows={5}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 18px' }}>
        <span className="sample-label">Beispiel</span>
        {SAMPLES.map((s, i) => (
          <button
            key={i}
            className="pill"
            style={{ cursor: 'pointer', borderStyle: 'dashed' }}
            onClick={() => { setText(s); setResult(null); setError(null); }}
          >
            {i === 0 ? 'Positiv' : 'Negativ'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
          {loading
            ? (<><IconSpark className="spin" /> Analysiere…</>)
            : 'Text analysieren'}
        </button>

        {result && (
          <div
            className="result"
            style={{ background: LABEL_BG[label] ?? 'var(--panel-2)', borderColor: LABEL_BORDER[label] ?? 'var(--line-2)', marginLeft: 'auto' }}
          >
            <span className="result-label" style={{ color: labelColor }}>{labelDe}</span>
            <div>
              <div className="result-meta">
                Konfidenz <strong className="tnum">{(result.score * 100).toFixed(1)} %</strong>
              </div>
              <div className="confidence-track" style={{ marginTop: 4 }}>
                <div className="confidence-fill" style={{ width: `${result.score * 100}%`, background: labelColor }} />
              </div>
            </div>
          </div>
        )}

        {error && <span className="error-box" style={{ marginLeft: 'auto' }}>{error}</span>}
      </div>
    </section>
  );
}
