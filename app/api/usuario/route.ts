import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { esquemaMoneda } from "@/lib/finanzas/esquemas"
import { prisma } from "@/lib/db/prisma"

/**
 * PATCH /api/usuario — por ahora solo la moneda base (primer paso del
 * onboarding).
 *
 * Se pregunta antes que cualquier monto porque sin tasas de cambio todos los
 * montos de una persona tienen que compartir moneda: no se puede sumar un
 * ingreso en dólares con una deuda en pesos. Ver DIRECTRICES_DISENO §14.
 */
export async function PATCH(request: Request) {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ ok: false, mensaje: "No pudimos leer los datos." }, { status: 400 })
  }

  const datos = esquemaMoneda.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json({ ok: false, mensaje: "Moneda no reconocida." }, { status: 400 })
  }

  // Cambiarla con montos ya cargados los reinterpretaría en silencio: 4.800.000
  // pesos pasarían a leerse como 4.800.000 dólares. Solo se permite mientras
  // no haya nada guardado.
  if (datos.data.monedaBase !== guardia.usuario.monedaBase) {
    const [deudas, ingresos, egresos] = await Promise.all([
      prisma.deuda.count({ where: { usuarioId: guardia.usuario.id } }),
      prisma.ingreso.count({ where: { usuarioId: guardia.usuario.id } }),
      prisma.egreso.count({ where: { usuarioId: guardia.usuario.id } }),
    ])
    if (deudas + ingresos + egresos > 0) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No puedes cambiar de moneda con montos ya registrados: se reinterpretarían con la nueva moneda. Bórralos primero.",
        },
        { status: 409 },
      )
    }
  }

  await prisma.usuario.update({
    where: { id: guardia.usuario.id },
    data: { monedaBase: datos.data.monedaBase },
  })

  return NextResponse.json({ ok: true, monedaBase: datos.data.monedaBase })
}
