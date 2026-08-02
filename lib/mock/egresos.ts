export type CategoriaEgreso =
  | "arriendo"
  | "servicios"
  | "mercado"
  | "transporte"
  | "colegiaturas"
  | "salud"
  | "otro"

export type Egreso = {
  id: string
  descripcion: string
  categoria: CategoriaEgreso
  monto: number
}

export const etiquetasCategoriaEgreso: Record<CategoriaEgreso, string> = {
  arriendo: "Arriendo",
  servicios: "Recibos y servicios",
  mercado: "Mercado",
  transporte: "Transporte",
  colegiaturas: "Colegios y universidad",
  salud: "Salud",
  otro: "Otro gasto fijo",
}

export const egresos: Egreso[] = [
  {
    id: "egr_01",
    descripcion: "Arriendo del apartamento",
    categoria: "arriendo",
    monto: 1450000,
  },
  {
    id: "egr_02",
    descripcion: "Luz, agua, gas e internet",
    categoria: "servicios",
    monto: 420000,
  },
  {
    id: "egr_03",
    descripcion: "Mercado del mes",
    categoria: "mercado",
    monto: 750000,
  },
  {
    id: "egr_04",
    descripcion: "Transporte y gasolina",
    categoria: "transporte",
    monto: 320000,
  },
  {
    id: "egr_05",
    descripcion: "Colegio de mi hija",
    categoria: "colegiaturas",
    monto: 160000,
  },
]

export const egresoTotal = egresos.reduce((suma, e) => suma + e.monto, 0)
