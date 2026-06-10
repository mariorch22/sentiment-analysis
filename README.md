# Sentiment-Analyse von Produktbewertungen (Cloud / Big Data Prototyp)

Dieses Repository enthält einen lauffähigen Big-Data-Prototyp zur Sentiment-Analyse auf Basis des *Amazon Fine Food Reviews* Datensatzes. Das System kombiniert eine Medallion-Architektur im Data Lake, eine geschichtete Batch-Verarbeitung und einen separaten Dienst für Echtzeit-Inferenz.

Die vollständige Projektausarbeitung mit allen theoretischen Hintergründen, der detaillierten Ergebnisdiskussion und der Konfusionsmatrix findest du im [PDF-Bericht](/docs/Sentiment_Analyse_CCBD_Ausarbeitung.pdf).

## Features & Kernkonzept

Das System trennt die Datenverarbeitung in zwei funktionale Pfade:

* **Batch-Pfad:** Offline-Analyse des historischen Gesamtbestands (~568.000 Reviews) über Apache Spark und VADER, um kritische Produkte mit hohem Negativ-Anteil zu identifizieren.
* **Live-Pfad:** Echtzeit-Inferenz (Request-Response) für einzelne, eingehende Texte ohne Sternebewertung (z. B. Support-Mails) über ein feinabgestimmtes DistilBERT-Modell.

## Technologie-Stack

* **Storage:** MinIO (S3-kompatibler lokaler Objektspeicher)
* **Batch Processing:** Apache Spark (local mode)
* **Serving Layer:** DuckDB (In-Process OLAP-Engine für direkte Parquet-Abfragen aus MinIO)
* **API & Frontend:** FastAPI und React
* **Modelle:** VADER (Batch) & DistilBERT (Live-Inferenz via Hugging Face)

## Quick Start

### Voraussetzungen

* Docker & Docker Compose
* Kaggle API-Credentials

### Setup & Start

1. Repository klonen:

   ```bash
   git clone https://github.com/mario-raach/sentiment-analysis.git
   cd sentiment-analysis
   ```

2. Umgebungsvariablen für den automatischen Daten-Download setzen:

   ```bash
   export KAGGLE_USERNAME="dein_username"
   export KAGGLE_KEY="dein_api_key"
   ```

3. Services via Docker Compose starten:

   ```bash
   docker compose up --build
   ```

Der `minio-init`-Container erstellt beim Start die nötigen Buckets. Der `batch`-Container zieht die Daten idempotent, führt die Spark-Pipeline aus (Bereinigung, Deduplizierung und VADER-Scoring) und beendet sich danach selbst. API, Inference und Frontend bleiben dauerhaft aktiv.

Das Dashboard ist anschließend unter `http://localhost:3000` erreichbar.

## Repository-Struktur

```text
├── api/             # FastAPI-Dienst & DuckDB Serving Layer
├── batch/           # Spark-Pipeline (Ingestion, Cleaning, VADER)
├── docs/            # Projektdokumentation (PDF)
├── frontend/        # React-Anwendung (Dashboard & Live-Interface)
├── inference/       # DistilBERT-Modell für Echtzeit-Klassifikation
└── docker-compose.yml
```

---

*Entwickelt im Juni 2026 von Julian Kenk, Mario Raach und René Schlesier an der DHBW Lörrach.*
