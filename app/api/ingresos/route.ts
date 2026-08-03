import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { esquemaListaIngresos } from "@/lib/finanzas/esquemas"
import { prisma } from "@/lib/db/prisma"
import type { CategoriaIngreso } from "@/lib/finanzas/etiquetas"

/** PUT /api/ingresos — reemplaza la lista completa. Ver /api/deudas. */
export async function PUT(request: Request) {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ ok: false, mensaje: "No pudimos leer los datos." }, { status: 400 })
  }

  const datos = esquemaListaIngresos.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa tus ingresos." },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id
  const moneda = guardia.usuario.monedaBase

  await prisma.$transaction([
    prisma.ingreso.deleteMany({ where: { usuarioId } }),
    prisma.ingreso.createMany({
      data: datos.data.ingresos.map((i) => ({
        usuarioId,
        descripcion: i.descripcion || null,
        categoria: i.categoria as CategoriaIngreso,
        montoMensual: i.monto,
        moneda,
      })),
    }),
  ])

  return NextResponse.json({ ok: true, guardados: datos.data.ingresos.length })
}
