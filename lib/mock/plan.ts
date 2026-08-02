export type PasoPlan = {
  id: string
  accion: string
  porque: string
}

// El primer paso es "Tu siguiente paso" del dashboard. El resto forma la lista
// numerada "Tu plan".
export const planIA = {
  generadoEn: "2025-07-26",
  siguientePaso: {
    accion: "Abona $ 850.000 a la tarjeta Visa antes del 15 de agosto",
    porque:
      "Es la deuda más cara que tienes (32% E.A.). Cada mes que la mantienes te cuesta $ 218.000 en intereses.",
  } satisfies Omit<PasoPlan, "id">,
  pasos: [
    {
      id: "paso_02",
      accion: "Deja de usar la tarjeta Visa para compras nuevas este mes",
      porque: "Cada compra suma al saldo más caro y alarga el plazo para salir de ella.",
    },
    {
      id: "paso_03",
      accion: "Cuando termines la Visa, pasa ese mismo abono al crédito del carro",
      porque: "Ya tienes el hábito de pagar $ 850.000; redirigirlo acelera todo sin ajustar tu presupuesto.",
    },
    {
      id: "paso_04",
      accion: "Aparta $ 300.000 al mes para tu colchón de emergencia",
      porque: "Un fondo pequeño evita que vuelvas a la tarjeta ante un imprevisto.",
    },
  ] satisfies PasoPlan[],
}

// Mensaje motivacional que cierra el flujo de check-in (RF-031).
export const mensajeCheckin = {
  titulo: "Bajaste $ 1.200.000 de deuda este mes",
  cuerpo:
    "Vas por buen camino con la tarjeta Visa. Para el próximo check-in, intenta subir el abono a $ 900.000 si tu ingreso lo permite: acortarías el plazo casi un mes. Si no se puede, mantener el ritmo actual también funciona.",
}

export const cifrasClave = {
  disponible: 1700000,
  disponibleContexto: "después de deudas y gastos fijos",
  deudaTotal: 14600000,
  deudaContexto: "bajó $ 1.200.000 desde tu último check-in",
  mesesFaltan: 11,
  mesesContexto: "para saldar todo, al ritmo actual",
}
