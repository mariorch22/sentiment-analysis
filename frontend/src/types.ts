export interface Distribution {
  sentiment: 'positive' | 'neutral' | 'negative';
  count: number;
}

export interface Product {
  product_id: string;
  n_reviews: number;
  neg_rate: number;
}

export interface PredictResult {
  label: string;
  score: number;
}

export interface Metrics {
  totalReviews: number;
  posShare: number;
  negShare: number;
  productsTracked: number;
}

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface MatrixCell {
  vader: Sentiment;
  star: Sentiment;
  count: number;
}

export interface Agreement {
  total: number;
  vader_acc: number;
  matrix: MatrixCell[];
}
