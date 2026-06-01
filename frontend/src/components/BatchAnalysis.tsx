import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Product } from '../types';

interface Props {
  products: Product[] | null;
  allProducts: Product[] | null;
  error: string | null;
  minReviews: number;
  onMinReviewsChange: (v: number) => void;
}

// Interpolates green → amber → red based on neg_rate 0..1
function dotColor(r: number): string {
  if (r <= 0.5) {
    const t = r / 0.5;
    return `rgb(${Math.round(21 + t * 210)},${Math.round(160 - t * 8)},${Math.round(107 - t * 99)})`;
  }
  const t = (r - 0.5) / 0.5;
  return `rgb(${Math.round(231 + t * 23)},${Math.round(152 - t * 94)},${Math.round(8 + t * 50)})`;
}

interface ChartPoint extends Product {
  neg_pct: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ChartPoint;
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)',
      padding: '11px 14px', fontSize: 13, boxShadow: '0 8px 24px rgba(33, 27, 20, 0.13)',
    }}>
      <div style={{ fontWeight: 500, color: 'var(--ink)', marginBottom: 5, fontFamily: 'var(--mono)', fontSize: 11.5 }}>
        {p.product_id}
      </div>
      <div style={{ color: 'var(--ink-2)', fontFamily: 'var(--mono)', fontSize: 12 }} className="tnum">
        Rezensionen: <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{p.n_reviews.toLocaleString('de-DE')}</strong>
      </div>
      <div style={{ color: dotColor(p.neg_rate), fontWeight: 500, fontFamily: 'var(--mono)', fontSize: 12 }} className="tnum">
        Negativanteil: {(p.neg_rate * 100).toFixed(1)} %
      </div>
    </div>
  );
};

export default function BatchAnalysis({ products, allProducts, error, minReviews, onMinReviewsChange }: Props) {
  const chartData: ChartPoint[] | undefined = products?.map(p => ({
    ...p,
    neg_pct: parseFloat((p.neg_rate * 100).toFixed(2)),
  }));

  return (
    <section className="panel panel-pad">
      <div className="panel-head">
        <span className="panel-eyebrow">Batch-Analyse · VADER</span>
        <h3 className="panel-title">
          Welche Produkte ziehen bei relevantem Volumen überdurchschnittlich viele negative Rezensionen an?
        </h3>
        <p className="panel-desc">
          Jeder Punkt entspricht einem Produkt. Oben rechts (hohes Volumen, hoher Negativanteil) = Handlungsbedarf.
        </p>
      </div>

      {error ? (
        <div className="error-box">{error}</div>
      ) : (
        <>
          <div className="control-row">
            <label htmlFor="min-reviews" className="control-label">Mindestanzahl Rezensionen</label>
            <input
              id="min-reviews"
              type="range"
              className="slider"
              min={1}
              max={500}
              step={1}
              value={minReviews}
              onChange={e => onMinReviewsChange(Number(e.target.value))}
            />
            <span className="pill tnum">≥ {minReviews}</span>
            {allProducts && (
              <span className="hint tnum" style={{ marginLeft: 'auto' }}>
                {products?.length.toLocaleString('de-DE')} von {allProducts.length.toLocaleString('de-DE')} Produkten
              </span>
            )}
          </div>

          <div className="gradient-legend">
            <span>0 % negativ</span>
            <div className="gradient-bar" />
            <span>100 % negativ</span>
          </div>

          {!products ? (
            <div className="chart-state">Lädt…</div>
          ) : products.length === 0 ? (
            <div className="chart-state">Keine Produkte mit ≥ {minReviews} Rezensionen.</div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 10, right: 24, bottom: 34, left: 10 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" />
                <XAxis
                  dataKey="n_reviews"
                  type="number"
                  name="Anzahl Rezensionen"
                  tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
                  tickLine={{ stroke: 'var(--line-2)' }}
                  axisLine={{ stroke: 'var(--line-2)' }}
                  label={{ value: 'Anzahl Rezensionen', position: 'insideBottom', offset: -20, fill: 'var(--ink-3)', fontSize: 12 }}
                />
                <YAxis
                  dataKey="neg_pct"
                  type="number"
                  name="Negativanteil %"
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
                  tickLine={{ stroke: 'var(--line-2)' }}
                  axisLine={{ stroke: 'var(--line-2)' }}
                  width={48}
                  label={{ value: 'Negativanteil', angle: -90, position: 'insideLeft', offset: 16, fill: 'var(--ink-3)', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--line-2)' }} />
                <Scatter
                  data={chartData}
                  isAnimationActive={false}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  shape={(props: any) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: ChartPoint };
                    return (
                      <circle cx={cx} cy={cy} r={4.5} fill={dotColor(payload.neg_rate)} fillOpacity={0.78} stroke="var(--panel)" strokeWidth={0.6} />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </section>
  );
}
