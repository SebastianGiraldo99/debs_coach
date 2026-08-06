import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { prisma } from "@/lib/db/prisma"
import { MAX_OBJETIVOS_ACTIVOS } from "@/lib/objetivos/compromiso"

/**
 * POST /api/objetivos/[id]/logrado — cerrar una intención cumplida (RF-027).
 *
 * Se puede marcar en cualquier momento, también dentro de los 30 días de
 * compromiso: el candado es contra cambiar de idea, no contra terminar. Lo que
 * no se puede es reabrirla; para eso está crear una nueva.
 *
 * **No dispara el Motor IA**, aunque `docs/plan.md` lo pida. Los disparadores
 * son tres y están fijados por RF-034 —fin de onboarding, check-in, ingreso
 * extra—; `TriggerPlan` no tiene un cuarto valor y añadirlo sería cambiar el
 * requerimiento desde una migración. El plan se recalibra en el próximo
 * check-in, que es lo que la pantalla le dice a la persona al cerrar la meta.
 */

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  const { id } = await params
  const usuarioId = guardia.usuario.id

  const objetivo = await prisma.objetivo.findFirst({
    where: { id, usuarioId },
    select: { id: true, intencion: true, estado: true, montoObjetivo: true, montoAcumulado: true },
  })

  if (!objetivo) {
    return NextResponse.json({ ok: false, mensaje: "Esa intención ya no existe." }, { status: 404 })
  }

  if (objetivo.estado !== "activo") {
    return NextResponse.json(
      { ok: false, mensaje: "Esa intención ya estaba cerrada." },
      { status: 409 },
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.objetivo.update({
      where: { id: objetivo.id },
      data: { estado: "logrado" },
    })

    // El evento es el rastro del logro en el historial: la fila del objetivo
    // solo guarda el estado de hoy, no cuándo cambió.
    await tx.evento.create({
      data: {
        usuarioId,
        tipo: "objetivo_logrado",
        payload: {
          objetivoId: objetivo.id,
          intencion: objetivo.intencion,
          montoObjetivo:
            objetivo.montoObjetivo === null ? null : Number(objetivo.montoObjetivo.toString()),
          montoAcumulado: Number(objetivo.montoAcumulado.toString()),
        },
      },
    })
  })

  const activos = await prisma.objetivo.count({ where: { usuarioId, estado: "activo" } })

  // RF-027: la pantalla propone una intención nueva, pero solo si cabe.
  return NextResponse.json({ ok: true, cupoLibre: activos < MAX_OBJETIVOS_ACTIVOS })
}
