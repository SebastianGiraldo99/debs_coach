import { NextResponse } from "next/server"
import { z } from "zod"

import { exigirUsuario } from "@/lib/auth/api"
import { prisma } from "@/lib/db/prisma"
import { esquemaDeuda } from "@/lib/finanzas/esquemas"
import type { TipoDeuda } from "@/lib/finanzas/etiquetas"

/**
 * PATCH y DELETE /api/deudas/[id] — editar una deuda o borrarla (RF-024).
 *
 * Las dos operaciones filtran por `usuarioId` de sesión ADEMÁS de por id. El
 * id es adivinable y sin ese filtro cualquiera con sesión podría editar la
 * deuda de otro pasando un uuid ajeno: es el IDOR del checklist de QA.
 *
 * En Next 16 `params` es una promesa.
 */

const esquemaActualizacion = esquemaDeuda.partial().extend({
  estado: z.enum(["activa", "saldada"]).optional(),
})

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
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa los datos de la deuda." },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id
  const deuda = await prisma.deuda.findFirst({
    where: { id, usuarioId },
    select: { id: true, nombre: true, estado: true, montoOriginal: true },
  })

  if (!deuda) {
    return NextResponse.json({ ok: false, mensaje: "Esa deuda ya no existe." }, { status: 404 })
  }

  const { nombre, tipo, saldo, tasaEA, pagoMinimo, estado } = datos.data
  const saldando = estado === "saldada" && deuda.estado !== "saldada"

  await prisma.$transaction(async (tx) => {
    await tx.deuda.update({
      where: { id: deuda.id },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(tipo !== undefined && { tipo: tipo as TipoDeuda }),
        // Saldar es dejar el saldo en cero. Aceptar "saldada" con saldo
        // pendiente dejaría una deuda invisible para la capacidad real.
        ...(saldando ? { montoActual: 0 } : saldo !== undefined && { montoActual: saldo }),
        ...(tasaEA !== undefined && { tasaInteres: tasaEA }),
        ...(pagoMinimo !== undefined && { pagoMinimo }),
        ...(estado !== undefined && { estado }),
      },
    })

    if (saldando) {
      await tx.evento.create({
        data: {
          usuarioId,
          tipo: "deuda_pagada",
          payload: {
            deudaId: deuda.id,
            nombre: deuda.nombre,
            montoOriginal: Number(deuda.montoOriginal.toString()),
          },
        },
      })
    }
  })

  return NextResponse.json({ ok: true })
}

/**
 * Borrar no es lo mismo que saldar y por eso no escribe evento: quien elimina
 * una deuda está corrigiendo un dato mal escrito, no celebrando un pago. Meter
 * las dos cosas en `deuda_pagada` inflaría el historial con logros falsos.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  const { id } = await params

  const borradas = await prisma.deuda.deleteMany({
    where: { id, usuarioId: guardia.usuario.id },
  })

  if (borradas.count === 0) {
    return NextResponse.json({ ok: false, mensaje: "Esa deuda ya no existe." }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
