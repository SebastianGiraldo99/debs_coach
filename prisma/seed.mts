import "dotenv/config"

import { hashearPassword } from "../lib/auth/password.ts"
import { prisma } from "../lib/db/prisma.ts"

/**
 * Crea el administrador inicial. Es el único usuario que nace sin invitación:
 * a partir de él se invita a todos los demás (RF-005).
 *
 * Idempotente — `prisma db seed` puede correr varias veces. Si el admin ya
 * existe NO se le pisa la contraseña: sería un rollback silencioso de
 * cualquier rotación hecha después del primer despliegue. Solo se garantiza
 * que siga siendo admin y esté activo.
 *
 * Extensión .mts: Node 24 hace type stripping de forma nativa, así que no
 * hace falta tsx.
 */

function exigir(variable: string): string {
  const valor = process.env[variable]
  if (!valor) {
    console.error(`Falta ${variable} en .env`)
    process.exit(1)
  }
  return valor
}

async function main() {
  const email = exigir("ADMIN_EMAIL").toLowerCase().trim()
  const password = exigir("ADMIN_PASSWORD")
  const nombre = process.env.ADMIN_NOMBRE?.trim() || "Administrador"

  if (password.length < 12) {
    console.error(
      "ADMIN_PASSWORD debe tener al menos 12 caracteres. Es la llave de todo el sistema.",
    )
    process.exit(1)
  }

  const existente = await prisma.usuario.findUnique({ where: { email } })

  if (existente) {
    await prisma.usuario.update({
      where: { email },
      data: { rol: "admin", estado: "activo" },
    })
    console.log(
      `Ya existía ${email}: se confirmó rol=admin y estado=activo.\n` +
        `La contraseña NO se modificó.`,
    )
    return
  }

  await prisma.usuario.create({
    data: {
      nombre,
      email,
      passwordHash: await hashearPassword(password),
      rol: "admin",
      estado: "activo",
    },
  })

  console.log(`Administrador creado: ${email}`)
}

main()
  .catch((error) => {
    console.error("El seed falló:", error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
