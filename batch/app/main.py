"""
Batch-Processing: bronze -> silver -> gold (Spark-nativ, MinIO via S3A)

Ablauf:
  1. Kaggle-Datensatz nach bronze laden (idempotent; boto3 nur fuer die Ingestion)
  2. Spark liest bronze direkt aus MinIO (s3a), clean + dedup -> silver
  3. Spark + VADER (pandas_udf, verteilt): compound + sentiment -> gold
  4. Verteilung aus gold aggregiert -> gold

Konzept: KEIN toPandas() auf den grossen DataFrames. Lesen, Rechnen und Schreiben
bleiben verteilt in Spark; die Ergebnisse gehen als (mehrteilige) Parquet-Verzeichnisse
direkt nach MinIO. Damit skaliert der Lauf und sprengt nicht den Driver-Speicher
(genau das war beim toPandas()-Ansatz der Crash).
"""

import glob
import os
import time

import boto3
import pandas as pd
import pyspark
from botocore.client import Config
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# --- Config (aus der Compose-env) ---
MINIO_ENDPOINT = os.environ["MINIO_ENDPOINT"]  # z.B. http://minio:9000
MINIO_ACCESS_KEY = os.environ["MINIO_ACCESS_KEY"]
MINIO_SECRET_KEY = os.environ["MINIO_SECRET_KEY"]

BRONZE, SILVER, GOLD = "bronze", "silver", "gold"
CSV_KEY = "Reviews.csv"
KAGGLE_DATASET = "snap/amazon-fine-food-reviews"

# gold-Layout: mehrteilige Parquet-Verzeichnisse (die API liest sie per Glob)
SILVER_CLEAN = f"s3a://{SILVER}/reviews_clean"
GOLD_SCORED = f"s3a://{GOLD}/reviews_scored"
GOLD_DIST = f"s3a://{GOLD}/sentiment_distribution"


# --- MinIO / boto3 (nur Ingestion + Readiness) ---
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


# --- Schritt 1: Kaggle -> bronze (einmalige Ingestion) ---
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


# --- Spark-Session inkl. S3A-Connector ---
def hadoop_version() -> str:
    """Version des in PySpark gebuendelten Hadoop-Clients -> passendes hadoop-aws."""
    jars = os.path.join(os.path.dirname(pyspark.__file__), "jars")
    jar = glob.glob(os.path.join(jars, "hadoop-client-api-*.jar"))[0]
    return os.path.basename(jar).split("hadoop-client-api-")[1].rsplit(".jar", 1)[0]


def build_spark() -> SparkSession:
    return (
        SparkSession.builder.master("local[*]")
        .appName("sentiment-batch")
        # hadoop-aws passend zur gebuendelten Hadoop-Version (im Image vorab gecacht)
        .config("spark.jars.packages", f"org.apache.hadoop:hadoop-aws:{hadoop_version()}")
        # S3A -> MinIO
        .config("spark.hadoop.fs.s3a.endpoint", MINIO_ENDPOINT)
        .config("spark.hadoop.fs.s3a.endpoint.region", "us-east-1")
        .config("spark.hadoop.fs.s3a.access.key", MINIO_ACCESS_KEY)
        .config("spark.hadoop.fs.s3a.secret.key", MINIO_SECRET_KEY)
        .config("spark.hadoop.fs.s3a.path.style.access", "true")
        .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false")
        .config(
            "spark.hadoop.fs.s3a.aws.credentials.provider",
            "org.apache.hadoop.fs.s3a.SimpleAWSCredentialsProvider",
        )
        .config("spark.hadoop.mapreduce.fileoutputcommitter.algorithm.version", "2")
        .config("spark.sql.shuffle.partitions", "16")
        .getOrCreate()
    )


# --- Schritt 2: bronze -> silver (clean + dedup) ---
def build_silver(spark):
    df = (
        spark.read
        # multiLine + escape: Review-Texte enthalten Kommas, Zeilenumbrueche, Quotes
        .option("header", True)
        .option("multiLine", True)
        .option("escape", '"')
        .csv(f"s3a://{BRONZE}/{CSV_KEY}")
    )
    df = df.select("Id", "ProductId", "Score", "Time", "Text")
    df = df.filter(F.col("Text").isNotNull() & (F.trim(F.col("Text")) != ""))
    # Datensatz hat viele identische Reviews (gleicher Text, andere ProductId)
    # -> Dedup auf Text (Veracity, eines der 5 V's)
    return df.dropDuplicates(["Text"])


# --- Schritt 3: silver -> gold (VADER, verteilt via pandas_udf) ---
@F.pandas_udf(DoubleType())
def vader_compound(texts: pd.Series) -> pd.Series:
    analyzer = SentimentIntensityAnalyzer()
    return texts.apply(lambda t: analyzer.polarity_scores(t)["compound"])


def score(df):
    scored = df.withColumn("compound", vader_compound(F.col("Text")))
    return scored.withColumn(
        "sentiment",
        F.when(F.col("compound") >= 0.05, "positive")
        .when(F.col("compound") <= -0.05, "negative")
        .otherwise("neutral"),
    )


def main():
    s3 = s3_client()
    wait_for_minio(s3)
    fetch_to_bronze(s3)

    spark = build_spark()
    spark.sparkContext.setLogLevel("WARN")

    print("Baue silver (clean + dedup) ...")
    silver = build_silver(spark)
    silver.write.mode("overwrite").parquet(SILVER_CLEAN)

    print("Baue gold (VADER, verteilt) ...")
    # silver aus MinIO zurueckgelesen -> CSV-Parse + Dedup laufen nicht erneut
    scored = score(spark.read.parquet(SILVER_CLEAN))
    scored.write.mode("overwrite").parquet(GOLD_SCORED)

    print("Aggregiere Verteilung ...")
    # aus gold gelesen -> VADER laeuft nicht ein zweites Mal
    dist = spark.read.parquet(GOLD_SCORED).groupBy("sentiment").count()
    dist.coalesce(1).write.mode("overwrite").parquet(GOLD_DIST)

    spark.stop()
    print("Batch fertig.")


if __name__ == "__main__":
    main()
