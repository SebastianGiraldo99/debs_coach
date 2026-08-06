import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { prisma } from "@/lib/db/prisma"
import { esquemaIntencion } from "@/lib/finanzas/esquemas"
import { calcularEditableDesde, diasParaEditar } from "@/lib/objetivos/compromiso"

/**
 * PATCH /api/objetivos/[id] — editar una intención (RF-024).
 *
 * Filtra por `usuarioId` de sesión ADEMÁS de por id: el uuid es adivinable y
 * sin ese filtro cualquiera con sesión podría reescribir la intención de otro.
 *
 * La edición está congelada 30 días desde la creación o la última edición. No
 * es una traba burocrática: el plan entero se arma sobre la intención, y quien
 * la cambia cada semana no tiene plan, tiene una lista de deseos. Editar
 * renueva el compromiso otros 30 días.
 *
 * El monto queda dentro del candado por la misma razón que el texto: subir la
 * meta de 10 a 20 millones cambia el plan tanto como reescribir la frase.
 *
 * En Next 16 `params` es una promesa.
 */

const esquemaEdicion = esquemaIntencion.partial()

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

  const datos = esquemaEdicion.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa tu intención." },
      { status: 400 },
    )
  }

  const objetivo = await prisma.objetivo.findFirst({
    where: { id, usuarioId: guardia.usuario.id },
    select: { id: true, intencion: true, estado: true, editableDesde: true, montoObjetivo: true },
  })

  if (!objetivo) {
    return NextResponse.json({ ok: false, mensaje: "Esa intención ya no existe." }, { status: 404 })
  }

  if (objetivo.estado !== "activo") {
    return NextResponse.json(
      { ok: false, mensaje: "Esa intención ya está cerrada. Crea una nueva en su lugar." },
      { status: 409 },
    )
  }

  const dias = diasParaEditar(objetivo.editableDesde)
  if (dias > 0) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: `Podrás editar esta intención en ${dias} ${dias === 1 ? "día" : "días"}.`,
      },
      { status: 409 },
    )
  }

  const { intencion, montoObjetivo } = datos.data
  const montoActual = objetivo.montoObjetivo === null ? null : Number(objetivo.montoObjetivo.toString())
  const montoNuevo = montoObjetivo === undefined ? montoActual : (montoObjetivo ?? null)
  const intencionNueva = intencion ?? objetivo.intencion

  // Guardar sin tocar nada no puede costar otros 30 días de candado: quien
  // abre el diálogo, lo lee y le da a guardar no cambió de objetivo.
  if (intencionNueva === objetivo.intencion && montoNuevo === montoActual) {
    return NextResponse.json({ ok: true, sinCambios: true })
  }

  await prisma.objetivo.update({
    where: { id: objetivo.id },
    data: {
      intencion: intencionNueva,
      montoObjetivo: montoNuevo,
      editableDesde: calcularEditableDesde(),
    },
  })

  // Sin evento: `TipoEvento` no tiene `objetivo_editado` y añadirlo obligaría a
  // migrar el enum para alimentar un historial que hoy nadie pinta. El cambio
  // queda en la fila, que es donde se consulta.
  return NextResponse.json({ ok: true })
}
