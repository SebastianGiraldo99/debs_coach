import { NextResponse } from "next/server"

import { exigirAdmin } from "@/lib/auth/api"
import { prisma } from "@/lib/db/prisma"

/**
 * DELETE /api/admin/usuarios/[id]/onboarding — RF-065 y RF-067.
 *
 * Devuelve a una persona al onboarding: borra lo que capturan sus cuatro
 * pasos —intención, deudas, ingresos y gastos fijos— y pone
 * `onboardingCompletadoEn` en null, que es la puerta que mira el DAL.
 *
 * Endpoint aparte del PATCH de al lado a propósito. Aquel es una máquina de
 * estados de la cuenta —aprobar, bloquear, desbloquear— con una tabla de
 * estado esperado por acción; esto no cambia de estado, borra datos. Meterlo
 * como una cuarta `accion` obligaría a colar una rama antes de esa tabla y a
 * que un cuerpo mal formado pudiera caer en el sitio equivocado.
 *
 * Lo que NO borra: check-ins, planes de IA, eventos, ingresos extra y gastos
 * grandes. Es el historial de la persona y es lo único que la app no puede
 * reconstruir. Queda apuntando a deudas y metas que ya no existen —igual que
 * el evento `egreso_extra` de un gasto borrado— pero nadie lo pinta hoy y
 * borrarlo sería tirar el pasado para arreglar el presente.
 *
 * En Next 16 `params` es una promesa.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guardia = await exigirAdmin()
  if (!guardia.ok) return guardia.respuesta

  const { id } = await params

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, email: true, rol: true },
  })

  if (!usuario) {
    return NextResponse.json(
      { ok: false, mensaje: "Ese usuario ya no existe." },
      { status: 404 },
    )
  }

  // Misma barrera que el cambio de estado, y por una razón parecida: el admin
  // que hace la petición es el único que puede recuperar la aplicación, y
  // borrarse a sí mismo desde la tabla de otra gente es justo el clic que esta
  // pantalla tiene que hacer difícil.
  if (usuario.rol === "admin") {
    return NextResponse.json(
      {
        ok: false,
        mensaje: "No se puede limpiar el onboarding de una cuenta de administrador.",
      },
      { status: 409 },
    )
  }

  // Todo o nada: media limpieza —sin deudas pero con la fecha puesta— dejaría
  // a la persona en el dashboard con cifras que no describen nada.
  const [objetivos, deudas, ingresos, egresos] = await prisma.$transaction([
    prisma.objetivo.deleteMany({ where: { usuarioId: id } }),
    prisma.deuda.deleteMany({ where: { usuarioId: id } }),
    prisma.ingreso.deleteMany({ where: { usuarioId: id } }),
    prisma.egreso.deleteMany({ where: { usuarioId: id } }),
    prisma.usuario.update({
      where: { id },
      data: { onboardingCompletadoEn: null },
    }),
  ])

  // Sin revocar sesiones: el DAL relee el usuario de la base en cada acceso,
  // así que en su siguiente navegación cae en /onboarding sola. Echarla
  // además de la sesión la obligaría a volver a escribir su contraseña para
  // hacer algo que el admin acaba de pedirle.

  const borrados = {
    objetivos: objetivos.count,
    deudas: deudas.count,
    ingresos: ingresos.count,
    egresos: egresos.count,
  }

  // Cuentas de filas, nunca montos: el admin no ve datos financieros de nadie
  // (RNF-006) y un log tampoco es sitio para ellos.
  console.info(
    `[admin] ${guardia.usuario.email} limpió el onboarding de ${usuario.email}: ` +
      `${borrados.objetivos} objetivos, ${borrados.deudas} deudas, ` +
      `${borrados.ingresos} ingresos, ${borrados.egresos} gastos fijos`,
  )

  return NextResponse.json({ ok: true, borrados })
}
