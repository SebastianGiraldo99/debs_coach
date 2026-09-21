import { NextResponse } from "next/server"
import { z } from "zod"

import { exigirAdmin } from "@/lib/auth/api"
import { prisma } from "@/lib/db/prisma"

/**
 * PUT /api/admin/usuarios/[id]/permisos — RF-070.
 *
 * Enciende o apaga, para una persona, el permiso de recalcular su plan a
 * voluntad (RF-068).
 *
 * Endpoint aparte del PATCH de al lado por la misma razón que el de limpiar el
 * onboarding: aquel es la máquina de estados de la cuenta —aprobar, bloquear,
 * desbloquear— y esto no cambia de estado. Es PUT porque el cuerpo dice cómo
 * debe quedar el permiso, no que se invierta: dos clics seguidos en la tabla
 * dejan el valor que se ve, no el contrario.
 *
 * En Next 16 `params` es una promesa.
 */

const esquemaCuerpo = z.object({
  recalcularPlan: z.boolean({ error: "Indica si el permiso queda activado o no." }),
})

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guardia = await exigirAdmin()
  if (!guardia.ok) return guardia.respuesta

  const { id } = await params

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ ok: false, mensaje: "No pudimos leer los datos." }, { status: 400 })
  }

  const datos = esquemaCuerpo.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Petición inválida." },
      { status: 400 },
    )
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, email: true, rol: true },
  })

  if (!usuario) {
    return NextResponse.json({ ok: false, mensaje: "Ese usuario ya no existe." }, { status: 404 })
  }

  // El admin no tiene plan: no tiene datos financieros (RNF-006).
  if (usuario.rol === "admin") {
    return NextResponse.json(
      { ok: false, mensaje: "Una cuenta de administrador no tiene plan que recalcular." },
      { status: 409 },
    )
  }

  const { recalcularPlan } = datos.data
  await prisma.usuario.update({
    where: { id },
    data: { puedeRecalcularPlan: recalcularPlan },
  })

  console.info(
    `[admin] ${guardia.usuario.email} ${recalcularPlan ? "activó" : "desactivó"} ` +
      `recalcular el plan para ${usuario.email}`,
  )

  return NextResponse.json({ ok: true, recalcularPlan })
}
