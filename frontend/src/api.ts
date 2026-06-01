import type { Distribution, Product, PredictResult, Agreement } from './types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API-Fehler ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function fetchDistribution(): Promise<Distribution[]> {
  return get<Distribution[]>('/distribution');
}

// Fetch all products (min_reviews=1) — slider filtering is done client-side for instant response
export async function fetchProducts(): Promise<Product[]> {
  return get<Product[]>('/products?min_reviews=1');
}

export async function fetchAgreement(): Promise<Agreement> {
  return get<Agreement>('/agreement');
}

export async function predict(text: string): Promise<PredictResult> {
  const res = await fetch(`${BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Inferenz-Fehler ${res.status}: ${res.statusText}`);
  return res.json() as Promise<PredictResult>;
}
