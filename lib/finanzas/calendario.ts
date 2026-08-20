/**
 * El tiempo, en la zona de la persona que usa la app.
 *
 * Todo el producto vive en `America/Bogota` —el cron diario ya lo hace— y
 * mezclar zonas aquí sale caro: las columnas `@db.Date` se guardan como
 * medianoche UTC, así que preguntarle la fecha a `new Date()` en el servidor
 * corre el día uno hacia atrás a partir de las 7 p.m. en Colombia.
 *
 * Las fechas se manejan como cadenas `YYYY-MM-DD` a propósito: se comparan
 * lexicográficamente sin construir un Date, que es donde entran las zonas.
 */

export const ZONA = "America/Bogota"

/** Hoy en Bogotá, como `YYYY-MM-DD`. */
export function hoyEnBogota(ahora: Date = new Date()): string {
  // `en-CA` da exactamente el formato ISO, que es lo que hace innecesario
  // recomponer la cadena a mano a partir de las partes.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora)
}
