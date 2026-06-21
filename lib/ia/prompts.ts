import { Decimal } from "@prisma/client/runtime/library"

export interface ContextoFinanciero {
  intencion: string
  objetivos: { intencion: string }[]
  capacidadReal: number
  deudas: {
    tipo: string
    montoActual: number
    tasaInteres: number | null
  }[]
  historialEventos: {
    tipo: string
    progresoPct: number | null
    createdAt: Date
  }[]
  trigger: "onboarding" | "check_in" | "ingreso_extra"
  ingresoExtraDescripcion?: string
  ingresoExtraMonto?: number
}

export function construirPrompt(ctx: ContextoFinanciero) {
  const system = `Eres un coach financiero experto y motivador.
Tu única función es analizar datos financieros estructurados y generar planes de acción concretos.
La intención del usuario es tu guía principal e inamovible.
Tu tono es siempre motivacional, constructivo y propones mejoras sin importar el resultado.
No especules sobre datos que no te fueron provistos.
Responde SIEMPRE en formato JSON con la estructura indicada.`

  const user = `Analiza la siguiente situación financiera y genera un plan de acción.

INTENCIÓN PRINCIPAL: "${ctx.intencion}"

OBJETIVOS ACTIVOS: ${ctx.objetivos.map((o) => `"${o.intencion}"`).join(", ")}

CAPACIDAD REAL MENSUAL DISPONIBLE: ${ctx.capacidadReal}

DEUDAS ACTIVAS:
${ctx.deudas.map((d) => `- ${d.tipo}: ${d.montoActual}${d.tasaInteres ? ` (tasa: ${d.tasaInteres}%)` : ""}`).join("\n")}

HISTORIAL DE PROGRESO (últimos eventos):
${ctx.historialEventos.slice(-5).map((e) => `- ${e.tipo}: ${e.progresoPct ?? "N/A"}% (${e.createdAt.toISOString().split("T")[0]})`).join("\n")}

TRIGGER: ${ctx.trigger}
${ctx.ingresoExtraMonto ? `INGRESO EXTRA REGISTRADO: ${ctx.ingresoExtraMonto} — "${ctx.ingresoExtraDescripcion}"` : ""}

Responde con este JSON exacto:
{
  "mensaje_motivacional": "string — máx 3 oraciones, positivo y personalizado",
  "resumen_situacion": "string — 1-2 oraciones sobre el panorama actual",
  "plan_pagos": [
    { "deuda": "string", "pago_mensual_sugerido": number, "meses_para_saldar": number }
  ],
  "proyeccion_meses_libertad": number,
  "mejoras_sugeridas": ["string", "string"],
  "alerta": "string | null — solo si hay algo urgente"
}`

  return { system, user }
}
