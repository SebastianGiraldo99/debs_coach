/**
 * Las dos reglas que gobiernan las intenciones: cuántas caben (RF-022) y
 * cuánto duran congeladas (RF-024).
 *
 * Viven aquí y no en el route handler porque la pantalla también las necesita:
 * el botón de "Nueva intención" se apaga con el mismo tope con el que el
 * endpoint responde 409, y los días que se muestran (RF-025) son los mismos
 * que decide el PATCH. Duplicar el 30 en dos sitios haría que un cambio dejara
 * la pantalla prometiendo algo que la API rechaza.
 */

export const MAX_OBJETIVOS_ACTIVOS = 3
export const DIAS_COMPROMISO = 30

const MS_POR_DIA = 86_400_000

/** Cuándo vuelve a ser editable una intención que se crea o se edita ahora. */
export function calcularEditableDesde(ahora: Date = new Date()): Date {
  const fecha = new Date(ahora)
  fecha.setDate(fecha.getDate() + DIAS_COMPROMISO)
  return fecha
}

/**
 * Días que faltan para poder editarla (RF-025). Cero significa "ya".
 *
 * Se redondea hacia arriba: a falta de hora y media el mensaje correcto es
 * "mañana", no "hoy". Prometer una edición que la API todavía rechaza es peor
 * que pedir un día de más.
 */
export function diasParaEditar(editableDesde: Date, ahora: Date = new Date()): number {
  const restante = editableDesde.getTime() - ahora.getTime()
  if (restante <= 0) return 0
  return Math.ceil(restante / MS_POR_DIA)
}
