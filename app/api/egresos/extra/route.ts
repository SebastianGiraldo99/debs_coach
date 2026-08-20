import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { prisma } from "@/lib/db/prisma"
import { esquemaGastoExtra } from "@/lib/finanzas/esquemas"
import { esGastoConsiderable, umbralGastoConsiderable } from "@/lib/finanzas/umbral-gasto"

/**
 * POST /api/egresos/extra — registra un gasto grande y puntual (RF-047).
 *
 * **No llama al Motor IA, y eso es deliberado (RF-059).** El ingreso extra sí
 * lo hace, y la simetría invita a copiarlo; pero RF-034 fija tres disparadores
 * y añadir un cuarto sería cambiar el requerimiento desde una ruta de API. El
 * plan se recalibra en el próximo check-in, y mientras tanto el dashboard avisa
 * de que puede estar desactualizado.
 *
 * El usuarioId sale de la sesión, nunca del cuerpo.
 */
export async function POST(request: Request) {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  if (!guardia.usuario.onboardingCompletadoEn) {
    return NextResponse.json(
      { ok: false, mensaje: "Primero termina tu registro." },
      { status: 409 },
    )
  }

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ ok: false, mensaje: "No pudimos leer los datos." }, { status: 400 })
  }

  const datos = esquemaGastoExtra.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa los datos del gasto." },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id
  const { monto, descripcion, fecha } = datos.data

  // El umbral se recalcula aquí aunque la pantalla ya lo haya mostrado: lo que
  // dice el cliente no obliga a nadie.
  const ingresos = await prisma.ingreso.aggregate({
    where: { usuarioId },
    _sum: { montoMensual: true },
  })
  const ingresosMensuales = Number(ingresos._sum.montoMensual?.toString() ?? 0)

  if (!esGastoConsiderable(monto, ingresosMensuales)) {
    // 422 y no 400: el cuerpo está bien formado y es la regla de negocio la que
    // lo rechaza. El cliente necesita distinguirlo para explicar en vez de
    // decir "revisa los datos".
    //
    // El log no lleva el monto (RNF-025): para saber que alguien tropieza con
    // el umbral basta el hecho.
    console.info(`[gastos] gasto por debajo del umbral, usuario ${usuarioId}`)
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Aquí anotamos los gastos grandes, los que se sienten en el mes. Si es algo que pagas siempre, va mejor en tus gastos fijos.",
        umbral: umbralGastoConsiderable(ingresosMensuales),
      },
      { status: 422 },
    )
  }

  // `fecha` viene como "2026-08-03" y la columna es DATE. Sin la Z, `new Date`
  // la interpretaría en la zona del servidor y en Colombia (UTC-5) el día se
  // guardaría corrido uno hacia atrás.
  const gasto = await prisma.$transaction(async (tx) => {
    const creado = await tx.egresoExtra.create({
      data: {
        usuarioId,
        monto,
        moneda: guardia.usuario.monedaBase,
        descripcion,
        fecha: new Date(`${fecha}T00:00:00Z`),
      },
      select: { id: true },
    })

    await tx.evento.create({
      data: {
        usuarioId,
        tipo: "egreso_extra",
        payload: { egresoExtraId: creado.id, monto, descripcion, fecha },
      },
    })

    return creado
  })

  return NextResponse.json({ ok: true, id: gasto.id }, { status: 201 })
}
