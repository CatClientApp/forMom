#!/bin/sh
set -e

# Wait until the database is actually accepting connections
python alembic/wait_for_db.py

# Apply migrations
alembic upgrade head

# Seed demo data (idempotent)
python seed.py

exec "$@"
