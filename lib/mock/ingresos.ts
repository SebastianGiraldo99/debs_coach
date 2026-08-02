export type CategoriaIngreso = "salario" | "independiente" | "arriendo" | "pension" | "otro"

export type IngresoFijo = {
  id: string
  descripcion: string
  categoria: CategoriaIngreso
  monto: number
}

export type IngresoExtra = {
  id: string
  descripcion: string
  monto: number
  fecha: string
}

export const etiquetasCategoriaIngreso: Record<CategoriaIngreso, string> = {
  salario: "Salario",
  independiente: "Trabajo independiente",
  arriendo: "Arriendo que recibo",
  pension: "Pensión",
  otro: "Otro ingreso",
}

export const ingresosFijos: IngresoFijo[] = [
  {
    id: "ing_01",
    descripcion: "Salario en la agencia",
    categoria: "salario",
    monto: 4200000,
  },
  {
    id: "ing_02",
    descripcion: "Clases de diseño los sábados",
    categoria: "independiente",
    monto: 600000,
  },
]

export const ingresosExtra: IngresoExtra[] = [
  {
    id: "ext_01",
    descripcion: "Freelance de logotipo",
    monto: 750000,
    fecha: "2025-07-12",
  },
  {
    id: "ext_02",
    descripcion: "Venta de la bicicleta vieja",
    monto: 480000,
    fecha: "2025-06-28",
  },
  {
    id: "ext_03",
    descripcion: "Prima de mitad de año",
    monto: 2100000,
    fecha: "2025-06-15",
  },
]

export const ingresoMensual = ingresosFijos.reduce((suma, i) => suma + i.monto, 0)
