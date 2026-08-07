import "dotenv/config"

import { prisma } from "../lib/db/prisma.ts"

/**
 * Marca como `expirado` las invitaciones que ya vencieron.
 *
 * No las borra: una invitación caducada es el rastro de que a alguien se le
 * ofreció una plaza, y ese rastro cuenta para el tope de 11 usuarios cuando se
 * revisa el histórico. Lo que hace es dejar de contarlas como vivas —
 * `plazasOcupadas()` solo suma las `pendiente` sin vencer—, de modo que una
 * plaza reservada por un enlace que nadie usó vuelve a estar disponible.
 *
 * Correr semanalmente. En el cron del VPS:
 *   0 4 * * 1 cd /opt/coach && docker compose run --rm migraciones \
 *     npm run script -- scripts/limpiar-invitaciones.mts
 *
 * Uso local:
 *   npm run script -- scripts/limpiar-invitaciones.mts
 */

const { count } = await prisma.invitacion.updateMany({
  where: { estado: "pendiente", expiresAt: { lt: new Date() } },
  data: { estado: "expirado" },
})

console.log(`Invitaciones marcadas como expiradas: ${count}`)

await prisma.$disconnect()
