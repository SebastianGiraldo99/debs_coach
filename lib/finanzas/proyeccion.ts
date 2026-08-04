import { formatearMesAnio, formatearMesCorto } from "@/lib/formato"

/**
 * Proyección de la deuda mes a mes: la cifra "Faltan N meses" del dashboard y
 * la gráfica de deuda vs. tiempo (RF-014, RF-016).
 *
 * Las dos salen de aquí a propósito. Cuando la cifra y la curva se calculaban
 * por separado terminaban contradiciéndose —una decía 11 meses y la otra
 * llegaba a cero en el 14—, y de las dos versiones el usuario no tiene forma
 * de saber cuál creer.
 *
 * NO es el `mesesLibertad` del plan. Ese viene del modelo, quedó congelado
 * junto al consejo y envejece con él; esto se recalcula con los saldos de hoy.
 * Ver `lib/ia/schema.ts`.
 *
 * El método es el mismo que usa `planLocal`: avalancha —primero la deuda con
 * la tasa más alta— porque es el que minimiza el interés pagado y el que la
 * app ya recomienda por escrito.
 */

export type DeudaProyectable = {
  montoActual: number
  /** Tasa efectiva anual en porcentaje. `null` en las deudas informales. */
  tasaInteres: number | null
  pagoMinimo: number | null
}

export type PuntoProyeccion = { mes: string; deuda: number }

export type Proyeccion = {
  /** Vacío cuando no hay deuda o cuando la simulación no avanza. */
  puntos: PuntoProyeccion[]
  /** Meses hasta saldar todo. `null` si al ritmo actual no llega a cero. */
  meses: number | null
  /** Una línea en prosa bajo la gráfica. Siempre presente. */
  frase: string
}

/** Tope de la simulación. 50 años es el punto donde la respuesta ya es "no". */
const MAX_MESES = 600

/** Puntos que se dibujan. Más de una docena en 300px es ruido, no información. */
const MAX_PUNTOS = 12

/** Un peso de saldo residual es cero: viene de redondear intereses. */
const EPSILON = 1

function tasaMensual(deuda: DeudaProyectable): number {
  if (deuda.tasaInteres === null || deuda.tasaInteres <= 0) return 0
  return Math.pow(1 + deuda.tasaInteres / 100, 1 / 12) - 1
}

function sumar(saldos: number[]): number {
  return saldos.reduce((total, saldo) => total + saldo, 0)
}

/**
 * Simula los saldos mes a mes y devuelve el total al cierre de cada uno.
 *
 * El orden de pago dentro del mes importa: primero los mínimos de todas las
 * deudas —son obligaciones, no una elección— y solo lo que sobre va a la más
 * cara. Prometer el abono grande antes de cubrir los mínimos daría un plazo
 * más corto del real.
 */
function simular(deudas: DeudaProyectable[], disponible: number): number[] {
  const saldos = deudas.map((d) => d.montoActual)
  const tasas = deudas.map(tasaMensual)

  // Índices ordenados por costo, calculado una vez: el orden de avalancha no
  // cambia durante la simulación porque las tasas no cambian.
  const porCosto = deudas
    .map((_, indice) => indice)
    .sort((a, b) => {
      if (tasas[a] !== tasas[b]) return tasas[b] - tasas[a]
      return saldos[b] - saldos[a]
    })

  const totales: number[] = []

  for (let mes = 0; mes < MAX_MESES; mes++) {
    for (let i = 0; i < saldos.length; i++) {
      if (saldos[i] > 0) saldos[i] += saldos[i] * tasas[i]
    }

    let restante = disponible
    for (let i = 0; i < saldos.length && restante > 0; i++) {
      const pago = Math.min(deudas[i].pagoMinimo ?? 0, saldos[i], restante)
      saldos[i] -= pago
      restante -= pago
    }
    for (const i of porCosto) {
      if (restante <= 0) break
      const pago = Math.min(saldos[i], restante)
      saldos[i] -= pago
      restante -= pago
    }

    const total = sumar(saldos)
    totales.push(Math.max(0, Math.round(total)))
    if (total <= EPSILON) break
  }

  return totales
}

/**
 * Posiciones de la serie que se dibujan, a lo sumo `MAX_PUNTOS`, conservando
 * siempre la primera y la última: son el saldo de hoy y el final de la
 * historia, que es lo que se lee.
 *
 * Devuelve posiciones y no valores porque la etiqueta de cada punto es el mes
 * al que corresponde, y eso solo lo dice el índice.
 */
function posicionesVisibles(largo: number): number[] {
  if (largo <= MAX_PUNTOS) return Array.from({ length: largo }, (_, i) => i)
  const paso = (largo - 1) / (MAX_PUNTOS - 1)
  const posiciones = new Set<number>()
  for (let i = 0; i < MAX_PUNTOS; i++) posiciones.add(Math.round(i * paso))
  return [...posiciones].sort((a, b) => a - b)
}

export function proyectarDeuda(
  deudas: DeudaProyectable[],
  capacidadReal: number,
  hoy: Date = new Date(),
): Proyeccion {
  const deudaHoy = deudas.reduce((total, d) => total + d.montoActual, 0)

  if (deudaHoy <= EPSILON) {
    return {
      puntos: [],
      meses: 0,
      frase: "No tienes deudas activas: todo lo que te queda al mes es tuyo.",
    }
  }

  // Sin margen no hay nada que simular: el resultado sería una curva plana o
  // creciente durante 50 años, que no es una proyección sino una mala noticia
  // dicha con una gráfica. Se dice con palabras.
  if (capacidadReal <= 0) {
    return {
      puntos: [],
      meses: null,
      frase:
        "Hoy tus gastos fijos se llevan todo lo que entra, así que no podemos proyectar una fecha. El primer paso está en el gasto.",
    }
  }

  const totales = simular(deudas, capacidadReal)
  const saldada = totales.length > 0 && totales[totales.length - 1] <= EPSILON

  // El mes 0 es el saldo de hoy, antes de pagar nada: sin él la gráfica
  // arrancaría ya con un abono hecho y la caída se vería más suave.
  const serie = [Math.round(deudaHoy), ...totales]
  const puntos = posicionesVisibles(serie.length).map((posicion) => ({
    mes: formatearMesCorto(new Date(hoy.getFullYear(), hoy.getMonth() + posicion, 1)),
    deuda: serie[posicion],
  }))

  if (!saldada) {
    return {
      puntos,
      meses: null,
      frase:
        "Al ritmo actual la deuda baja muy despacio: los intereses se comen casi todo el abono. Subir el margen mensual, aunque sea poco, cambia mucho esta curva.",
    }
  }

  const meses = totales.length
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + meses, 1)
  return {
    puntos,
    meses,
    frase: `Si mantienes el ritmo, tu deuda llega a cero en ${formatearMesAnio(fin)}.`,
  }
}
