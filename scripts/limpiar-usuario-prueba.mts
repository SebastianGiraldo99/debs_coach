import "dotenv/config"

import { prisma } from "../lib/db/prisma.ts"

/**
 * Borra el usuario desechable que se creó para verificar el login de punta a
 * punta el 2026-08-02. La limpieza automática falló porque el túnel SSH se
 * cayó a mitad, así que quedó pendiente.
 *
 * Uso:  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/limpiar-usuario-prueba.mts
 *
 * Es seguro correrlo aunque el usuario ya no exista: informa y sale.
 */

const EMAIL = "prueba-login@local.test"

const borrados = await prisma.usuario.deleteMany({ where: { email: EMAIL } })

console.log(
  borrados.count > 0
    ? `Usuario de prueba eliminado (${EMAIL}).`
    : `No había nada que borrar: ${EMAIL} ya no existe.`,
)
console.log("Usuarios en la base:", await prisma.usuario.count())

await prisma.$disconnect()
