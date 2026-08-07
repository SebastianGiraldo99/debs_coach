#!/usr/bin/env bash
#
# Restaura un respaldo hecho con scripts/backup-db.sh.
#
# Uso:
#   scripts/restore-db.sh /var/backups/coach/coach-2026-08-06.sql.gz
#
# ESTO PISA LOS DATOS ACTUALES. Pide confirmación escrita a propósito: es la
# única operación de todo el proyecto que destruye información de los usuarios
# sin que ellos lo hayan pedido.
set -euo pipefail

ARCHIVO="${1:-}"
CONTENEDOR="${CONTENEDOR_POSTGRES:-shared_postgres}"
BASE="${POSTGRES_DB:-coach_financiero}"
USUARIO="${POSTGRES_USER:-coach_app}"

if [ -z "$ARCHIVO" ]; then
  echo "Uso: $0 <archivo.sql.gz>" >&2
  exit 1
fi

if [ ! -f "$ARCHIVO" ]; then
  echo "No existe el archivo: $ARCHIVO" >&2
  exit 1
fi

echo "Vas a restaurar '${ARCHIVO}' sobre la base '${BASE}' del contenedor '${CONTENEDOR}'."
echo "Todo lo que hay ahora en esa base se pierde."
read -r -p "Escribe RESTAURAR para continuar: " confirmacion
if [ "$confirmacion" != "RESTAURAR" ]; then
  echo "Cancelado."
  exit 1
fi

# Antes de tocar nada, una copia de lo que hay: si el respaldo que restauramos
# resulta estar corrupto, sin esto no habría vuelta atrás.
RED="/tmp/coach-antes-de-restaurar-$(date +%s).sql.gz"
echo "Guardando el estado actual en ${RED}…"
docker exec -T "$CONTENEDOR" pg_dump -U "$USUARIO" -d "$BASE" | gzip > "$RED"

echo "Parando la app para que nadie escriba durante la restauración…"
docker compose stop app || true

# El volcado de pg_dump no incluye el DROP de la base, así que se recrea el
# schema: restaurar encima del existente chocaría con cada clave primaria.
docker exec -T "$CONTENEDOR" psql -U "$USUARIO" -d "$BASE" \
  -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'

gunzip -c "$ARCHIVO" | docker exec -T "$CONTENEDOR" psql -U "$USUARIO" -d "$BASE"

echo "Levantando la app…"
docker compose start app

echo "Listo. La copia de seguridad previa quedó en ${RED}."
