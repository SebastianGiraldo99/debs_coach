import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { usuarioActual, type UsuarioSesion } from "@/lib/auth/dal"
import { COOKIE_REFRESH, MAX_AGE_REFRESH, rotarRefresh } from "@/lib/auth/refresco"
import {
  COOKIE_SESION,
  MAX_AGE_ACCESO,
  firmarAcceso,
  obtenerSession,
  opcionesCookie,
} from "@/lib/auth/session"

/**
 * Guardias para route handlers.
 *
 * El DAL usa `redirect()`, que en una API devolvería un 307 hacia una página
 * HTML en vez de un error que el cliente pueda leer. Aquí se responde con
 * códigos de estado.
 *
 * El proxy NO sustituye a esto: su matcher excluye `/api` y sus
 * comprobaciones son optimistas —solo miran la cookie—, así que cada endpoint
 * tiene que defenderse solo. Esa exclusión es también la razón de que el
 * refresco (RNF-002) se repita aquí: sin él, la pestaña que lleva un día
 * abierta manda su formulario y recibe un 401 aunque el refresh siga vivo.
 */

/**
 * Renueva el acceso si venció y hay refresh vigente. Silenciosa: si no se
 * puede, deja las cosas como estaban y el guardia responde 401 como siempre.
 *
 * Aquí sí se pueden escribir cookies —estamos en un route handler—, cosa que
 * en el render de un Server Component sería un error de Next.
 */
async function refrescarSiVencio(): Promise<void> {
  if (await obtenerSession()) return

  const cookieStore = await cookies()
  const refreshCrudo = cookieStore.get(COOKIE_REFRESH)?.value
  if (!refreshCrudo) return

  const refrescada = await rotarRefresh(refreshCrudo)
  if (!refrescada) {
    cookieStore.delete(COOKIE_REFRESH)
    return
  }

  const acceso = await firmarAcceso({
    userId: refrescada.usuarioId,
    rol: refrescada.rol,
  })
  cookieStore.set(COOKIE_SESION, acceso, opcionesCookie(MAX_AGE_ACCESO))
  cookieStore.set(COOKIE_REFRESH, refrescada.token, opcionesCookie(MAX_AGE_REFRESH))
}

export type Guardia =
  | { ok: true; usuario: UsuarioSesion }
  | { ok: false; respuesta: NextResponse }

function error(mensaje: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, mensaje }, { status })
}

export async function exigirUsuario(): Promise<Guardia> {
  // Antes de leer la sesión, no después: `usuarioActual` va memorizada con
  // `cache()` y un null resuelto ahora se quedaría fijo para todo el request.
  await refrescarSiVencio()

  const usuario = await usuarioActual()
  if (!usuario) return { ok: false, respuesta: error("No has iniciado sesión.", 401) }
  return { ok: true, usuario }
}

export async function exigirAdmin(): Promise<Guardia> {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia
  if (guardia.usuario.rol !== "admin") {
    // 404 y no 403: a quien no es admin no le confirmamos que la ruta existe.
    return { ok: false, respuesta: error("No encontrado.", 404) }
  }
  return guardia
}
