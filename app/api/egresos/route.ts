import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { esquemaEgreso, esquemaListaEgresos } from "@/lib/finanzas/esquemas"
import { prisma } from "@/lib/db/prisma"
import type { CategoriaEgreso } from "@/lib/finanzas/etiquetas"

/**
 * POST /api/egresos — agrega un gasto fijo desde la pantalla de gastos
 * (RF-042). Ver el POST de /api/ingresos para por qué convive con el PUT.
 *
 * El gasto grande y puntual es otra cosa y vive en /api/egresos/extra: aquel
 * ocurrió un día y solo afecta a su mes, este es un compromiso mensual que
 * entra en la capacidad real.
 */
export async function POST(request: Request) {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ ok: false, mensaje: "No pudimos leer los datos." }, { status: 400 })
  }

  const datos = esquemaEgreso.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa los datos del gasto." },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id
  const e = datos.data

  const egreso = await prisma.$transaction(async (tx) => {
    const creado = await tx.egreso.create({
      data: {
        usuarioId,
        descripcion: e.descripcion || null,
        categoria: e.categoria as CategoriaEgreso,
        montoMensual: e.monto,
        moneda: guardia.usuario.monedaBase,
      },
      select: { id: true },
    })

    await tx.evento.create({
      data: {
        usuarioId,
        tipo: "egreso_actualizado",
        payload: { egresoId: creado.id, accion: "alta", monto: e.monto },
      },
    })

    return creado
  })

  return NextResponse.json({ ok: true, id: egreso.id }, { status: 201 })
}

/**
 * PUT /api/egresos — reemplaza la lista completa. Ver /api/deudas.
 *
 * **Reservado al onboarding (RF-063).** Borra todos los gastos del usuario
 * antes de escribir los nuevos, así que llamarlo desde la pantalla de gastos
 * —donde la persona solo quería añadir uno— se llevaría por delante el resto.
 * Para eso están el POST de aquí arriba y /api/egresos/[id].
 */
export async function PUT(request: Request) {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ ok: false, mensaje: "No pudimos leer los datos." }, { status: 400 })
  }

  const datos = esquemaListaEgresos.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa tus gastos." },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id
  const moneda = guardia.usuario.monedaBase

  await prisma.$transaction([
    prisma.egreso.deleteMany({ where: { usuarioId } }),
    prisma.egreso.createMany({
      data: datos.data.egresos.map((e) => ({
        usuarioId,
        descripcion: e.descripcion || null,
        categoria: e.categoria as CategoriaEgreso,
        montoMensual: e.monto,
        moneda,
      })),
    }),
  ])

  return NextResponse.json({ ok: true, guardados: datos.data.egresos.length })
}
