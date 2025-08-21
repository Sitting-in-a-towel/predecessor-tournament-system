#!/bin/sh
set -e

echo "Running database migrations..."
/app/bin/predecessor_draft eval "PredecessorDraft.Release.migrate()"

echo "Starting Phoenix server..."
exec /app/bin/predecessor_draft start