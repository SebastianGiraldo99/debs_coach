import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { calcularCapacidadReal } from "@/lib/finanzas/capacidad"
import { prisma } from "@/lib/db/prisma"

/**
 * POST /api/onboarding/completar — cierra el onboarding.
 *
 * Marca `onboardingCompletadoEn`, que es la puerta al área de usuario: sin
 * esa fecha el DAL devuelve a /onboarding. Por eso comprueba antes que haya
 * lo mínimo para que el dashboard tenga algo que mostrar y la IA algo que
 * analizar.
 *
 * Las deudas NO se exigen: no tener ninguna es una situación legítima, y
 * pedirla obligaría a inventarse una para poder avanzar.
 */
export async function POST() {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  const usuarioId = guardia.usuario.id

  if (guardia.usuario.onboardingCompletadoEn) {
    return NextResponse.json({ ok: true, yaEstaba: true })
  }

  const [objetivos, ingresos] = await Promise.all([
    prisma.objetivo.count({ where: { usuarioId, estado: "activo" } }),
    prisma.ingreso.count({ where: { usuarioId } }),
  ])

  const faltantes: string[] = []
  if (objetivos === 0) faltantes.push("tu intención")
  if (ingresos === 0) faltantes.push("al menos un ingreso")

  if (faltantes.length > 0) {
    return NextResponse.json(
      { ok: false, mensaje: `Todavía falta ${faltantes.join(" y ")}.` },
      { status: 409 },
    )
  }

  const capacidad = await calcularCapacidadReal(usuarioId)

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { onboardingCompletadoEn: new Date() },
  })

  // Deja el punto de partida en el historial: contra esta foto se medirá
  // todo el progreso posterior.
  await prisma.evento.create({
    data: {
      usuarioId,
      tipo: "plan_generado",
      payload: {
        motivo: "onboarding_completado",
        capacidadReal: capacidad.capacidadReal,
        ingresos: capacidad.ingresos,
        egresos: capacidad.egresos,
        deudaTotal: capacidad.deudaTotal,
      },
    },
  })

  return NextResponse.json({ ok: true, capacidad })
}
