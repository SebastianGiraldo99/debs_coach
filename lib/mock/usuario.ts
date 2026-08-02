import type { Moneda } from "@/lib/formato"

export type Usuario = {
  id: string
  nombre: string
  email: string
  estado: "activo" | "inactivo" | "invitado"
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
  monedaBase: "COP",
  creadoEn: "2025-05-18",
  ultimoAcceso: "2025-07-26",
}
