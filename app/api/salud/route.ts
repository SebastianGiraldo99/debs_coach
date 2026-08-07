import { NextResponse } from "next/server"

/**
 * GET /api/salud — sonda del contenedor. No es una API de la aplicación.
 *
 * Responde que el proceso de Node está vivo y sirviendo, nada más. **No
 * consulta la base a propósito**: si Postgres parpadea, Docker reiniciaría una
 * app que funciona perfectamente y el corte duraría más que la incidencia.
 * Diagnosticar la base es trabajo de la base.
 *
 * No devuelve versión, ni entorno, ni nada que no sepa ya quien pregunta: es
 * el único endpoint sin sesión de toda la app.
 */
export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json({ ok: true })
}
