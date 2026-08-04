import { NextResponse } from "next/server"
import { z } from "zod"

import { exigirUsuario } from "@/lib/auth/api"
import { generarYGuardarPlan } from "@/lib/ia/servicio"

/**
 * POST /api/ia/generar-plan — dispara el Motor IA (RF-034).
 *
 * No es un chat y no lo será (RF-035): el cuerpo admite exactamente un
 * disparador y, como mucho, el id de un ingreso extra. No hay ningún campo
 * por donde entre texto libre al prompt; todo lo que el modelo lee sale de la
 * base, consultado con el `usuarioId` de la sesión.
 *
 * Responde 200 aunque el proveedor falle. El motor cae a un plan calculado en
 * local y el cliente recibe `origen: "local"`: quedarse sin plan después de
 * entregar todos tus datos no es un final aceptable de un flujo.
 */

const esquemaCuerpo = z.object({
  trigger: z.enum(["onboarding", "check_in", "ingreso_extra"], {
    error: "No sabemos desde dónde se pidió el plan.",
  }),
  ingresoExtraId: z.uuid().optional(),
})

export async function POST(request: Request) {
  const guardia = await exigirUsuario()
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

  const datos = esquemaCuerpo.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Petición inválida." },
      { status: 400 },
    )
  }

  const { trigger, ingresoExtraId } = datos.data

  // Los otros dos disparadores viven dentro de la app; sin onboarding
  // terminado no hay check-in ni ingreso extra que registrar.
  if (trigger !== "onboarding" && !guardia.usuario.onboardingCompletadoEn) {
    return NextResponse.json(
      { ok: false, mensaje: "Primero termina tu registro." },
      { status: 409 },
    )
  }

  const resultado = await generarYGuardarPlan(guardia.usuario.id, trigger, ingresoExtraId)

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
