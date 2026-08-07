import { NextResponse, type NextRequest } from "next/server"

import { COOKIE_REFRESH, rotarRefresh } from "@/lib/auth/refresco"
import {
  COOKIE_SESION,
  MAX_AGE_ACCESO,
  firmarAcceso,
  opcionesCookie,
  verificarToken,
  type SessionPayload,
} from "@/lib/auth/session"
import { MAX_AGE_REFRESH } from "@/lib/auth/refresco"

/**
 * Proxy — en Next.js 16 es el nuevo nombre de Middleware (misma función).
 * Ver node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
 *
 * IMPORTANTE: las comprobaciones de acceso que se hacen aquí son optimistas y
 * salen del JWT de la cookie. Las de verdad —que el usuario siga existiendo,
 * que su estado sea `activo`, que ya haya completado el onboarding— viven en
 * el DAL (lib/auth/dal.ts), pegadas a la base. Este archivo solo filtra el
 * tráfico obvio y evita que un visitante sin sesión toque las rutas privadas.
 *
 * La única consulta a la base que se permite aquí es la del refresco (RNF-002),
 * y solo se dispara cuando el acceso ya venció y hay cookie de refresh: una vez
 * cada 24 h por sesión, no en cada request. Es el único sitio donde puede
 * pasar, porque las cookies solo se escriben en un proxy o en un route handler
 * —nunca durante el render de un Server Component—.
 *
 * En Next 16 el proxy corre en runtime de Node por defecto, así que Prisma
 * funciona aquí; en la versión anterior, con Edge, esto no habría sido posible.
 */

/** Rutas públicas del flujo de acceso. Con sesión activa no tienen sentido. */
const RUTAS_AUTENTICACION = ["/login", "/register"]

/** Prefijos que exigen sesión. El resto es público. */
const RUTAS_PRIVADAS = [
  "/dashboard",
  "/onboarding",
  "/deudas",
  "/ingresos",
  "/objetivos",
  "/checkin",
  "/admin",
]

function destinoSegunRol(rol: SessionRol): string {
  return rol === "admin" ? "/admin" : "/dashboard"
}

type SessionRol = "usuario" | "admin"

/**
 * Lo que hay que dejar en las cookies de la respuesta. `null` = no se tocan.
 * Se aplica al final a la respuesta que toque, sea `next()` o un redirect: un
 * refresco que se pierde en el camino deja al usuario en el login con una
 * sesión que sí era válida.
 */
type Renovacion = { acceso: string; refresh: string } | "limpiar" | null

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let sesion = await verificarToken(request.cookies.get(COOKIE_SESION)?.value)
  let renovacion: Renovacion = null

  const refreshCrudo = request.cookies.get(COOKIE_REFRESH)?.value
  if (!sesion && refreshCrudo) {
    const refrescada = await rotarRefresh(refreshCrudo)
    if (refrescada) {
      const payload: SessionPayload = {
        userId: refrescada.usuarioId,
        rol: refrescada.rol,
      }
      const acceso = await firmarAcceso(payload)
      renovacion = { acceso, refresh: refrescada.token }
      sesion = payload
      // El render de esta misma petición tiene que ver la cookie nueva; si no,
      // el DAL leería la vieja y mandaría al login a alguien que acaba de
      // renovar. `NextResponse.next({ request })` la lleva hacia adelante.
      request.cookies.set(COOKIE_SESION, acceso)
    } else {
      // Refresh vencido, revocado o reutilizado. Se borra la cookie para no
      // repetir la consulta en cada request de aquí en adelante.
      renovacion = "limpiar"
    }
  }

  const responder = (respuesta: NextResponse): NextResponse => {
    if (renovacion === "limpiar") {
      respuesta.cookies.delete(COOKIE_REFRESH)
    } else if (renovacion) {
      respuesta.cookies.set(COOKIE_SESION, renovacion.acceso, opcionesCookie(MAX_AGE_ACCESO))
      respuesta.cookies.set(COOKIE_REFRESH, renovacion.refresh, opcionesCookie(MAX_AGE_REFRESH))
    }
    return respuesta
  }

  const esPrivada = RUTAS_PRIVADAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  )
  const esDeAutenticacion = RUTAS_AUTENTICACION.includes(pathname)

  // Sin sesión en zona privada: al login.
  if (esPrivada && !sesion) {
    return responder(NextResponse.redirect(new URL("/login", request.nextUrl)))
  }

  if (sesion) {
    // Con sesión, el login y el registro sobran.
    if (esDeAutenticacion) {
      return responder(NextResponse.redirect(
        new URL(destinoSegunRol(sesion.rol), request.nextUrl),
      ))
    }

    // La landing solo tiene sentido para visitantes.
    if (pathname === "/") {
      return responder(NextResponse.redirect(
        new URL(destinoSegunRol(sesion.rol), request.nextUrl),
      ))
    }

    // El panel de administración es exclusivo del admin. Es una barrera
    // optimista: el DAL la vuelve a verificar contra la base.
    if (pathname.startsWith("/admin") && sesion.rol !== "admin") {
      return responder(NextResponse.redirect(new URL("/dashboard", request.nextUrl)))
    }

    // Un admin no tiene datos financieros propios (RF: no ve ni tiene
    // finanzas), así que el área de usuario no le aplica.
    if (sesion.rol === "admin" && esPrivada && !pathname.startsWith("/admin")) {
      return responder(NextResponse.redirect(new URL("/admin", request.nextUrl)))
    }
  }

  return responder(NextResponse.next({ request }))
}

export const config = {
  // Excluye API, estáticos y archivos con extensión. El favicon y las imágenes
  // no necesitan pasar por aquí, y las rutas de API se protegen ellas mismas.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
}
