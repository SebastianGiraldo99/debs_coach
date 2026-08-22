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

/**
 * El mes en curso, listo para un `where` de Prisma sobre una columna
 * `@db.Date`: `{ gte: desde, lt: hasta }`.
 *
 * Las columnas DATE se guardan como medianoche **UTC** del día que
 * representan, así que los límites se construyen igual —con la `Z`— y la
 * comparación es exacta. El corte de mes es el de Bogotá: el día 1 a las 00:00
 * allí, no en UTC.
 *
 * `hasta` es el primer día del mes siguiente y se compara con `lt`, no con
 * `lte` sobre el último día: así no hay que saber si el mes tiene 28, 30 o 31.
 */
export function limitesDelMes(ahora: Date = new Date()): { desde: Date; hasta: Date } {
  const [anio, mes] = hoyEnBogota(ahora).split("-").map(Number)
  const desde = new Date(Date.UTC(anio, mes - 1, 1))
  // El mes 12 hace rodar el año solo: Date.UTC(2026, 12, 1) es enero de 2027.
  const hasta = new Date(Date.UTC(anio, mes, 1))
  return { desde, hasta }
}

/**
 * La fecha de hace `dias` días, como `Date` a medianoche UTC. Para acotar qué
 * es "reciente" al consultar columnas `@db.Date`.
 */
export function haceDias(dias: number, ahora: Date = new Date()): Date {
  const [anio, mes, dia] = hoyEnBogota(ahora).split("-").map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia - dias))
}
