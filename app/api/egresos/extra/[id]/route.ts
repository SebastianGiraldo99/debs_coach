import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { prisma } from "@/lib/db/prisma"

/**
 * DELETE /api/egresos/extra/[id] — borra un gasto grande mal registrado
 * (RF-051).
 *
 * No hay edición y no es un olvido: un gasto puntual son tres datos y
 * corregirlo es borrarlo y volver a anotarlo. Editarlo abriría la puerta a
 * reescribir el pasado —cambiarle la fecha a un gasto de hace tres meses mueve
 * la cifra de aquel mes— y no vale la complejidad.
 *
 * Un id ajeno responde 404, como en el resto de la app.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  const { id } = await params
  const usuarioId = guardia.usuario.id

  const borrados = await prisma.egresoExtra.deleteMany({ where: { id, usuarioId } })
  if (borrados.count === 0) {
    return NextResponse.json({ ok: false, mensaje: "Ese gasto ya no existe." }, { status: 404 })
  }

  // Sin evento, a diferencia del alta. El historial cuenta lo que pasó con el
  // dinero, y aquí no pasó nada: se corrige un registro que nunca debió estar.
  // Ver el mismo criterio en una deuda borrada.
  return NextResponse.json({ ok: true })
}
