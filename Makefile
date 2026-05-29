.PHONY: up down logs build init api batch

# Alles hochfahren (im Hintergrund)
up:
	docker compose up -d --build

# Alles stoppen und Container entfernen
down:
	docker compose down

# Logs aller Services folgen
logs:
	docker compose logs -f

# Images neu bauen
build:
	docker compose build

# Buckets anlegen (minio + minio-init)
init:
	docker compose up minio minio-init

# Nur die API starten (zieht minio mit)
api:
	docker compose up api --build

batch:
	docker compose run --rm --build batch