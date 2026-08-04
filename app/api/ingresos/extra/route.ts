import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { prisma } from "@/lib/db/prisma"
import { esquemaIngresoExtra } from "@/lib/finanzas/esquemas"
import { generarYGuardarPlan } from "@/lib/ia/servicio"

/**
 * POST /api/ingresos/extra — registra un ingreso extraordinario y recalcula el
 * plan (RF-019, RF-020, RF-021).
 *
 * Son dos cosas y en este orden a propósito: primero se persiste el ingreso y
 * su evento, después se llama al motor. Si el proveedor se cae, el dinero que
 * la persona reportó ya quedó guardado y el plan se puede reintentar; al revés
 * se perdería el dato, que es lo único que la app no puede reconstruir.
 *
 * Por eso también responde 200 aunque el plan falle: el registro salió bien y
 * el cliente distingue por `planActualizado`.
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

  const datos = esquemaIngresoExtra.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa los datos del ingreso." },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id
  const { monto, descripcion, fecha } = datos.data

  // `fecha` viene como "2026-08-03" y la columna es DATE. Sin la Z, `new Date`
  // la interpretaría en la zona del servidor y en Colombia (UTC-5) el día se
  // guardaría corrido uno hacia atrás.
  const { ingresoExtraId, eventoId } = await prisma.$transaction(async (tx) => {
    const ingreso = await tx.ingresoExtra.create({
      data: {
        usuarioId,
        monto,
        moneda: guardia.usuario.monedaBase,
        descripcion,
        fecha: new Date(`${fecha}T00:00:00Z`),
      },
      select: { id: true },
    })

    const evento = await tx.evento.create({
      data: {
        usuarioId,
        tipo: "ingreso_extra",
        payload: { ingresoExtraId: ingreso.id, monto, descripcion },
      },
      select: { id: true },
    })

    return { ingresoExtraId: ingreso.id, eventoId: evento.id }
  })

  const resultado = await generarYGuardarPlan(usuarioId, "ingreso_extra", ingresoExtraId)

  // RF-021 pide que el evento registre su impacto en el plan. El planIaId solo
  // existe después de generarlo, así que se completa aquí: el evento ya estaba
  // escrito por si esta segunda parte no llegaba a ocurrir.
  if (resultado.ok) {
    await prisma.evento.update({
      where: { id: eventoId },
      data: {
        payload: { ingresoExtraId, monto, descripcion, planIaId: resultado.planId },
      },
    })
  }

  return NextResponse.json({
    ok: true,
    ingresoExtraId,
    planActualizado: resultado.ok,
    mensaje: resultado.ok ? undefined : resultado.mensaje,
  })
}
