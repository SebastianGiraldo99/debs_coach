import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { generarYGuardarPlan } from "@/lib/ia/servicio"

/**
 * POST /api/ia/recalcular-plan — RF-068 y RF-069.
 *
 * Vuelve a pasar por el Motor IA los datos de hoy, sin hacer otro check-in.
 * El caso es el de quien acaba de hacer su check-in, se da cuenta de que no
 * anotó una deuda nueva, la añade en /deudas y quiere saber si eso cambia a
 * qué pagar primero. Repetir el check-in no sirve para eso: volvería a restar
 * los abonos que ya restó el primero.
 *
 * No lleva cuerpo. Todo lo que el modelo lee sale de la base con el
 * `usuarioId` de la sesión, igual que en los otros disparadores (RF-035).
 *
 * El trigger es `check_in` y no uno nuevo: RF-034 fija tres, y esto es el plan
 * del check-in rehecho con los datos corregidos. Lo que cambia es el texto del
 * momento en el prompt y la marca `recalculo` en el evento.
 *
 * El permiso se relee de la base en cada petición (lo hace el DAL), así que
 * si el admin lo quita, la siguiente llamada ya responde 403. Ocultar el botón
 * es solo cortesía; la barrera es esta.
 */
export async function POST() {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  const { usuario } = guardia

  if (!usuario.puedeRecalcularPlan) {
    return NextResponse.json(
      { ok: false, mensaje: "Tu cuenta no tiene activado recalcular el plan." },
      { status: 403 },
    )
  }

  if (!usuario.onboardingCompletadoEn) {
    return NextResponse.json(
      { ok: false, mensaje: "Primero termina tu registro." },
      { status: 409 },
    )
  }

  const resultado = await generarYGuardarPlan(usuario.id, "check_in", undefined, {
    recalculo: true,
  })

  if (!resultado.ok) {
    return NextResponse.json({ ok: false, mensaje: resultado.mensaje }, { status: 409 })
  }

  return NextResponse.json({
    ok: true,
    planId: resultado.planId,
    plan: resultado.plan,
    origen: resultado.origen,
  })
}
