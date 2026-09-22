#!/bin/sh
set -e

echo "======================================================="
echo "🚀 Igraem.kz Docker Entrypoint Initialization"
echo "======================================================="

if [ -n "$DATABASE_URL" ]; then
  echo "📦 Synchronizing Database Schema (npx prisma db push)..."
  npx prisma db push --skip-generate || echo "⚠️ Database schema sync warning, proceeding to start app..."
fi

echo "⚡ Executing main process: $@"
exec "$@"
