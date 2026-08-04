// Formato de datos. Único punto donde vive el conocimiento de moneda y locale
// (§14 de las directrices).
//
// MULTI-MONEDA: cada monto se formatea en su MONEDA DE DENOMINACIÓN — la moneda
// en la que el instrumento realmente existe, no una preferencia de vista. Todas
// las funciones reciben la moneda explícitamente y el default es COP.
//
// En el MVP no hay tasas de cambio, así que todos los montos de un usuario
// comparten su `monedaBase` y nunca hay que sumar monedas distintas. Cuando
// llegue la conversión, el único punto que la necesita es este archivo: se
// convierte al formatear, jamás al leer o escribir en la base de datos.

export type Moneda = "COP" | "USD"

type ConfigMoneda = {
  locale: string
  simbolo: string
  decimales: number
  /** Separador decimal del locale, para las abreviaturas de los ejes. */
  separadorDecimal: string
}

const CONFIG: Record<Moneda, ConfigMoneda> = {
  // El peso no usa decimales en la práctica cotidiana; mostrarlos es ruido.
  COP: { locale: "es-CO", simbolo: "$", decimales: 0, separadorDecimal: "," },
  // "US$" y no "$" para que ambas monedas sean distinguibles de un vistazo.
  USD: { locale: "en-US", simbolo: "US$", decimales: 2, separadorDecimal: "." },
}

/**
 * formatearMoneda(1700000) → "$ 1.700.000"
 * formatearMoneda(1800.5, "USD") → "US$ 1,800.50"
 */
export function formatearMoneda(valor: number, moneda: Moneda = "COP"): string {
  const { locale, simbolo, decimales } = CONFIG[moneda]
  const formateado = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Math.abs(valor))
  const signo = valor < 0 ? "-" : ""
  return `${signo}${simbolo} ${formateado}`
}

/**
 * Versión abreviada para ejes de gráficas: 14600000 → "$14,6M"
 */
export function formatearMonedaCorta(valor: number, moneda: Moneda = "COP"): string {
  const { simbolo, separadorDecimal } = CONFIG[moneda]
  const abreviar = (n: number, sufijo: string) => {
    const texto = n.toFixed(1).replace(".", separadorDecimal).replace(`${separadorDecimal}0`, "")
    return `${simbolo}${texto}${sufijo}`
  }
  if (Math.abs(valor) >= 1_000_000) return abreviar(valor / 1_000_000, "M")
  if (Math.abs(valor) >= 1000) return abreviar(valor / 1000, "k")
  return `${simbolo}${Math.round(valor)}`
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

/**
 * formatearFecha(d) → "15 de agosto"; con año solo si es otro año.
 * modo "corto" → "12 jul" (para listas compactas).
 */
export function formatearFecha(fecha: Date | string, modo: "largo" | "corto" = "largo"): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha
  const dia = d.getDate()
  const mes = d.getMonth()
  const anio = d.getFullYear()
  const anioActual = new Date().getFullYear()

  if (modo === "corto") {
    return `${dia} ${MESES_CORTO[mes]}`
  }

  const base = `${dia} de ${MESES[mes]}`
  return anio !== anioActual ? `${base} de ${anio}` : base
}

/**
 * Como `formatearFecha`, pero para fechas SIN hora: las columnas `@db.Date` y
 * los strings "2026-08-03".
 *
 * Prisma devuelve una columna DATE como medianoche UTC, y `new Date("2026-08-03")`
 * también se interpreta en UTC. Leerlas con `getDate()` —que es hora local— las
 * corre un día hacia atrás en Colombia (UTC-5): un ingreso registrado el 3 se
 * mostraría como el 2. Aquí se leen en UTC, que es donde de verdad están.
 */
export function formatearFechaUtc(fecha: Date | string, modo: "largo" | "corto" = "largo"): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha
  const dia = d.getUTCDate()
  const mes = d.getUTCMonth()
  const anio = d.getUTCFullYear()

  if (modo === "corto") return `${dia} ${MESES_CORTO[mes]}`

  const base = `${dia} de ${MESES[mes]}`
  return anio !== new Date().getFullYear() ? `${base} de ${anio}` : base
}

/**
 * Etiqueta de mes para el eje de una gráfica: "Ago". Va capitalizada porque
 * es un rótulo suelto, no parte de una frase.
 */
export function formatearMesCorto(fecha: Date): string {
  const mes = MESES_CORTO[fecha.getMonth()]
  return mes.charAt(0).toUpperCase() + mes.slice(1)
}

/**
 * formatearMesAnio(d) → "septiembre de 2027". Para fechas lejanas, donde el
 * día no aporta: nadie salda una deuda un martes concreto.
 */
export function formatearMesAnio(fecha: Date): string {
  return `${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`
}

/**
 * formatearMeses(11) → "11 meses"; formatearMeses(1) → "1 mes";
 * ≥24 → "2 años y 3 meses".
 */
export function formatearMeses(meses: number): string {
  if (meses < 0) meses = 0
  if (meses < 24) {
    return meses === 1 ? "1 mes" : `${meses} meses`
  }
  const anios = Math.floor(meses / 12)
  const resto = meses % 12
  const parteAnios = anios === 1 ? "1 año" : `${anios} años`
  if (resto === 0) return parteAnios
  const parteMeses = resto === 1 ? "1 mes" : `${resto} meses`
  return `${parteAnios} y ${parteMeses}`
}

/**
 * formatearPorcentaje(34) → "34%" (sin decimales).
 */
export function formatearPorcentaje(valor: number): string {
  return `${Math.round(valor)}%`
}

/**
 * Deja el texto que el usuario está escribiendo en su forma mínima válida,
 * conservando lo que aún no es un número completo (un "1800." a medio teclear).
 * Se usa en cada pulsación; `limpiarMoneda` es la que produce el valor.
 */
export function sanearEntradaMoneda(texto: string, moneda: Moneda = "COP"): string {
  if (CONFIG[moneda].decimales === 0) return texto.replace(/[^\d]/g, "")
  // Monedas con decimales: dígitos más un único punto decimal.
  const [entera, ...resto] = texto.replace(/[^\d.]/g, "").split(".")
  if (resto.length === 0) return entera
  const decimal = resto.join("").slice(0, CONFIG[moneda].decimales)
  return `${entera}.${decimal}`
}

/**
 * Limpia un string de moneda y devuelve el número. Acepta lo que el usuario
 * pegue: "$1.200.000", "1200000", "US$ 1,800.50". "" → null.
 */
export function limpiarMoneda(texto: string, moneda: Moneda = "COP"): number | null {
  const saneado = sanearEntradaMoneda(texto, moneda)
  if (saneado === "" || saneado === ".") return null
  const valor = CONFIG[moneda].decimales === 0 ? Number.parseInt(saneado, 10) : Number.parseFloat(saneado)
  return Number.isNaN(valor) ? null : valor
}

/**
 * Aplica separadores de miles a un número para mostrar en un input al blur.
 * Sin símbolo de moneda: el campo ya lo pinta como prefijo fijo.
 */
export function agruparMiles(valor: number, moneda: Moneda = "COP"): string {
  const { locale, decimales } = CONFIG[moneda]
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor)
}

/**
 * Símbolo para el prefijo del campo de dinero: "$" (COP) o "US$" (USD).
 */
export function simboloMoneda(moneda: Moneda = "COP"): string {
  return CONFIG[moneda].simbolo
}
