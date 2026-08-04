import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { esquemaDeuda, esquemaListaDeudas } from "@/lib/finanzas/esquemas"
import { prisma } from "@/lib/db/prisma"
import type { TipoDeuda } from "@/lib/finanzas/etiquetas"

/**
 * POST /api/deudas — agrega una deuda desde la pantalla de deudas (RF-024).
 *
 * Coexiste con el PUT de abajo y no lo sustituye: el onboarding manda la lista
 * entera de una vez y necesita ser idempotente, mientras que aquí se agrega
 * una sola sin tocar las demás. Usar el PUT desde esta pantalla obligaría al
 * cliente a reenviar todo lo que ya tiene, y una carrera entre dos pestañas
 * borraría lo que la otra acabara de guardar.
 *
 * No dispara el Motor IA: los tres disparadores están fijados (RF-034) y
 * editar datos base no es uno. El dashboard avisa de que el plan quedó viejo.
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

  const datos = esquemaDeuda.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa los datos de la deuda." },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id
  const d = datos.data

  const deuda = await prisma.$transaction(async (tx) => {
    const creada = await tx.deuda.create({
      data: {
        usuarioId,
        nombre: d.nombre,
        tipo: d.tipo as TipoDeuda,
        montoOriginal: d.saldo,
        montoActual: d.saldo,
        moneda: guardia.usuario.monedaBase,
        tasaInteres: d.tasaEA ?? null,
        pagoMinimo: d.pagoMinimo ?? null,
      },
      select: { id: true },
    })

    await tx.evento.create({
      data: {
        usuarioId,
        tipo: "deuda_nueva",
        payload: { deudaId: creada.id, nombre: d.nombre, monto: d.saldo },
      },
    })

    return creada
  })

  return NextResponse.json({ ok: true, id: deuda.id })
}

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
