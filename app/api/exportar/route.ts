import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { construirLibro } from "@/lib/exportar/libro"
import { hoyEnBogota } from "@/lib/finanzas/calendario"

/**
 * GET /api/exportar — descarga un Excel con todos los datos de quien lo pide
 * (RF-071 a RF-074).
 *
 * GET y no POST porque es una descarga: un `<a href download>` basta, sin
 * JavaScript, y el navegador muestra su propia barra de progreso. No acepta
 * parámetros: el `usuarioId` sale de la sesión y no hay forma de pedir el
 * archivo de otra persona.
 *
 * El admin no tiene datos financieros (RNF-006) ni onboarding, así que le
 * responde 409 como a cualquiera que no haya terminado el registro.
 */
export async function GET() {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  const { usuario } = guardia
  if (!usuario.onboardingCompletadoEn) {
    return NextResponse.json(
      { ok: false, mensaje: "Primero termina tu registro." },
      { status: 409 },
    )
  }

  const libro = await construirLibro(usuario)
  const buffer = await libro.xlsx.writeBuffer()

  // Sin cifras ni nombres en el log: solo quién y cuándo.
  console.info(`[exportar] ${usuario.email} descargó sus datos`)

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="coach-financiero-${hoyEnBogota()}.xlsx"`,
      // Son datos financieros: ni el navegador ni un proxy intermedio deben
      // guardar una copia.
      "Cache-Control": "private, no-store",
    },
  })
}
