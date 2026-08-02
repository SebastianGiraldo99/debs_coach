import { NextResponse, type NextRequest } from "next/server"

import { COOKIE_SESION, verificarToken } from "@/lib/auth/session"

/**
 * Proxy — en Next.js 16 es el nuevo nombre de Middleware (misma función).
 * Ver node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
 *
 * IMPORTANTE: aquí solo se hacen comprobaciones optimistas leyendo el JWT de
 * la cookie. Nada de consultas a la base: el proxy corre en cada request,
 * incluidas las de prefetch, y la documentación lo desaconseja explícitamente
 * como capa de autorización.
 *
 * Las comprobaciones reales —que el usuario siga existiendo, que su estado
 * sea `activo`, que ya haya completado el onboarding— viven en el DAL
 * (lib/auth/dal.ts) y corren pegadas a la base. Este archivo solo filtra el
 * tráfico obvio y evita que un visitante sin sesión toque las rutas privadas.
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sesion = await verificarToken(
    request.cookies.get(COOKIE_SESION)?.value,
  )

  const esPrivada = RUTAS_PRIVADAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  )
  const esDeAutenticacion = RUTAS_AUTENTICACION.includes(pathname)

  // Sin sesión en zona privada: al login.
  if (esPrivada && !sesion) {
    return NextResponse.redirect(new URL("/login", request.nextUrl))
  }

  if (sesion) {
    // Con sesión, el login y el registro sobran.
    if (esDeAutenticacion) {
      return NextResponse.redirect(
        new URL(destinoSegunRol(sesion.rol), request.nextUrl),
      )
    }

    // La landing solo tiene sentido para visitantes.
    if (pathname === "/") {
      return NextResponse.redirect(
        new URL(destinoSegunRol(sesion.rol), request.nextUrl),
      )
    }

    // El panel de administración es exclusivo del admin. Es una barrera
    // optimista: el DAL la vuelve a verificar contra la base.
    if (pathname.startsWith("/admin") && sesion.rol !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.nextUrl))
    }

    // Un admin no tiene datos financieros propios (RF: no ve ni tiene
    // finanzas), así que el área de usuario no le aplica.
    if (sesion.rol === "admin" && esPrivada && !pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin", request.nextUrl))
    }
  }

  return NextResponse.next()
}

export const config = {
  // Excluye API, estáticos y archivos con extensión. El favicon y las imágenes
  // no necesitan pasar por aquí, y las rutas de API se protegen ellas mismas.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
}
