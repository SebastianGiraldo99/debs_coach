import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import { cookies } from "next/headers"

export const COOKIE_SESION = "coach_session"

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

export async function crearSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secreto())

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  })
}

export async function obtenerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  return verificarToken(cookieStore.get(COOKIE_SESION)?.value)
}

export async function eliminarSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_SESION)
}
