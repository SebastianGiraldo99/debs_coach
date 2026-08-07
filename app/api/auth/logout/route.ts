import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { COOKIE_REFRESH, revocarRefresh } from "@/lib/auth/refresco"
import { eliminarSession } from "@/lib/auth/session"

/**
 * POST /api/auth/logout — cierre de sesión. La ETR no le asigna un RF propio.
 *
 * Solo POST: si fuera GET, cualquier <img src="/api/auth/logout"> en una
 * página ajena cerraría la sesión del usuario sin que él lo pidiera.
 *
 * Borrar las cookies no basta desde que hay refresh (RNF-002): una copia del
 * token seguiría emitiendo accesos durante siete días. Primero se revoca la
 * familia en base y después se limpian las cookies; al revés nos quedaríamos
 * sin el token con el que saber qué revocar.
 */
export async function POST() {
  const cookieStore = await cookies()
  await revocarRefresh(cookieStore.get(COOKIE_REFRESH)?.value)
  await eliminarSession()
  return NextResponse.json({ ok: true })
}
