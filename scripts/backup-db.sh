#!/usr/bin/env bash
#
# Copia de seguridad de la base, comprimida y con retención.
#
# La base NO corre en el host: vive en el contenedor `shared_postgres`, así que
# el volcado sale por `docker exec` y no por un pg_dump local —que además no
# está instalado en el VPS—.
#
# Uso:
#   scripts/backup-db.sh
#
# En el cron del VPS (3 de la mañana, todos los días):
#   0 3 * * * /opt/coach/scripts/backup-db.sh >> /var/log/coach-backup.log 2>&1
set -euo pipefail

CONTENEDOR="${CONTENEDOR_POSTGRES:-shared_postgres}"
BASE="${POSTGRES_DB:-coach_financiero}"
USUARIO="${POSTGRES_USER:-coach_app}"
DESTINO="${DIRECTORIO_BACKUPS:-/var/backups/coach}"
DIAS_RETENCION="${DIAS_RETENCION:-30}"

ARCHIVO="${DESTINO}/coach-$(date +%F).sql.gz"

mkdir -p "$DESTINO"

# `pg_dump` escribe a stdout dentro del contenedor y aquí se comprime. Sin
# `-T` no se asigna TTY, que es lo que corrompería el binario al pasarlo por
# la tubería.
docker exec -T "$CONTENEDOR" pg_dump -U "$USUARIO" -d "$BASE" | gzip > "$ARCHIVO"

# Un archivo de 20 bytes es un gzip vacío: el volcado falló y el `set -o
# pipefail` no lo vio porque gzip sí terminó bien. Mejor enterarse ahora que
# el día que haya que restaurar.
TAMANO=$(wc -c < "$ARCHIVO")
if [ "$TAMANO" -lt 1000 ]; then
  echo "ERROR: el respaldo pesa ${TAMANO} bytes. Se borra para no dar falsa seguridad." >&2
  rm -f "$ARCHIVO"
  exit 1
fi

# La retención va después de comprobar que el nuevo sirve: borrar los viejos
# antes dejaría al VPS sin ninguna copia buena si el volcado de hoy falla.
find "$DESTINO" -name 'coach-*.sql.gz' -mtime +"$DIAS_RETENCION" -delete

echo "$(date -Iseconds) respaldo ok: ${ARCHIVO} ($(du -h "$ARCHIVO" | cut -f1))"
