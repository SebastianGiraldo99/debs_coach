import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { esquemaListaEgresos } from "@/lib/finanzas/esquemas"
import { prisma } from "@/lib/db/prisma"
import type { CategoriaEgreso } from "@/lib/finanzas/etiquetas"

/** PUT /api/egresos — reemplaza la lista completa. Ver /api/deudas. */
export async function PUT(request: Request) {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ ok: false, mensaje: "No pudimos leer los datos." }, { status: 400 })
  }

  const datos = esquemaListaEgresos.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa tus gastos." },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id
  const moneda = guardia.usuario.monedaBase

  await prisma.$transaction([
    prisma.egreso.deleteMany({ where: { usuarioId } }),
    prisma.egreso.createMany({
      data: datos.data.egresos.map((e) => ({
        usuarioId,
        descripcion: e.descripcion || null,
        categoria: e.categoria as CategoriaEgreso,
        montoMensual: e.monto,
        moneda,
      })),
    }),
  ])

  return NextResponse.json({ ok: true, guardados: datos.data.egresos.length })
}
