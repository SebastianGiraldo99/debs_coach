import OpenAI from "openai"

import type { ContextoFinanciero } from "@/lib/ia/contexto"
import { construirPrompt } from "@/lib/ia/prompts"
import { planLocal } from "@/lib/ia/mock"
import { esquemaRespuestaIa, type OrigenPlan, type RespuestaIa } from "@/lib/ia/schema"

/**
 * El Motor IA: contexto estructurado entra, plan validado sale.
 *
 * Nunca lanza. Un fallo del proveedor no puede dejar al usuario sin plan
 * después de haber entregado todos sus datos, así que cualquier camino de
 * error termina en `planLocal` (ver `mock.ts`) y el llamador siempre recibe
 * algo que mostrar. Lo que sí distingue es el `origen`.
 */

/** Tope de la ETR (§14 de riesgos): 45 s de pared, reintento incluido. */
const TIMEOUT_MS = 45_000

/** RF-038: el proveedor se cambia por variable de entorno, no por código. */
const MODELO_POR_DEFECTO = "gpt-4o"

/**
 * Por debajo de 1 el plan es más estable entre generaciones, que es lo que
 * se quiere de un consejo financiero: dos planes seguidos con los mismos
 * datos no deberían decir cosas distintas.
 */
const TEMPERATURA = 0.4

/**
 * Modelos que rechazan `temperature` —los de razonamiento solo aceptan el
 * valor por defecto—. La lista se aprende del primer 400 en vez de venir
 * escrita: RF-038 permite cambiar de modelo por variable de entorno, y una
 * lista fija obligaría a tocar código cada vez que sale uno nuevo.
 */
const modelosSinTemperatura = new Set<string>()

function esRechazoDeTemperatura(error: unknown): boolean {
  return (
    error instanceof OpenAI.APIError &&
    error.status === 400 &&
    typeof error.message === "string" &&
    error.message.includes("temperature")
  )
}

export type ResultadoMotor = {
  plan: RespuestaIa
  origen: OrigenPlan
  /** Por qué se cayó al plan local. `undefined` cuando respondió el modelo. */
  motivo?: "sin_api_key" | "error_proveedor" | "respuesta_invalida"
}

/**
 * Los logs del motor no llevan cifras ni prosa del plan: son datos
 * financieros de una persona y acaban en el journal del VPS (RNF-004). Se
 * loguea qué falló y dónde, no con qué números.
 */
function registrarFallo(motivo: string, detalle: Record<string, unknown>) {
  console.error(`[ia] ${motivo}`, detalle)
}

function clienteOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  // Se construye por llamada y no a nivel de módulo: el constructor del SDK
  // lanza si no hay key, y eso tumbaría el import en modo local.
  return new OpenAI({
    apiKey,
    timeout: TIMEOUT_MS,
    // Un solo reintento, y solo lo hace el SDK ante errores de transporte,
    // 429 y 5xx. Una respuesta malformada NO se reintenta: son otros 45 s de
    // espera para el usuario a cambio de la misma respuesta probable.
    maxRetries: 1,
  })
}

export async function generarPlan(ctx: ContextoFinanciero): Promise<ResultadoMotor> {
  const cliente = clienteOpenAI()
  if (!cliente) {
    // Modo local: sin key no se llama a nadie. Es el modo de desarrollo por
    // defecto y no es un error, así que no se loguea como tal.
    return { plan: planLocal(ctx), origen: "local", motivo: "sin_api_key" }
  }

  const modelo = process.env.OPENAI_MODEL || MODELO_POR_DEFECTO
  const { system, user } = construirPrompt(ctx)

  const peticion = {
    model: modelo,
    messages: [
      { role: "system" as const, content: system },
      { role: "user" as const, content: user },
    ],
    response_format: { type: "json_object" as const },
  }

  // El timeout del cliente aplica a cada intento; esta señal acota el total
  // —intentos, reintento del SDK y esperas entre ellos— a los 45 s.
  const opciones = { signal: AbortSignal.timeout(TIMEOUT_MS) }

  let contenido: string | null | undefined
  try {
    let respuesta
    try {
      respuesta = await cliente.chat.completions.create(
        modelosSinTemperatura.has(modelo)
          ? peticion
          : { ...peticion, temperature: TEMPERATURA },
        opciones,
      )
    } catch (error) {
      if (!esRechazoDeTemperatura(error)) throw error
      modelosSinTemperatura.add(modelo)
      respuesta = await cliente.chat.completions.create(peticion, opciones)
    }
    contenido = respuesta.choices[0]?.message?.content
  } catch (error) {
    registrarFallo("el proveedor no respondió", {
      modelo,
      trigger: ctx.trigger,
      error: error instanceof Error ? error.message : String(error),
    })
    return { plan: planLocal(ctx), origen: "local", motivo: "error_proveedor" }
  }

  if (!contenido) {
    registrarFallo("respuesta vacía", { modelo, trigger: ctx.trigger })
    return { plan: planLocal(ctx), origen: "local", motivo: "respuesta_invalida" }
  }

  let crudo: unknown
  try {
    crudo = JSON.parse(contenido)
  } catch {
    registrarFallo("la respuesta no era JSON", {
      modelo,
      trigger: ctx.trigger,
      longitud: contenido.length,
    })
    return { plan: planLocal(ctx), origen: "local", motivo: "respuesta_invalida" }
  }

  const validado = esquemaRespuestaIa.safeParse(crudo)
  if (!validado.success) {
    // Se loguean las rutas de los campos que fallaron, no sus valores: con
    // `pasos.0.accion: demasiado largo` se depura igual y no se filtra el
    // contenido financiero al log.
    registrarFallo("la respuesta no cumple el contrato", {
      modelo,
      trigger: ctx.trigger,
      campos: validado.error.issues.map((i) => `${i.path.join(".")}: ${i.code}`),
    })
    return { plan: planLocal(ctx), origen: "local", motivo: "respuesta_invalida" }
  }

  return { plan: validado.data, origen: "ia" }
}
