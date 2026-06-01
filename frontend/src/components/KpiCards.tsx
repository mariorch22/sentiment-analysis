import type { Metrics } from '../types';

interface Props {
  metrics: Metrics | null;
  error: string | null;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} Mio.`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} Tsd.`;
  return n.toLocaleString('de-DE');
}

function Stat({
  label, value, note, tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: 'pos' | 'neg';
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-figure${tone ? ` ${tone}` : ''}`}>{value}</span>
      <span className="stat-note">{note}</span>
    </div>
  );
}

export default function KpiCards({ metrics, error }: Props) {
  if (error) {
    return <div className="error-box">Kennzahlen nicht verfügbar — {error}</div>;
  }

  if (!metrics) {
    return (
      <div className="statstrip">
        {[0, 1, 2, 3].map(i => <div key={i} className="stat stat-skeleton shimmer" />)}
      </div>
    );
  }

  return (
    <div className="statstrip">
      <Stat
        label="Rezensionen gesamt"
        value={fmt(metrics.totalReviews)}
        note="dedupliziert · VADER-gescort"
      />
      <Stat
        label="Positiv-Anteil"
        value={`${(metrics.posShare * 100).toFixed(1)} %`}
        note="positive Klassifikation"
        tone="pos"
      />
      <Stat
        label="Negativ-Anteil"
        value={`${(metrics.negShare * 100).toFixed(1)} %`}
        note="potenzieller Handlungsbedarf"
        tone="neg"
      />
      <Stat
        label="Produkte erfasst"
        value={fmt(metrics.productsTracked)}
        note="mind. 1 Rezension"
      />
    </div>
  );
}
