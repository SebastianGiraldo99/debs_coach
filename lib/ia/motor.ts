import OpenAI from "openai"
import { construirPrompt, ContextoFinanciero } from "./prompts"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generarPlan(ctx: ContextoFinanciero) {
  const { system, user } = construirPrompt(ctx)

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  })

  const contenido = response.choices[0]?.message?.content
  if (!contenido) throw new Error("La IA no retornó contenido")

  return JSON.parse(contenido)
}
