import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { esquemaListaDeudas } from "@/lib/finanzas/esquemas"
import { prisma } from "@/lib/db/prisma"
import type { TipoDeuda } from "@/lib/finanzas/etiquetas"

/**
 * PUT /api/deudas — reemplaza la lista completa de deudas del usuario.
 *
 * PUT y no POST porque el onboarding se puede retomar: si el usuario vuelve
 * atrás y reenvía el paso, POST duplicaría las filas. Reemplazar deja el paso
 * idempotente.
 *
 * El usuarioId sale de la sesión, nunca del cuerpo (evita IDOR).
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

  const datos = esquemaListaDeudas.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa los datos de tus deudas." },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id
  const moneda = guardia.usuario.monedaBase

  await prisma.$transaction([
    prisma.deuda.deleteMany({ where: { usuarioId } }),
    prisma.deuda.createMany({
      data: datos.data.deudas.map((d) => ({
        usuarioId,
        nombre: d.nombre,
        tipo: d.tipo as TipoDeuda,
        // En el alta, lo que se debe hoy es también el punto de partida: es
        // la referencia contra la que se medirá el progreso.
        montoOriginal: d.saldo,
        montoActual: d.saldo,
        moneda,
        tasaInteres: d.tasaEA ?? null,
        pagoMinimo: d.pagoMinimo ?? null,
      })),
    }),
  ])

  return NextResponse.json({ ok: true, guardadas: datos.data.deudas.length })
}
