import { NextResponse } from "next/server"
import { z } from "zod"

import { buscarInvitacionVigente } from "@/lib/auth/invitaciones"
import { hashearPassword } from "@/lib/auth/password"
import { prisma } from "@/lib/db/prisma"
import { enviarNotificacionAdmin } from "@/lib/email/resend"

/**
 * POST /api/auth/register — RF-002: el invitado completa su registro.
 *
 * El usuario nace en estado `pendiente`: registrarse no da acceso, solo lo
 * solicita. Hace falta que el admin apruebe (RF-003).
 */

const MIN_PASSWORD = 8

const esquema = z.object({
  token: z.string().min(1),
  nombre: z.string().trim().min(1).max(80),
  password: z.string().min(MIN_PASSWORD),
})

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
      {
        ok: false,
        mensaje: `Revisa los datos: el nombre no puede ir vacío y la contraseña necesita al menos ${MIN_PASSWORD} caracteres.`,
      },
      { status: 400 },
    )
  }

  // Se revalida aquí aunque la página ya lo hubiera hecho al abrirse: entre
  // que se cargó el formulario y se envió, la invitación pudo vencer o usarse.
  const invitacion = await buscarInvitacionVigente(datos.data.token)
  if (!invitacion) {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Esta invitación ya no sirve: o venció o ya se usó. Pídele al administrador que te envíe una nueva.",
      },
      { status: 410 },
    )
  }

  // El correo sale de la invitación, NUNCA del formulario. Si lo aceptáramos
  // del cliente, cualquiera con un token válido podría darse de alta con una
  // dirección distinta a la invitada.
  const email = invitacion.emailDestino

  const yaExiste = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true },
  })
  if (yaExiste) {
    return NextResponse.json(
      { ok: false, mensaje: "Ese correo ya tiene una cuenta. Intenta entrar." },
      { status: 409 },
    )
  }

  const passwordHash = await hashearPassword(datos.data.password)

  // En una transacción: si marcar la invitación fallara después de crear al
  // usuario, el token quedaría reutilizable.
  const usuario = await prisma.$transaction(async (tx) => {
    const creado = await tx.usuario.create({
      data: {
        nombre: datos.data.nombre.trim(),
        email,
        passwordHash,
        rol: "usuario",
        estado: "pendiente",
      },
      select: { id: true, nombre: true, email: true },
    })

    await tx.invitacion.update({
      where: { id: invitacion.id },
      data: { estado: "usado" },
    })

    return creado
  })

  // RF-003. No bloquea la respuesta: la cuenta ya existe, y si el aviso falla
  // el admin igual ve el registro en su panel. Queda en el log.
  const admin = await prisma.usuario.findFirst({
    where: { rol: "admin" },
    select: { email: true },
  })
  if (admin) {
    const aviso = await enviarNotificacionAdmin(
      admin.email,
      usuario.nombre,
      usuario.email,
    )
    if (!aviso.ok) {
      console.error(
        `[registro] No se pudo avisar al admin del alta de ${usuario.email}: ${aviso.motivo}`,
      )
    }
  }

  return NextResponse.json({ ok: true, email: usuario.email })
}
