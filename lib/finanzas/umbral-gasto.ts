/**
 * Qué cuenta como "gasto grande" (RF-048).
 *
 * Esto no es una validación técnica: es la regla que impide que la app se
 * convierta en un control de gastos. El producto se dispara en tres momentos y
 * aconseja sobre el mes completo; una pantalla que invite a anotar el café de
 * la mañana lo convierte en otra cosa y la persona la abandona en dos semanas.
 *
 * **Vive en un solo sitio a propósito.** La leen la validación del servidor y
 * el texto de ayuda del diálogo. Duplicada, produce un formulario que promete
 * lo que la API rechaza —exactamente el error que ya costó una ronda con el
 * candado de 30 días de los objetivos—.
 *
 * El umbral es **relativo al ingreso** y no una cifra fija: "grande" no
 * significa lo mismo con $2.000.000 al mes que con $20.000.000, y una cifra
 * absoluta además tendría que elegir moneda, cosa que el MVP no hace.
 */

/**
 * Porcentaje del ingreso mensual por debajo del cual un gasto no es "grande".
 *
 * El 5% es un punto de partida razonable, no un número validado con usuarios:
 * con un ingreso de $4.800.000 deja fuera lo que baje de $240.000. Se espera
 * ajustarlo, y por eso es una constante y no está incrustado en la validación.
 */
export const PORCENTAJE_GASTO_CONSIDERABLE = 0.05

/**
 * Cuánto tiene que costar un gasto para poder anotarse. `null` cuando no hay
 * ingresos registrados: sin denominador no hay porcentaje que calcular, y
 * bloquear al que todavía no ha anotado lo que gana sería castigarlo por un
 * dato que le falta.
 */
export function umbralGastoConsiderable(ingresosMensuales: number): number | null {
  if (ingresosMensuales <= 0) return null
  return ingresosMensuales * PORCENTAJE_GASTO_CONSIDERABLE
}

/** Si un monto llega al umbral. Sin umbral, cualquier monto positivo pasa. */
export function esGastoConsiderable(monto: number, ingresosMensuales: number): boolean {
  const umbral = umbralGastoConsiderable(ingresosMensuales)
  return umbral === null || monto >= umbral
}
