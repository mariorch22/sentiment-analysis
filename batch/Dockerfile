FROM python:3.12-slim

# Java wird von Spark benoetigt (17 nicht mehr in Debian Trixie -> 21)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-21-jre-headless \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# Install uv.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy the application into the container.
COPY . /app

# Install the application dependencies.
WORKDIR /app
RUN uv sync --frozen --no-cache

# S3A-Connector (hadoop-aws + AWS-SDK) passend zur gebuendelten Hadoop-Version
# vorab in den Ivy-Cache holen, damit der Batch-Lauf offline/schnell startet.
RUN uv run python -c "import glob, os; from pyspark.sql import SparkSession; ver = os.path.basename(glob.glob('/app/.venv/lib/python*/site-packages/pyspark/jars/hadoop-client-api-*.jar')[0]).split('hadoop-client-api-')[1].rsplit('.jar', 1)[0]; print('hadoop-aws', ver); SparkSession.builder.master('local[1]').config('spark.jars.packages', 'org.apache.hadoop:hadoop-aws:' + ver).getOrCreate().stop()"

ENV PYTHONUNBUFFERED=1
CMD ["uv", "run", "python", "app/main.py"]
