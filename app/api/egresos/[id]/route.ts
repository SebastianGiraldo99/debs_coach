import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { prisma } from "@/lib/db/prisma"
import { esquemaEgreso } from "@/lib/finanzas/esquemas"
import type { CategoriaEgreso } from "@/lib/finanzas/etiquetas"

/**
 * PATCH y DELETE /api/egresos/[id] — editar o borrar un gasto fijo (RF-043,
 * RF-044).
 *
 * Hasta ahora los gastos solo se capturaban en el paso 4 del onboarding, y el
 * único endpoint que existía reemplazaba la lista entera: un gasto mal anotado
 * quedaba mal para siempre. Como la capacidad real sale de restarlos a los
 * ingresos, ese error se propagaba a las tres cifras, a la proyección y a todos
 * los planes posteriores.
 *
 * Convive con `/api/egresos/extra`, que es un segmento estático y por tanto
 * gana a este dinámico. No hay ambigüedad: los ids son uuid.
 *
 * Las dos operaciones filtran por `usuarioId` de sesión además de por id, y un
 * id ajeno responde 404: a quien pide lo que no es suyo no se le confirma que
 * exista. Ver /api/ingresos/[id].
 */

const esquemaActualizacion = esquemaEgreso.partial()

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
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa los datos del gasto." },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id
  const existe = await prisma.egreso.findFirst({ where: { id, usuarioId }, select: { id: true } })
  if (!existe) {
    return NextResponse.json({ ok: false, mensaje: "Ese gasto ya no existe." }, { status: 404 })
  }

  const { descripcion, categoria, monto } = datos.data

  await prisma.$transaction(async (tx) => {
    await tx.egreso.update({
      where: { id: existe.id },
      data: {
        ...(descripcion !== undefined && { descripcion: descripcion || null }),
        ...(categoria !== undefined && { categoria: categoria as CategoriaEgreso }),
        ...(monto !== undefined && { montoMensual: monto }),
      },
    })

    await tx.evento.create({
      data: {
        usuarioId,
        tipo: "egreso_actualizado",
        payload: { egresoId: existe.id, accion: "edicion", monto: monto ?? null },
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

  const borrados = await prisma.egreso.deleteMany({ where: { id, usuarioId } })
  if (borrados.count === 0) {
    return NextResponse.json({ ok: false, mensaje: "Ese gasto ya no existe." }, { status: 404 })
  }

  // El evento va, por lo mismo que en un ingreso dado de baja: quitar un gasto
  // fijo cambia la capacidad real, que es la cuenta central del producto. No es
  // un dato mal escrito, es un compromiso mensual que dejó de existir.
  await prisma.evento.create({
    data: {
      usuarioId,
      tipo: "egreso_actualizado",
      payload: { egresoId: id, accion: "baja" },
    },
  })

  return NextResponse.json({ ok: true })
}
