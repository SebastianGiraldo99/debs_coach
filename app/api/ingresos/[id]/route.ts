import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { prisma } from "@/lib/db/prisma"
import { esquemaIngreso } from "@/lib/finanzas/esquemas"
import type { CategoriaIngreso } from "@/lib/finanzas/etiquetas"

/**
 * PATCH y DELETE /api/ingresos/[id] — editar o borrar un ingreso fijo.
 *
 * Convive con `/api/ingresos/extra`, que es un segmento estático y por tanto
 * gana a este dinámico. No hay ambigüedad: los ids son uuid.
 *
 * Las dos operaciones filtran por `usuarioId` de sesión además de por id.
 * Ver /api/deudas/[id].
 */

const esquemaActualizacion = esquemaIngreso.partial()

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  const { id } = await params

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ ok: false, mensaje: "No pudimos leer los datos." }, { status: 400 })
  }

  const datos = esquemaActualizacion.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa los datos del ingreso." },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id
  const existe = await prisma.ingreso.findFirst({ where: { id, usuarioId }, select: { id: true } })
  if (!existe) {
    return NextResponse.json({ ok: false, mensaje: "Ese ingreso ya no existe." }, { status: 404 })
  }

  const { descripcion, categoria, monto } = datos.data

  await prisma.$transaction(async (tx) => {
    await tx.ingreso.update({
      where: { id: existe.id },
      data: {
        ...(descripcion !== undefined && { descripcion: descripcion || null }),
        ...(categoria !== undefined && { categoria: categoria as CategoriaIngreso }),
        ...(monto !== undefined && { montoMensual: monto }),
      },
    })

    await tx.evento.create({
      data: {
        usuarioId,
        tipo: "ingreso_actualizado",
        payload: { ingresoId: existe.id, accion: "edicion", monto: monto ?? null },
      },
    })
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  const { id } = await params
  const usuarioId = guardia.usuario.id

  const borrados = await prisma.ingreso.deleteMany({ where: { id, usuarioId } })
  if (borrados.count === 0) {
    return NextResponse.json({ ok: false, mensaje: "Ese ingreso ya no existe." }, { status: 404 })
  }

  // Aquí el evento sí va: quitar un ingreso cambia la capacidad real, que es
  // la cuenta central del producto. No es un dato mal escrito como en una
  // deuda borrada, es dinero que dejó de entrar.
  await prisma.evento.create({
    data: {
      usuarioId,
      tipo: "ingreso_actualizado",
      payload: { ingresoId: id, accion: "baja" },
    },
  })

  return NextResponse.json({ ok: true })
}
