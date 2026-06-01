"""
Batch-Processing: bronze -> silver -> gold

Ablauf:
  1. Kaggle-Datensatz nach bronze laden (idempotent)
  2. bronze lokal herunterladen
  3. Spark: clean + dedup -> silver
  4. Spark + VADER: sentiment + aggregate -> gold
"""

import io
import os
import time

import boto3
import pandas as pd
from botocore.client import Config
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# --- Config (kommt aus der Compose-env) ---
MINIO_ENDPOINT = os.environ["MINIO_ENDPOINT"]
MINIO_ACCESS_KEY = os.environ["MINIO_ACCESS_KEY"]
MINIO_SECRET_KEY = os.environ["MINIO_SECRET_KEY"]

BRONZE, SILVER, GOLD = "bronze", "silver", "gold"
LOCAL_DIR = "/tmp/data"
CSV_KEY = "Reviews.csv"

KAGGLE_DATASET = "snap/amazon-fine-food-reviews"


# --- MinIO / boto3 ---
def s3_client():
    return boto3.client(
        "s3",
        endpoint_url=MINIO_ENDPOINT,
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        config=Config(signature_version="s3v4"),
    )


def wait_for_minio(s3, retries=30, delay=2):
    """depends_on wartet nicht auf 'ready' -> hier kurz pollen."""
    for _ in range(retries):
        try:
            s3.list_buckets()
            print("MinIO erreichbar.")
            return
        except Exception:
            time.sleep(delay)
    raise RuntimeError("MinIO nicht erreichbar.")


def upload_parquet(s3, pdf: pd.DataFrame, bucket: str, key: str):
    """pandas-DataFrame als Single-File-Parquet hochladen."""
    buf = io.BytesIO()
    pdf.to_parquet(buf, index=False)
    buf.seek(0)
    s3.put_object(Bucket=bucket, Key=key, Body=buf.getvalue())
    print(f"  -> s3://{bucket}/{key}  ({len(pdf)} Zeilen)")


# --- Schritt 1: Kaggle -> bronze ---
def fetch_to_bronze(s3):
    try:
        s3.head_object(Bucket=BRONZE, Key=CSV_KEY)
        print("bronze/Reviews.csv existiert bereits, ueberspringe Download.")
        return
    except Exception:
        pass

    import kagglehub  # lazy import, braucht KAGGLE_USERNAME / KAGGLE_KEY

    print("Lade Datensatz von Kaggle ...")
    path = kagglehub.dataset_download(KAGGLE_DATASET)
    csv_path = os.path.join(path, "Reviews.csv")
    s3.upload_file(csv_path, BRONZE, CSV_KEY)
    print(f"Hochgeladen nach bronze/{CSV_KEY}.")


def download_bronze(s3) -> str:
    os.makedirs(LOCAL_DIR, exist_ok=True)
    local = os.path.join(LOCAL_DIR, CSV_KEY)
    s3.download_file(BRONZE, CSV_KEY, local)
    return local


# --- Schritt 2: bronze -> silver (clean) ---
def build_silver(spark, csv_path):
    df = (
        spark.read
        # multiLine + escape: Review-Texte enthalten Kommas, Zeilenumbrueche, Quotes
        .option("header", True)
        .option("multiLine", True)
        .option("escape", '"')
        .csv(csv_path)
    )

    df = df.select("Id", "ProductId", "Score", "Time", "Text")
    df = df.filter(F.col("Text").isNotNull() & (F.trim(F.col("Text")) != ""))
    # Datensatz hat viele identische Reviews (gleicher Text, andere ProductId)
    # -> Dedup auf Text. (Veracity, eines der 5 V's)
    df = df.dropDuplicates(["Text"])
    return df


# --- Schritt 3: silver -> gold (VADER + aggregate) ---
@F.pandas_udf(DoubleType())
def vader_compound(texts: pd.Series) -> pd.Series:
    analyzer = SentimentIntensityAnalyzer()
    return texts.apply(lambda t: analyzer.polarity_scores(t)["compound"])


def build_gold(silver_df):
    scored = silver_df.withColumn("compound", vader_compound(F.col("Text")))
    scored = scored.withColumn(
        "sentiment",
        F.when(F.col("compound") >= 0.05, "positive")
        .when(F.col("compound") <= -0.05, "negative")
        .otherwise("neutral"),
    )
    distribution = scored.groupBy("sentiment").count()
    return scored, distribution


def main():
    s3 = s3_client()
    wait_for_minio(s3)

    fetch_to_bronze(s3)
    csv_path = download_bronze(s3)

    spark = (
        SparkSession.builder.master("local[*]")
        .appName("sentiment-batch")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")

    print("Baue silver ...")
    silver = build_silver(spark, csv_path)
    silver_pdf = silver.toPandas()
    upload_parquet(s3, silver_pdf, SILVER, "reviews_clean.parquet")

    print("Baue gold (VADER) ...")
    scored, distribution = build_gold(silver)
    scored_pdf = scored.toPandas()

    upload_parquet(s3, distribution.toPandas(), GOLD, "sentiment_distribution.parquet")
    upload_parquet(s3, scored_pdf, GOLD, "reviews_scored.parquet")

    spark.stop()
    print("Batch fertig.")


if __name__ == "__main__":
    main()