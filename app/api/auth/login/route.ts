import { NextResponse } from "next/server"
import { z } from "zod"

import { verificarPassword } from "@/lib/auth/password"
import { crearSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

/**
 * POST /api/auth/login — RF-004: solo los usuarios aprobados pueden iniciar
 * sesión.
 *
 * Valida credenciales, exige estado `activo` y abre la sesión JWT.
 */

const esquema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

/**
 * Hash señuelo, de una contraseña aleatoria que nadie conoce.
 *
 * Si el correo no existe verificamos igual contra este hash. Sin eso, la
 * respuesta para un correo inexistente sería muchísimo más rápida que para
 * uno real —argon2 es deliberadamente lento— y esa diferencia de tiempo
 * permite averiguar qué correos están registrados.
 */
const HASH_SENUELO =
  "$argon2id$v=19$m=65536,p=4,t=3$hfXT8QI0t5YZexIaBGTuSQ$a7GtBrRcGxu4t2EaZGo1rM/R3Rai6H22M0C3FBETqPk"

/** Mismo texto para correo inexistente y contraseña incorrecta: distinguirlos
 *  le confirmaría a un atacante qué cuentas existen. */
const CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos."

export async function POST(request: Request) {
  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, mensaje: "No pudimos leer los datos del formulario." },
      { status: 400 },
    )
  }

  const datos = esquema.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: "Revisa el correo y la contraseña." },
      { status: 400 },
    )
  }

  const email = datos.data.email.toLowerCase().trim()

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, rol: true, estado: true },
  })

  const passwordValida = await verificarPassword(
    usuario?.passwordHash ?? HASH_SENUELO,
    datos.data.password,
  )

  if (!usuario || !passwordValida) {
    return NextResponse.json(
      { ok: false, mensaje: CREDENCIALES_INVALIDAS },
      { status: 401 },
    )
  }

  // Con la contraseña ya verificada podemos ser específicos sobre el estado:
  // quien llega hasta aquí es el dueño de la cuenta, no un atacante sondeando.
  if (usuario.estado === "pendiente") {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Tu cuenta todavía no está aprobada. Te avisamos por correo en cuanto lo esté.",
      },
      { status: 403 },
    )
  }

  if (usuario.estado === "bloqueado") {
    return NextResponse.json(
      {
        ok: false,
        mensaje: "Tu acceso está suspendido. Escríbele al administrador.",
      },
      { status: 403 },
    )
  }

  await crearSession({ userId: usuario.id, rol: usuario.rol })

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcceso: new Date() },
  })

  return NextResponse.json({
    ok: true,
    destino: usuario.rol === "admin" ? "/admin" : "/dashboard",
  })
}
