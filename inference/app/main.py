"""
Live-Inference: FastAPI + HuggingFace transformers pipeline.

Bedient den Live-Pfad. Modell ueber MODEL_NAME konfigurierbar
(Default: 3-Klassen-Sentiment). Laeuft auf CPU, fuer Einzel-Requests ausreichend.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

MODEL_NAME = os.environ.get(
    "MODEL_NAME", "Mario12355/food-sentiment-distilbert"
)

clf = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global clf
    # Modell einmal beim Start laden (nicht pro Request)
    clf = pipeline("sentiment-analysis", model=MODEL_NAME)
    yield


app = FastAPI(title="Inference", lifespan=lifespan)


class PredictIn(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/predict")
def predict(body: PredictIn):
    # truncation=True: lange Reviews auf Modell-Maxlaenge kappen
    result = clf(body.text, truncation=True)[0]
    return {
        "label": result["label"].lower(),
        "score": float(result["score"]),
    }