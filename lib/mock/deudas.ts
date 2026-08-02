export type TipoDeuda = "tarjeta_credito" | "credito_vehiculo" | "credito_libre" | "credito_hipotecario" | "familiar" | "otro"

export type Deuda = {
  id: string
  nombre: string
  tipo: TipoDeuda
  saldo: number
  // Tasa efectiva anual en porcentaje. null si es informal (familiar).
  tasaEA: number | null
  pagoMinimo: number
}

export const etiquetasTipoDeuda: Record<TipoDeuda, string> = {
  tarjeta_credito: "Tarjeta de crédito",
  credito_vehiculo: "Crédito de vehículo",
  credito_libre: "Crédito de libre inversión",
  credito_hipotecario: "Crédito hipotecario",
  familiar: "Deuda con un familiar",
  otro: "Otra deuda",
}

export const deudas: Deuda[] = [
  {
    id: "deu_01",
    nombre: "Tarjeta Visa",
    tipo: "tarjeta_credito",
    saldo: 8200000,
    tasaEA: 32,
    pagoMinimo: 520000,
  },
  {
    id: "deu_02",
    nombre: "Crédito del carro",
    tipo: "credito_vehiculo",
    saldo: 4900000,
    tasaEA: 19,
    pagoMinimo: 610000,
  },
  {
    id: "deu_03",
    nombre: "Préstamo de mi hermano",
    tipo: "familiar",
    saldo: 1500000,
    tasaEA: null,
    pagoMinimo: 200000,
  },
]

export const deudaTotal = deudas.reduce((suma, d) => suma + d.saldo, 0)
