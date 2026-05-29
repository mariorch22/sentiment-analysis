"""
Serving-Layer: FastAPI + DuckDB (in-process).

- Analytics-Routen lesen die gold-Parquets direkt aus MinIO via DuckDB/httpfs.
- /predict leitet an den Inference-Container weiter (Live-Pfad).
"""

import os

import duckdb
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

MINIO_ENDPOINT = os.environ["MINIO_ENDPOINT"]  # z.B. http://minio:9000
MINIO_ACCESS_KEY = os.environ["MINIO_ACCESS_KEY"]
MINIO_SECRET_KEY = os.environ["MINIO_SECRET_KEY"]
INFERENCE_URL = os.environ.get("INFERENCE_URL", "http://inference:8001")

GOLD_SCORED = "s3://gold/reviews_scored.parquet"
GOLD_DIST = "s3://gold/sentiment_distribution.parquet"

app = FastAPI(title="Sentiment API")


def gold_connection():
    """Frische DuckDB-Connection pro Request, konfiguriert fuer MinIO."""
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    # endpoint ohne Schema, DuckDB will nur host:port
    endpoint = MINIO_ENDPOINT.replace("http://", "").replace("https://", "")
    con.execute(f"SET s3_endpoint='{endpoint}';")
    con.execute(f"SET s3_access_key_id='{MINIO_ACCESS_KEY}';")
    con.execute(f"SET s3_secret_access_key='{MINIO_SECRET_KEY}';")
    con.execute("SET s3_use_ssl=false;")
    con.execute("SET s3_url_style='path';")  # <- kritisch fuer MinIO
    con.execute("SET s3_region='us-east-1';")  # MinIO ignoriert es, DuckDB will es
    return con


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/distribution")
def distribution():
    """Sentiment-Verteilung (fuer Chart im Dashboard)."""
    con = gold_connection()
    try:
        rows = con.execute(
            f"SELECT sentiment, count FROM read_parquet('{GOLD_DIST}') ORDER BY count DESC"
        ).fetchall()
    finally:
        con.close()
    return [{"sentiment": s, "count": int(c)} for s, c in rows]


@app.get("/reviews")
def reviews(sentiment: str | None = None, limit: int = 500):
    """Sample gescorter Reviews. Dashboard nutzt das fuer Tabelle + Word Cloud."""
    con = gold_connection()
    try:
        q = f"SELECT Text, Score, sentiment, compound FROM read_parquet('{GOLD_SCORED}')"
        params = []
        if sentiment:
            q += " WHERE sentiment = ?"
            params.append(sentiment)
        q += " LIMIT ?"
        params.append(limit)
        df = con.execute(q, params).df()
    finally:
        con.close()
    return df.to_dict(orient="records")


class PredictIn(BaseModel):
    text: str


@app.post("/predict")
async def predict(body: PredictIn):
    """Live-Inferenz: leitet an den HF-Modell-Container weiter."""
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.post(f"{INFERENCE_URL}/predict", json={"text": body.text})
            r.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"inference nicht erreichbar: {e}")
    return r.json()