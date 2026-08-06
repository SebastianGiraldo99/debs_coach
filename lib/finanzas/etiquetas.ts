import type {
  CategoriaEgreso,
  CategoriaIngreso,
  TipoDeuda,
} from "@prisma/client"

/**
 * Textos visibles de los enums del schema.
 *
 * Vivió siempre aquí y no con los mocks de la maqueta porque los formularios
 * de producción los necesitan: hacer que dependan de datos falsos ataba código
 * real a código desechable. Los mocks ya se borraron —la última pantalla que
 * leía de ellos, `objetivos`, quedó conectada en el Sprint 6—; estas etiquetas
 * siguen en pie porque nunca fueron una de ellos.
 *
 * Los tipos vienen de `@prisma/client`, así que si mañana se agrega un valor
 * al enum del schema, TypeScript exige la etiqueta aquí y no se cuela una
 * opción sin texto.
 */

export const etiquetasTipoDeuda: Record<TipoDeuda, string> = {
  tarjeta_credito: "Tarjeta de crédito",
  credito_vehiculo: "Crédito de vehículo",
  credito_libre: "Crédito de libre inversión",
  credito_hipotecario: "Crédito hipotecario",
  familiar: "Deuda con un familiar",
  otro: "Otra deuda",
}

export const etiquetasCategoriaIngreso: Record<CategoriaIngreso, string> = {
  salario: "Salario",
  independiente: "Trabajo independiente",
  negocio: "Negocio propio",
  arriendo: "Arriendo que recibo",
  pension: "Pensión",
  otro: "Otro ingreso",
}

export const etiquetasCategoriaEgreso: Record<CategoriaEgreso, string> = {
  // Va primero en la lista: la fórmula central separa impuestos del resto.
  impuestos: "Impuestos",
  arriendo: "Arriendo",
  servicios: "Recibos y servicios",
  mercado: "Mercado",
  transporte: "Transporte",
  salud: "Salud",
  colegiaturas: "Colegios y universidad",
  otro: "Otro gasto fijo",
}

/** Orden estable para los `<Select>`. Object.keys no lo garantiza. */
export const tiposDeuda = Object.keys(etiquetasTipoDeuda) as TipoDeuda[]
export const categoriasIngreso = Object.keys(
  etiquetasCategoriaIngreso,
) as CategoriaIngreso[]
export const categoriasEgreso = Object.keys(
  etiquetasCategoriaEgreso,
) as CategoriaEgreso[]

export type { CategoriaEgreso, CategoriaIngreso, TipoDeuda }
