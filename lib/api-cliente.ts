/**
 * Cliente mínimo para hablar con las API del propio dominio.
 *
 * Existe para que las cinco pantallas del onboarding no repitan cada una el
 * mismo bloque de try/catch, cabeceras y lectura de `mensaje`, que era donde
 * se colaban las diferencias de trato al error.
 */

export type Respuesta<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; mensaje: string }

export async function enviar<T = Record<string, unknown>>(
  url: string,
  metodo: "POST" | "PUT" | "PATCH" | "DELETE",
  cuerpo?: unknown,
): Promise<Respuesta<T>> {
  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })

    const datos = await respuesta.json().catch(() => null)

    if (!datos) {
      return { ok: false, mensaje: "El servidor respondió algo que no entendimos." }
    }
    if (!datos.ok) {
      return {
        ok: false,
        mensaje: datos.mensaje ?? "No pudimos guardar los cambios.",
      }
    }
    return datos as { ok: true } & T
  } catch {
    return {
      ok: false,
      mensaje: "No pudimos conectar con el servidor. Revisa tu conexión.",
    }
  }
}
