import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

/**
 * Cliente de Prisma compartido.
 *
 * Prisma 7 eliminó el motor Rust: el constructor exige obligatoriamente un
 * Driver Adapter. Sin él lanza "Using engine type 'client' requires either
 * 'adapter' or 'accelerateUrl'". Para PostgreSQL el adapter es PrismaPg,
 * que por dentro usa el driver `pg`.
 *
 * Ojo con la URL: `prisma.config.ts` solo alimenta al CLI (migrate, seed,
 * studio). El cliente en runtime no la lee de ahí, hay que pasársela aquí.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function crearCliente(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL no está definida. Desde local recuerda abrir el túnel SSH:\n" +
        "  ssh -fN -L 5433:127.0.0.1:5432 root@agotech.cloud",
    )
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? crearCliente()

// En desarrollo el hot reload reevalúa los módulos: sin esto, cada recarga
// abriría un pool nuevo hasta agotar las conexiones de PostgreSQL.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
