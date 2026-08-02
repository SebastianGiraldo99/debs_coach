import type { Moneda } from "@/lib/formato"

export type Usuario = {
  id: string
  nombre: string
  email: string
  /** Control de acceso; lo decide el admin. Refleja EstadoUsuario del schema. */
  estado: "pendiente" | "activo" | "bloqueado"
  /**
   * Fecha en que terminó el onboarding, `null` si aún no. Es PROGRESO del
   * usuario, no acceso: por eso está separado de `estado`.
   */
  onboardingCompletadoEn: string | null
  /**
   * Moneda en la que el usuario maneja su dinero. En el MVP todos sus montos
   * están denominados en ella: sin tasas de cambio no se pueden mezclar.
   * Cambia esto a "USD" para ver la app completa en dólares.
   */
  monedaBase: Moneda
  creadoEn: string
  ultimoAcceso: string
}

export const usuario: Usuario = {
  id: "usr_01",
  nombre: "Camila Restrepo",
  email: "camila.restrepo@gmail.com",
  estado: "activo",
  onboardingCompletadoEn: "2025-05-18",
  monedaBase: "COP",
  creadoEn: "2025-05-18",
  ultimoAcceso: "2025-07-26",
}
