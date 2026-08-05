/**
 * Deducir la tasa efectiva anual de una deuda a partir de lo que la persona sí
 * tiene a la mano: cuánto debe, cuánto paga al mes y cuántas cuotas le faltan.
 *
 * Existe porque casi nadie conoce su tasa. Está en el extracto, en letra
 * pequeña y en un formato distinto en cada banco, mientras que la cuota y el
 * plazo se saben de memoria. Y la tasa no es un dato decorativo: es lo que
 * ordena el método avalancha —qué deuda se ataca primero— tanto en el plan del
 * modelo como en `lib/finanzas/proyeccion.ts`. Sin ella, dos deudas se ordenan
 * por saldo, que es el criterio equivocado.
 *
 * La cuenta es la tasa implícita de una anualidad vencida:
 *
 *   saldo = cuota × (1 − (1 + i)^−n) / i
 *
 * No se despeja `i` porque no tiene forma cerrada: se busca por bisección. La
 * función es estrictamente decreciente en `i`, así que la bisección converge
 * siempre y sin necesidad de una semilla como pediría Newton.
 */

export type ResultadoTasa =
  | { ok: true; tasaEA: number }
  | { ok: false; motivo: string }

/** Tope de la búsqueda: 100% mensual. Por encima el dato está mal, no la deuda. */
const MAX_MENSUAL = 1

/**
 * El mismo tope que `esquemaDeuda` acepta en el campo. Devolver 240% para que
 * el formulario lo rechace después sería un callejón sin salida.
 */
const MAX_EA = 200

/** Suficientes para converger a más decimales de los que se muestran. */
const ITERACIONES = 100

/** Valor presente de `n` cuotas de `cuota` a una tasa mensual `i`. */
function valorPresente(cuota: number, n: number, i: number): number {
  // El límite de la fórmula cuando i→0 es cuota × n, pero dividir por un
  // número tan pequeño pierde toda la precisión mucho antes de llegar a cero.
  if (i < 1e-12) return cuota * n
  return (cuota * (1 - Math.pow(1 + i, -n))) / i
}

export function calcularTasaEA(datos: {
  saldo: number
  cuota: number
  cuotas: number
}): ResultadoTasa {
  const { saldo, cuota, cuotas } = datos

  if (!Number.isFinite(saldo) || saldo <= 0) {
    return { ok: false, motivo: "Escribe primero cuánto debes." }
  }
  if (!Number.isFinite(cuota) || cuota <= 0) {
    return { ok: false, motivo: "Escribe primero tu pago mínimo." }
  }
  if (!Number.isInteger(cuotas) || cuotas < 1) {
    return { ok: false, motivo: "¿Cuántas cuotas te faltan? Tiene que ser al menos una." }
  }

  const totalAPagar = cuota * cuotas

  // Pagar en total menos de lo que se debe es imposible salvo que haya una
  // condonación de por medio, y eso ya no es una tasa de interés.
  if (totalAPagar < saldo) {
    return {
      ok: false,
      motivo:
        "Con esas cuotas pagarías menos de lo que debes. Revisa el saldo, la cuota o el número de cuotas.",
    }
  }

  // Pagar exactamente lo que se debe es un préstamo sin intereses. Es el caso
  // de la deuda con un familiar y sale del cálculo sin pasar por la bisección.
  if (totalAPagar === saldo) return { ok: true, tasaEA: 0 }

  // f(i) = valorPresente(i) − saldo es decreciente: en i=0 vale
  // (cuota×n − saldo) > 0, y cae al crecer i. La raíz está donde cambia de
  // signo, así que basta comprobar que el extremo superior ya es negativo.
  if (valorPresente(cuota, cuotas, MAX_MENSUAL) > saldo) {
    return {
      ok: false,
      motivo: "La tasa que sale de esos números es altísima. Revisa el saldo y la cuota.",
    }
  }

  let bajo = 0
  let alto = MAX_MENSUAL
  for (let paso = 0; paso < ITERACIONES; paso++) {
    const medio = (bajo + alto) / 2
    if (valorPresente(cuota, cuotas, medio) > saldo) bajo = medio
    else alto = medio
  }

  const mensual = (bajo + alto) / 2
  const anual = (Math.pow(1 + mensual, 12) - 1) * 100

  if (anual > MAX_EA) {
    return {
      ok: false,
      motivo: `La tasa que sale de esos números supera el ${MAX_EA}% anual. Revisa el saldo y la cuota.`,
    }
  }

  // Dos decimales: es lo que admite la columna `Decimal(5, 2)` del schema.
  return { ok: true, tasaEA: Math.round(anual * 100) / 100 }
}
