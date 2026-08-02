import { NextResponse } from "next/server"
import { z } from "zod"

import { exigirAdmin } from "@/lib/auth/api"
import {
  MAX_USUARIOS,
  calcularVencimiento,
  generarToken,
  normalizarEmail,
  plazasOcupadas,
} from "@/lib/auth/invitaciones"
import { prisma } from "@/lib/db/prisma"
import { enviarInvitacion } from "@/lib/email/resend"

/**
 * POST /api/admin/invitaciones — RF-001: el admin envía un enlace de
 * invitación a una dirección concreta.
 */

const esquema = z.object({ email: z.email() })

export async function POST(request: Request) {
  const guardia = await exigirAdmin()
  if (!guardia.ok) return guardia.respuesta

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, mensaje: "No pudimos leer los datos." },
      { status: 400 },
    )
  }

  const datos = esquema.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: "Escribe un correo válido." },
      { status: 400 },
    )
  }

  const email = normalizarEmail(datos.data.email)

  const yaEsUsuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true },
  })
  if (yaEsUsuario) {
    return NextResponse.json(
      { ok: false, mensaje: "Ese correo ya tiene una cuenta." },
      { status: 409 },
    )
  }

  const invitacionViva = await prisma.invitacion.findFirst({
    where: {
      emailDestino: email,
      estado: "pendiente",
      expiresAt: { gt: new Date() },
    },
    select: { expiresAt: true },
  })
  if (invitacionViva) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: `Ese correo ya tiene una invitación vigente hasta el ${invitacionViva.expiresAt.toLocaleString("es-CO")}.`,
      },
      { status: 409 },
    )
  }

  if ((await plazasOcupadas()) >= MAX_USUARIOS) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: `Ya no quedan plazas: el máximo es ${MAX_USUARIOS} (tú más ${MAX_USUARIOS - 1} usuarios). Libera una bloqueando a alguien o deja vencer una invitación.`,
      },
      { status: 409 },
    )
  }

  const token = generarToken()

  const invitacion = await prisma.invitacion.create({
    data: { emailDestino: email, token, expiresAt: calcularVencimiento() },
    select: { id: true, expiresAt: true },
  })

  const envio = await enviarInvitacion(email, token)

  if (!envio.ok) {
    // Sin correo la invitación no le sirve a nadie: el token solo viaja por
    // ahí. Se borra para que el admin pueda reintentar con el mismo correo
    // sin chocar con la comprobación de "invitación vigente" de arriba.
    await prisma.invitacion.delete({ where: { id: invitacion.id } })
    return NextResponse.json(
      {
        ok: false,
        mensaje: `No pudimos enviar el correo, así que la invitación no se creó. ${envio.motivo}`,
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    ok: true,
    email,
    venceEl: invitacion.expiresAt.toISOString(),
  })
}
