import { useEffect, useState, useMemo } from 'react';
import type { Distribution, Metrics, Product } from './types';
import { fetchDistribution, fetchProducts } from './api';
import KpiCards from './components/KpiCards';
import SentimentDonut from './components/SentimentDonut';
import BatchAnalysis from './components/BatchAnalysis';
import LiveAnalysis from './components/LiveAnalysis';

function computeMetrics(dist: Distribution[], products: Product[]): Metrics {
  const total = dist.reduce((s, d) => s + d.count, 0);
  const get = (s: string) => dist.find(d => d.sentiment === s)?.count ?? 0;
  return {
    totalReviews: total,
    posShare: total > 0 ? get('positive') / total : 0,
    negShare: total > 0 ? get('negative') / total : 0,
    productsTracked: products.length,
  };
}

const ISSUE_DATE = new Date('2026-06-01').toLocaleDateString('de-DE', {
  day: '2-digit', month: 'long', year: 'numeric',
});

export default function App() {
  const [distribution, setDistribution] = useState<Distribution[] | null>(null);
  const [distError, setDistError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [minReviews, setMinReviews] = useState(20);

  useEffect(() => {
    fetchDistribution().then(setDistribution).catch((e: Error) => setDistError(e.message));
    fetchProducts().then(setProducts).catch((e: Error) => setProductsError(e.message));
  }, []);

  const metrics = useMemo(
    () => (distribution && products ? computeMetrics(distribution, products) : null),
    [distribution, products],
  );

  const filteredProducts = useMemo(
    () => products?.filter(p => p.n_reviews >= minReviews) ?? null,
    [products, minReviews],
  );

  return (
    <div className="app-shell">
      <div className="content">
        <header className="masthead">
          <div className="dateline rise" style={{ animationDelay: '0ms' }}>
            <span>Amazon Fine Food Reviews</span>
            <span className="dateline-status">Pipeline aktiv · {ISSUE_DATE}</span>
          </div>

          <h1 className="masthead-title rise" style={{ animationDelay: '70ms' }}>
            Was die <em>Rezensionen</em> verraten
          </h1>

          <p className="masthead-lede rise" style={{ animationDelay: '150ms' }}>
            Was sagen über eine halbe Million Lebensmittel-Rezensionen wirklich aus? Wo häufen sich
            negative Stimmen, welche Produkte brauchen Aufmerksamkeit, und wie ordnet sich ein neuer
            Text ohne Sternebewertung ein.
          </p>

          <hr className="masthead-rule rise" style={{ animationDelay: '220ms' }} />
        </header>

        <section className="section rise" style={{ animationDelay: '260ms' }} id="overview">
          <div className="section-head">
            <span className="section-no">01</span>
            <div>
              <div className="eyebrow">Auf einen Blick</div>
              <h2 className="section-title wide">Die Kennzahlen des Korpus</h2>
            </div>
          </div>
          <KpiCards metrics={metrics} error={distError} />
        </section>

        <section className="section" id="distribution">
          <div className="section-head">
            <span className="section-no">02</span>
            <div>
              <div className="eyebrow">Verteilung &amp; Produkte</div>
              <h2 className="section-title wide">Verteilung und auffällige Produkte</h2>
              <p className="section-desc">
                Links die Tonalität über den Korpus, rechts die Produkte mit auffällig hohem
                Negativanteil bei relevantem Volumen. Oben rechts signalisiert Handlungsbedarf.
              </p>
            </div>
          </div>

          <div className="spread">
            <SentimentDonut distribution={distribution} error={distError} />
            <BatchAnalysis
              products={filteredProducts}
              allProducts={products}
              error={productsError}
              minReviews={minReviews}
              onMinReviewsChange={setMinReviews}
            />
          </div>

          <p className="trust-note">
            <span className="trust-note-tag">Hinweis</span>
            Diese Werte beruhen auf VADER, das negative Reviews tendenziell unterschätzt. Für die
            genaue Einordnung eines einzelnen Textes dient die Live-Analyse unten.
          </p>
        </section>

        <section className="section" id="live">
          <div className="section-head">
            <span className="section-no">03</span>
            <div>
              <div className="eyebrow">Live-Inferenz</div>
              <h2 className="section-title wide">Einen neuen Text bewerten lassen</h2>
            </div>
          </div>
          <LiveAnalysis />
        </section>

        <footer className="colophon">
          <span>Quelle · Kaggle / SNAP · Amazon Fine Food Reviews</span>
          <span>VADER-Batch · DistilBERT-Live · DHBW-Projekt</span>
        </footer>
      </div>
    </div>
  );
}
