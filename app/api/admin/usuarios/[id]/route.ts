import { NextResponse } from "next/server"
import { z } from "zod"

import { exigirAdmin } from "@/lib/auth/api"
import { revocarSesionesDe } from "@/lib/auth/refresco"
import { prisma } from "@/lib/db/prisma"
import { enviarAprobacion } from "@/lib/email/resend"

/**
 * PATCH /api/admin/usuarios/[id] — RF-003 (aprobar) y RF-005 (bloquear y
 * desbloquear).
 *
 * En Next 16 `params` es una promesa.
 */

const esquema = z.object({
  accion: z.enum(["aprobar", "bloquear", "desbloquear"]),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guardia = await exigirAdmin()
  if (!guardia.ok) return guardia.respuesta

  const { id } = await params

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
      { ok: false, mensaje: "Acción no reconocida." },
      { status: 400 },
    )
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nombre: true, email: true, rol: true, estado: true },
  })

  if (!usuario) {
    return NextResponse.json(
      { ok: false, mensaje: "Ese usuario ya no existe." },
      { status: 404 },
    )
  }

  // Incluye al propio admin que hace la petición: sin esta barrera podría
  // bloquearse a sí mismo y quedarse fuera de su propia aplicación, sin
  // ninguna otra cuenta capaz de devolverle el acceso.
  if (usuario.rol === "admin") {
    return NextResponse.json(
      {
        ok: false,
        mensaje: "No se puede cambiar el estado de una cuenta de administrador.",
      },
      { status: 409 },
    )
  }

  const { accion } = datos.data

  const esperado: Record<typeof accion, "pendiente" | "activo" | "bloqueado"> = {
    aprobar: "pendiente",
    bloquear: "activo",
    desbloquear: "bloqueado",
  }

  if (usuario.estado !== esperado[accion]) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: `No se puede ${accion}: la cuenta está en estado "${usuario.estado}".`,
      },
      { status: 409 },
    )
  }

  const nuevoEstado = accion === "bloquear" ? "bloqueado" : "activo"

  await prisma.usuario.update({
    where: { id },
    data: { estado: nuevoEstado },
  })

  // Bloquear tiene que cortar también las sesiones abiertas. El DAL ya le
  // niega los datos —relee el estado en cada acceso—, pero dejarle el refresh
  // vivo significa que, si mañana lo desbloquean, entra sin volver a
  // autenticarse. Bloquear es "fuera", y fuera es fuera.
  if (accion === "bloquear") {
    await revocarSesionesDe(id)
  }

  // El correo solo se manda al aprobar. Desbloquear también deja la cuenta
  // activa, pero avisar de una "aprobación" que el usuario ya vivió sería
  // confuso: nunca supo que estaba bloqueado.
  if (accion === "aprobar") {
    const aviso = await enviarAprobacion(usuario.email)
    if (!aviso.ok) {
      console.error(
        `[admin] Aprobado ${usuario.email} pero falló el aviso: ${aviso.motivo}`,
      )
      return NextResponse.json({
        ok: true,
        estado: nuevoEstado,
        advertencia:
          "La cuenta quedó aprobada, pero no pudimos enviarle el correo de aviso. Avísale por otro medio.",
      })
    }
  }

  return NextResponse.json({ ok: true, estado: nuevoEstado })
}
