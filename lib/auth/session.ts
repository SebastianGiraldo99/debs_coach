import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import { cookies } from "next/headers"

import { COOKIE_REFRESH, MAX_AGE_REFRESH, emitirRefresh } from "@/lib/auth/refresco"

export const COOKIE_SESION = "coach_session"

/** 24 h (RNF-002). Pasadas, el refresh de 7 días emite uno nuevo sin login. */
export const MAX_AGE_ACCESO = 60 * 60 * 24

/**
 * La clave se resuelve al usarla, no al importar el módulo.
 *
 * Antes era `new TextEncoder().encode(process.env.JWT_SECRET!)` a nivel de
 * módulo: con la variable ausente, TextEncoder codifica la cadena literal
 * "undefined" y la app firma todas las sesiones con un secreto público y
 * adivinable, sin avisar. Mejor reventar de inmediato.
 */
function secreto(): Uint8Array {
  const valor = process.env.JWT_SECRET
  if (!valor) {
    throw new Error(
      "JWT_SECRET no está definida. Genera una con `openssl rand -base64 32` y ponla en .env",
    )
  }
  return new TextEncoder().encode(valor)
}

export interface SessionPayload extends JWTPayload {
  userId: string
  rol: "usuario" | "admin"
}

/**
 * Atributos comunes de las dos cookies. `httpOnly` las esconde de JavaScript
 * —un XSS no se lleva la sesión— y `sameSite: lax` es lo que evita que un
 * formulario de otra web haga peticiones autenticadas.
 */
export function opcionesCookie(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  }
}

/** Firma un acceso sin tocar cookies. Lo usa el proxy, que las escribe él. */
export async function firmarAcceso(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secreto())
}

/**
 * Verifica un token suelto, sin tocar cookies. Lo usa el proxy, que lee la
 * cookie del request en vez del store de `next/headers`.
 */
export async function verificarToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secreto())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

/**
 * Inicio de sesión: acceso de 24 h y refresh de 7 días, cada uno en su cookie.
 *
 * Son dos y no una porque tienen vidas y naturalezas distintas: el acceso se
 * verifica sin base y caduca pronto; el refresh existe en `sesiones` y es lo
 * que permite revocar de verdad.
 */
export async function crearSession(payload: SessionPayload) {
  const [token, refresh] = await Promise.all([
    firmarAcceso(payload),
    emitirRefresh(payload.userId),
  ])

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_SESION, token, opcionesCookie(MAX_AGE_ACCESO))
  cookieStore.set(COOKIE_REFRESH, refresh, opcionesCookie(MAX_AGE_REFRESH))
}

export async function obtenerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  return verificarToken(cookieStore.get(COOKIE_SESION)?.value)
}

/**
 * Borra las dos cookies. La revocación en base la hace quien llama —necesita
 * el token para saber qué familia matar— antes de pasar por aquí.
 */
export async function eliminarSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_SESION)
  cookieStore.delete(COOKIE_REFRESH)
}
