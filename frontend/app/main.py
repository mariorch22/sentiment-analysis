"""
Dashboard (Streamlit).

- Batch-Analyse: liest VADER-Ergebnisse aus der API (gold via DuckDB).
- Live-Analyse: schickt Text an /predict (HF-Modell).
"""

import os
import re

import pandas as pd
import requests
import streamlit as st
from wordcloud import STOPWORDS, WordCloud

API_URL = os.environ.get("API_URL", "http://api:8000")

# HTML-Reste aus den Review-Texten als Stopwords ausschliessen
EXTRA_STOPWORDS = {"br", "href", "http", "https", "www", "amazon", "com", "gp", "product"}
STOP = set(STOPWORDS) | EXTRA_STOPWORDS

st.set_page_config(page_title="Sentiment Dashboard", layout="wide")
st.title("Sentiment-Analyse: Amazon Fine Food Reviews")


@st.cache_data(ttl=60)
def get_distribution():
    r = requests.get(f"{API_URL}/distribution", timeout=10)
    r.raise_for_status()
    return r.json()


@st.cache_data(ttl=60)
def get_reviews(sentiment, limit):
    params = {"limit": limit}
    if sentiment:
        params["sentiment"] = sentiment
    r = requests.get(f"{API_URL}/reviews", params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def predict(text):
    r = requests.post(f"{API_URL}/predict", json={"text": text}, timeout=30)
    r.raise_for_status()
    return r.json()


def strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text)


tab_batch, tab_live = st.tabs(["Batch-Analyse", "Live-Analyse"])

with tab_batch:
    st.subheader("Sentiment-Verteilung (VADER)")
    try:
        dist = get_distribution()
        df = pd.DataFrame(dist).set_index("sentiment")
        st.bar_chart(df)
    except Exception as e:
        st.error(f"API nicht erreichbar: {e}")

    st.subheader("Word Cloud")
    sentiment = st.selectbox("Sentiment", ["positive", "neutral", "negative"])
    if st.button("Word Cloud erzeugen"):
        with st.spinner("Lade Reviews und baue Word Cloud ..."):
            reviews = get_reviews(sentiment, 1000)
            text = " ".join(strip_html(r["Text"]) for r in reviews)
            wc = WordCloud(
                width=800, height=400, background_color="white", stopwords=STOP
            ).generate(text)
            st.image(wc.to_array())

        st.subheader("Beispiel-Reviews")
        sample = pd.DataFrame(reviews)[["Score", "sentiment", "compound", "Text"]].head(10)
        st.dataframe(sample, use_container_width=True)

with tab_live:
    st.subheader("Live-Sentiment (HF-Modell)")
    user_text = st.text_area("Review-Text eingeben", height=120)
    if st.button("Analysieren"):
        if user_text.strip():
            try:
                result = predict(user_text)
                col1, col2 = st.columns(2)
                col1.metric("Label", result["label"])
                col2.metric("Konfidenz", f"{result['score']:.1%}")
            except Exception as e:
                st.error(f"Inferenz fehlgeschlagen: {e}")
        else:
            st.warning("Bitte Text eingeben.")