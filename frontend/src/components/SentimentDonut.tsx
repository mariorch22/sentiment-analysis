import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { Distribution } from '../types';

interface Props {
  distribution: Distribution[] | null;
  error: string | null;
}

const ORDER: Distribution['sentiment'][] = ['positive', 'neutral', 'negative'];
const COLOR: Record<string, string> = {
  positive: 'var(--pos)',
  neutral: 'var(--neu)',
  negative: 'var(--neg)',
};
const NAME: Record<string, string> = {
  positive: 'Positiv',
  neutral: 'Neutral',
  negative: 'Negativ',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} Mio.`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} Tsd.`;
  return n.toLocaleString('de-DE');
}

export default function SentimentDonut({ distribution, error }: Props) {
  const sorted = distribution
    ? [...distribution].sort((a, b) => ORDER.indexOf(a.sentiment) - ORDER.indexOf(b.sentiment))
    : null;
  const total = sorted?.reduce((s, d) => s + d.count, 0) ?? 0;

  return (
    <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="panel-head">
        <span className="panel-eyebrow">Verteilung · VADER</span>
        <h3 className="panel-title">Sentiment-Verteilung</h3>
        <p className="panel-desc">Anteil der Klassen über den gesamten gescorten Korpus.</p>
      </div>

      {error ? (
        <div className="error-box">{error}</div>
      ) : !sorted ? (
        <div className="chart-state">Lädt…</div>
      ) : (
        <>
          <div style={{ position: 'relative', width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sorted}
                  dataKey="count"
                  nameKey="sentiment"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {sorted.map(d => (
                    <Cell key={d.sentiment} fill={COLOR[d.sentiment]} />
                  ))}
                </Pie>
                <text x="50%" y="46%" textAnchor="middle" className="donut-center-num">{fmt(total)}</text>
                <text x="50%" y="58%" textAnchor="middle" className="donut-center-lbl">Rezensionen</text>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="legend">
            {sorted.map(d => (
              <div className="legend-row" key={d.sentiment}>
                <span className="legend-swatch" style={{ background: COLOR[d.sentiment] }} />
                <span className="legend-name">{NAME[d.sentiment]}</span>
                <span className="legend-val tnum">{d.count.toLocaleString('de-DE')}</span>
                <span className="legend-pct tnum">
                  {total > 0 ? `${((d.count / total) * 100).toFixed(1)} %` : '—'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
