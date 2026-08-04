import type { ContextoFinanciero, DeudaContexto } from "@/lib/ia/contexto"
import type { RespuestaIa } from "@/lib/ia/schema"
import { formatearMeses, formatearMoneda } from "@/lib/formato"

/**
 * El plan que la app calcula sola, sin modelo.
 *
 * Cubre dos casos que en el fondo son el mismo —no hay respuesta del
 * proveedor— por razones distintas:
 *
 * 1. Desarrollo sin `OPENAI_API_KEY`: se trabaja en el flujo completo sin
 *    gastar tokens ni depender de la red.
 * 2. La llamada real falló o devolvió algo que no valida: el usuario recibe
 *    igual un plan en vez de una pantalla vacía.
 *
 * No es un mock en el sentido de datos falsos: los montos salen de los datos
 * reales de la persona y el método —atacar primero la deuda más cara— es
 * defendible. Lo que le falta frente al modelo es la lectura del caso
 * particular, y por eso el plan queda marcado con `origen: "local"`.
 */

/** Interés que genera un saldo en un mes, a partir de la tasa efectiva anual. */
function interesMensual(deuda: DeudaContexto): number | null {
  if (deuda.tasaInteres === null || deuda.tasaInteres <= 0) return null
  const mensual = Math.pow(1 + deuda.tasaInteres / 100, 1 / 12) - 1
  return Math.round(deuda.montoActual * mensual)
}

/** Método avalancha: primero la tasa más alta; a igualdad, el saldo mayor. */
function ordenarPorCosto(deudas: DeudaContexto[]): DeudaContexto[] {
  return [...deudas].sort((a, b) => {
    const tasaA = a.tasaInteres ?? -1
    const tasaB = b.tasaInteres ?? -1
    if (tasaA !== tasaB) return tasaB - tasaA
    return b.montoActual - a.montoActual
  })
}

export function planLocal(ctx: ContextoFinanciero): RespuestaIa {
  const dinero = (valor: number) => formatearMoneda(valor, ctx.moneda)
  const { capacidad } = ctx
  const deudas = ordenarPorCosto(ctx.deudas)
  const objetivo = deudas[0]

  const extra = ctx.ingresoExtra?.monto ?? 0

  // El margen del mes es la capacidad real menos los mínimos de las demás
  // deudas: ese dinero ya está comprometido y no se puede prometer dos veces.
  const minimosOtros = deudas
    .slice(1)
    .reduce((suma, d) => suma + (d.pagoMinimo ?? 0), 0)
  const margen = capacidad.capacidadReal - minimosOtros
  const abono = Math.max(0, Math.round(margen)) + extra

  const alerta =
    capacidad.capacidadReal < 0
      ? `Tus gastos fijos superan tus ingresos en ${dinero(Math.abs(capacidad.capacidadReal))} al mes. Antes de acelerar pagos hay que cerrar esa diferencia.`
      : null

  const meses =
    objetivo && capacidad.capacidadReal > 0
      ? Math.min(600, Math.ceil(capacidad.deudaTotal / capacidad.capacidadReal))
      : null

  // Sin deudas el plan deja de ser de pago y pasa a ser de acumulación.
  if (!objetivo) {
    const aparta = Math.max(0, Math.round(capacidad.capacidadReal * 0.5))
    return {
      siguientePaso: {
        accion:
          capacidad.capacidadReal > 0
            ? `Aparta ${dinero(aparta)} este mes para "${ctx.intencion}"`
            : `Revisa tus gastos fijos: hoy no te queda margen para "${ctx.intencion}"`,
        porque:
          capacidad.capacidadReal > 0
            ? `Te quedan ${dinero(capacidad.capacidadReal)} al mes después de gastos fijos. Separar la mitad apenas empieza el mes evita que se vaya en el camino.`
            : `Tus gastos fijos se llevan todo lo que entra, así que el primer avance está en el gasto, no en el ahorro.`,
      },
      pasos: [
        {
          accion: "Deja el aparte automático el mismo día que recibes tu ingreso",
          porque: "Lo que se aparta al final del mes casi nunca sobra.",
        },
        {
          accion: "Revisa tus gastos fijos y marca los dos que menos usas",
          porque: "Son los que puedes soltar sin que te cambie el día a día.",
        },
      ],
      mesesLibertad: null,
      mensaje: {
        titulo: "No tienes deudas activas",
        cuerpo: `Estás en la parte cómoda: todo lo que te queda al mes puede ir a "${ctx.intencion}". Tu margen actual es ${dinero(capacidad.capacidadReal)}. La mejora de este mes es volver el aparte automático, para no depender de acordarte.`,
      },
      alerta,
    }
  }

  const interes = interesMensual(objetivo)
  const razonObjetivo = interes
    ? `Es tu deuda más cara (${objetivo.tasaInteres}% E.A. — cada mes que mantienes ese saldo te cuesta ${dinero(interes)}).`
    : `Es el saldo más grande que tienes: ${dinero(objetivo.montoActual)}.`

  const pasos: RespuestaIa["pasos"] = []

  if (objetivo.tipo === "tarjeta_credito") {
    pasos.push({
      accion: `Deja de usar "${objetivo.nombre}" para compras nuevas este mes`,
      porque: "Cada compra suma al saldo más caro y alarga el plazo para salir de ella.",
    })
  }

  if (deudas[1]) {
    pasos.push({
      accion: `Cuando termines "${objetivo.nombre}", pasa ese mismo abono a "${deudas[1].nombre}"`,
      porque: `Ya tendrás el hábito de pagar ${dinero(abono)}; redirigirlo acelera todo sin ajustar tu presupuesto.`,
    })
  }

  pasos.push({
    accion: "Paga los mínimos de tus otras deudas antes de cualquier abono extra",
    porque: `Son ${dinero(minimosOtros)} al mes. Por debajo del mínimo la deuda crece aunque estés pagando.`,
  })

  const accion =
    extra > 0
      ? `Abona los ${dinero(extra)} que te entraron a "${objetivo.nombre}"`
      : abono > 0
        ? `Abona ${dinero(abono)} a "${objetivo.nombre}" este mes`
        : `Paga el mínimo de "${objetivo.nombre}" y revisa tus gastos fijos`

  return {
    siguientePaso: {
      accion,
      porque:
        abono > 0
          ? razonObjetivo
          : `${razonObjetivo} Hoy no te queda margen para abonar de más, así que el avance está en bajar el gasto fijo.`,
    },
    pasos: pasos.slice(0, 4),
    mesesLibertad: meses,
    mensaje: {
      titulo:
        extra > 0
          ? `Ese ingreso extra te acerca a "${ctx.intencion}"`
          : `Tu deuda hoy suma ${dinero(capacidad.deudaTotal)}`,
      cuerpo:
        `Te quedan ${dinero(capacidad.capacidadReal)} al mes después de impuestos y gastos fijos. ` +
        (meses ? `Al ritmo actual saldrías de todo en ${formatearMeses(meses)}. ` : "") +
        `La mejora de este mes: concentra todo lo que puedas en "${objetivo.nombre}" y mantén los mínimos del resto.`,
    },
    alerta,
  }
}
