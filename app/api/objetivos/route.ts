import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { esquemaIntencion } from "@/lib/finanzas/esquemas"
import { prisma } from "@/lib/db/prisma"

/**
 * POST /api/objetivos — crea la intención del usuario (RF-008).
 *
 * Máximo 3 activas, y cada una queda congelada 30 días: la ETR lo pide para
 * que el compromiso signifique algo. Cambiar de objetivo cada semana anula
 * cualquier plan.
 */

const MAX_ACTIVOS = 3
const DIAS_COMPROMISO = 30

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

  const datos = esquemaIntencion.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: datos.error.issues[0]?.message ?? "Revisa tu intención.",
      },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id

  // Durante el onboarding este endpoint se puede reenviar si el usuario
  // vuelve atrás. Sin esto acabaría con tres objetivos idénticos y el cupo
  // agotado antes de entrar a la app.
  const existente = await prisma.objetivo.findFirst({
    where: { usuarioId, estado: "activo" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })

  if (existente && !guardia.usuario.onboardingCompletadoEn) {
    const actualizado = await prisma.objetivo.update({
      where: { id: existente.id },
      data: {
        intencion: datos.data.intencion,
        montoObjetivo: datos.data.montoObjetivo ?? null,
      },
      select: { id: true },
    })
    return NextResponse.json({ ok: true, id: actualizado.id, actualizado: true })
  }

  const activos = await prisma.objetivo.count({
    where: { usuarioId, estado: "activo" },
  })
  if (activos >= MAX_ACTIVOS) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: `Ya tienes ${MAX_ACTIVOS} intenciones activas. Marca una como lograda antes de agregar otra.`,
      },
      { status: 409 },
    )
  }

  const editableDesde = new Date()
  editableDesde.setDate(editableDesde.getDate() + DIAS_COMPROMISO)

  const objetivo = await prisma.objetivo.create({
    data: {
      usuarioId,
      intencion: datos.data.intencion,
      montoObjetivo: datos.data.montoObjetivo ?? null,
      editableDesde,
    },
    select: { id: true },
  })

  // Tabla `eventos`: historial completo del progreso (event sourcing liviano).
  await prisma.evento.create({
    data: {
      usuarioId,
      tipo: "objetivo_creado",
      payload: {
        objetivoId: objetivo.id,
        intencion: datos.data.intencion,
        montoObjetivo: datos.data.montoObjetivo ?? null,
      },
    },
  })

  return NextResponse.json({ ok: true, id: objetivo.id })
}
