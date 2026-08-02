export type Checkin = {
  id: string
  fecha: string
  pago: number
  avance: number // porcentaje 0-100
  deudaEnEseMomento: number
}

// Del más reciente al más antiguo. El dashboard muestra los últimos 4.
export const checkins: Checkin[] = [
  { id: "chk_04", fecha: "2025-07-12", pago: 780000, avance: 34, deudaEnEseMomento: 14600000 },
  { id: "chk_03", fecha: "2025-06-14", pago: 820000, avance: 27, deudaEnEseMomento: 15800000 },
  { id: "chk_02", fecha: "2025-05-16", pago: 650000, avance: 18, deudaEnEseMomento: 16900000 },
  { id: "chk_01", fecha: "2025-04-15", pago: 700000, avance: 9, deudaEnEseMomento: 17800000 },
]

// Proyección de deuda vs. tiempo (para la gráfica de línea plegada).
export type PuntoProyeccion = { mes: string; deuda: number }

export const proyeccionDeuda: PuntoProyeccion[] = [
  { mes: "Jul", deuda: 14600000 },
  { mes: "Ago", deuda: 13400000 },
  { mes: "Sep", deuda: 12100000 },
  { mes: "Oct", deuda: 10700000 },
  { mes: "Nov", deuda: 9200000 },
  { mes: "Dic", deuda: 7600000 },
  { mes: "Ene", deuda: 5900000 },
  { mes: "Feb", deuda: 4100000 },
  { mes: "Mar", deuda: 2200000 },
  { mes: "Abr", deuda: 0 },
]

export const fraseProyeccionDeuda =
  "Si mantienes el ritmo, tu deuda llega a cero en septiembre del próximo año."

export const fraseProgreso =
  "Cada check-in has pagado un poco más y tu avance sube de forma constante."
