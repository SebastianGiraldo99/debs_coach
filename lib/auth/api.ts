import { NextResponse } from "next/server"

import { usuarioActual, type UsuarioSesion } from "@/lib/auth/dal"

/**
 * Guardias para route handlers.
 *
 * El DAL usa `redirect()`, que en una API devolvería un 307 hacia una página
 * HTML en vez de un error que el cliente pueda leer. Aquí se responde con
 * códigos de estado.
 *
 * El proxy NO sustituye a esto: su matcher excluye `/api` y sus
 * comprobaciones son optimistas —solo miran la cookie—, así que cada endpoint
 * tiene que defenderse solo.
 */

export type Guardia =
  | { ok: true; usuario: UsuarioSesion }
  | { ok: false; respuesta: NextResponse }

function error(mensaje: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, mensaje }, { status })
}

export async function exigirUsuario(): Promise<Guardia> {
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
