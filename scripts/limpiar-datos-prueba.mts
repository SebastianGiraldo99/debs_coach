import "dotenv/config"

import { prisma } from "../lib/db/prisma.ts"

/**
 * Borra los datos que dejan las verificaciones manuales de los endpoints.
 *
 * Convención: todo dato de prueba usa direcciones `@local.test`. Ese TLD está
 * reservado por la RFC 2606 justamente para esto, así que nunca va a chocar
 * con el correo real de nadie.
 *
 * Uso:
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/limpiar-datos-prueba.mts
 *
 * Es seguro correrlo siempre: si no hay nada que borrar, lo dice y sale.
 */

const DOMINIO = "@local.test"

const usuarios = await prisma.usuario.deleteMany({
  where: { email: { endsWith: DOMINIO } },
})
const invitaciones = await prisma.invitacion.deleteMany({
  where: { emailDestino: { endsWith: DOMINIO } },
})

console.log(`Usuarios de prueba borrados     : ${usuarios.count}`)
console.log(`Invitaciones de prueba borradas : ${invitaciones.count}`)
console.log(`Usuarios reales que quedan      : ${await prisma.usuario.count()}`)

await prisma.$disconnect()
