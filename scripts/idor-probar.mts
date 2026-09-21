import "dotenv/config"

import { prisma } from "@/lib/db/prisma"
import { construirContexto } from "@/lib/ia/contexto"

/**
 * Prueba de IDOR (RNF-005): con la sesión de A, pedir los recursos de B por su
 * id REAL.
 *
 * Lo que distingue esta prueba de la que ya estaba hecha: aquí los uuid
 * existen y pertenecen a otra persona. Un uuid inventado devuelve 404 incluso
 * sin filtro de dueño, así que no probaba nada.
 *
 * Cada ataque lleva su control positivo —la misma petición contra el recurso
 * PROPIO de A—, porque un 404 también sale de un cuerpo inválido o de una ruta
 * mal escrita. Sin el control, un script roto se leería como una app segura.
 *
 * Requiere el servidor en localhost:3000 y las cuentas de `idor-sembrar.mts`.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000"

type Cuenta = {
  password: string
  usuarioId: string
  objetivoId: string
  ingresoId: string
  egresoId: string
  deudaId: string
  ingresoExtraId: string
  egresoExtraId: string
}

const datos = JSON.parse(process.argv[2]) as Record<string, Cuenta>
const A = datos["atacante@local.test"]
const B = datos["victima@local.test"]

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`login de ${email} falló: ${res.status} ${await res.text()}`)
  const cookies = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ")
  if (!cookies.includes("coach_session")) throw new Error(`sin cookie de sesión para ${email}`)
  return cookies
}

async function pedir(metodo: string, ruta: string, cookie: string, cuerpo?: unknown) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { "content-type": "application/json", cookie },
    ...(cuerpo !== undefined && { body: JSON.stringify(cuerpo) }),
  })
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    /* respuestas sin cuerpo */
  }
  return { status: res.status, json }
}

const resultados: { nombre: string; ok: boolean; detalle: string }[] = []

function comprobar(nombre: string, ok: boolean, detalle: string) {
  resultados.push({ nombre, ok, detalle })
  console.log(`${ok ? "  PASA" : "  FALLA"}  ${nombre} — ${detalle}`)
}

const cookieA = await login("atacante@local.test", "idor-atacante-2026")
console.log("Sesión de la atacante abierta.\n")

// Estado de B antes de cualquier ataque, para comparar al final.
const antes = {
  deuda: await prisma.deuda.findUnique({ where: { id: B.deudaId } }),
  ingreso: await prisma.ingreso.findUnique({ where: { id: B.ingresoId } }),
  egreso: await prisma.egreso.findUnique({ where: { id: B.egresoId } }),
  objetivo: await prisma.objetivo.findUnique({ where: { id: B.objetivoId } }),
  egresoExtra: await prisma.egresoExtra.findUnique({ where: { id: B.egresoExtraId } }),
}

console.log("── Ataques con la sesión de A contra los recursos de B ──")

// ─── Deudas ────────────────────────────────────────────────────────────────
let r = await pedir("PATCH", `/api/deudas/${B.deudaId}`, cookieA, {
  nombre: "SECUESTRADA POR ANA",
  saldo: 1,
})
comprobar("PATCH /api/deudas/[id] ajeno", r.status === 404, `status ${r.status}`)

r = await pedir("DELETE", `/api/deudas/${B.deudaId}`, cookieA)
comprobar("DELETE /api/deudas/[id] ajeno", r.status === 404, `status ${r.status}`)

// ─── Ingresos ──────────────────────────────────────────────────────────────
r = await pedir("PATCH", `/api/ingresos/${B.ingresoId}`, cookieA, {
  categoria: "salario",
  monto: 1,
})
comprobar("PATCH /api/ingresos/[id] ajeno", r.status === 404, `status ${r.status}`)

r = await pedir("DELETE", `/api/ingresos/${B.ingresoId}`, cookieA)
comprobar("DELETE /api/ingresos/[id] ajeno", r.status === 404, `status ${r.status}`)

// ─── Gastos fijos ──────────────────────────────────────────────────────────
r = await pedir("PATCH", `/api/egresos/${B.egresoId}`, cookieA, {
  categoria: "arriendo",
  monto: 1,
})
comprobar("PATCH /api/egresos/[id] ajeno", r.status === 404, `status ${r.status}`)

r = await pedir("DELETE", `/api/egresos/${B.egresoId}`, cookieA)
comprobar("DELETE /api/egresos/[id] ajeno", r.status === 404, `status ${r.status}`)

// ─── Gastos grandes puntuales ──────────────────────────────────────────────
r = await pedir("DELETE", `/api/egresos/extra/${B.egresoExtraId}`, cookieA)
comprobar("DELETE /api/egresos/extra/[id] ajeno", r.status === 404, `status ${r.status}`)

// ─── Objetivos ─────────────────────────────────────────────────────────────
r = await pedir("PATCH", `/api/objetivos/${B.objetivoId}`, cookieA, {
  intencion: "Intencion secuestrada por Ana Atacante",
})
comprobar("PATCH /api/objetivos/[id] ajeno", r.status === 404, `status ${r.status}`)

r = await pedir("POST", `/api/objetivos/${B.objetivoId}/logrado`, cookieA)
comprobar("POST /api/objetivos/[id]/logrado ajeno", r.status === 404, `status ${r.status}`)

// ─── Admin, con sesión de usuaria normal ───────────────────────────────────
r = await pedir("PATCH", `/api/admin/usuarios/${B.usuarioId}`, cookieA, { estado: "bloqueado" })
comprobar(
  "PATCH /api/admin/usuarios/[id] sin ser admin → 404, no 403",
  r.status === 404,
  `status ${r.status}`,
)

// Si esta pasara, A borraría de un golpe la intención, las deudas, los
// ingresos y los gastos de B. La relectura del final lo confirma.
r = await pedir("DELETE", `/api/admin/usuarios/${B.usuarioId}/onboarding`, cookieA)
comprobar(
  "DELETE /api/admin/usuarios/[id]/onboarding sin ser admin → 404, no 403",
  r.status === 404,
  `status ${r.status}`,
)

// Si esta pasara, A se daría a sí misma —o a cualquiera— llamadas al motor
// sin límite. El cuerpo es válido para que llegue a la capa de autorización.
r = await pedir("PUT", `/api/admin/usuarios/${B.usuarioId}/permisos`, cookieA, {
  recalcularPlan: true,
})
comprobar(
  "PUT /api/admin/usuarios/[id]/permisos sin ser admin → 404, no 403",
  r.status === 404,
  `status ${r.status}`,
)

// ─── Recalcular el plan sin el permiso ─────────────────────────────────────
// No es IDOR sino la barrera de RF-068: el botón no se pinta, pero la API se
// puede llamar igual. La siembra deja el permiso apagado.
r = await pedir("POST", "/api/ia/recalcular-plan", cookieA)
comprobar(
  "POST /api/ia/recalcular-plan sin el permiso → 403",
  r.status === 403,
  `status ${r.status}`,
)

// ─── Check-in: ids ajenos en el CUERPO ─────────────────────────────────────
// Aquí un id ajeno NO da 404: se ignora a propósito para no tumbar el
// check-in entero. La comprobación es que los datos de B no se movieron.
r = await pedir("POST", "/api/checkin", cookieA, {
  pagos: [{ deudaId: B.deudaId, monto: 1_000_000 }],
  nuevasDeudas: [],
  ingresosExtra: [],
  aportes: [{ objetivoId: B.objetivoId, monto: 500_000 }],
})
console.log(`  (check-in con ids de B respondió ${r.status})`)

// ─── Motor IA: ingresoExtraId ajeno en el cuerpo ───────────────────────────
// Se comprueba sobre el contexto, no sobre la prosa del plan: el contexto es
// exactamente lo que el modelo llegaría a leer, y no depende del proveedor.
const contextoA = await construirContexto(A.usuarioId, "ingreso_extra", B.ingresoExtraId)
const serializado = JSON.stringify(contextoA)
comprobar(
  "construirContexto con ingresoExtraId ajeno no filtra el ingreso de B",
  !serializado.includes("Beto Victima"),
  serializado.includes("Beto Victima") ? "¡el contexto trae datos de B!" : "el contexto no lo incluye",
)

r = await pedir("POST", "/api/ia/generar-plan", cookieA, {
  trigger: "ingreso_extra",
  ingresoExtraId: B.ingresoExtraId,
})
console.log(`  (generar-plan con ingresoExtraId de B respondió ${r.status})`)

// ─── Sin sesión ────────────────────────────────────────────────────────────
r = await pedir("PATCH", `/api/deudas/${B.deudaId}`, "", { nombre: "Sin sesion", saldo: 1 })
comprobar("PATCH /api/deudas/[id] sin cookie", r.status === 401, `status ${r.status}`)

// Doble función: comprueba el 401 y hace de control positivo del ataque de
// arriba. Ese endpoint no tiene cuerpo que zod pueda rechazar, así que una ruta
// mal escrita daría 404 —el de Next— y se leería como una app segura. Un 401
// solo puede venir del guardia, o sea de que la ruta existe y se alcanzó.
r = await pedir("DELETE", `/api/admin/usuarios/${B.usuarioId}/onboarding`, "")
comprobar(
  "DELETE /api/admin/usuarios/[id]/onboarding sin cookie",
  r.status === 401,
  `status ${r.status}`,
)

// Control positivo del PUT de permisos, por la misma razón que el anterior.
r = await pedir("PUT", `/api/admin/usuarios/${B.usuarioId}/permisos`, "", {
  recalcularPlan: true,
})
comprobar(
  "PUT /api/admin/usuarios/[id]/permisos sin cookie",
  r.status === 401,
  `status ${r.status}`,
)

// ─── Los datos de B, releídos de la base ───────────────────────────────────
console.log("\n── Los datos de B después de todos los ataques ──")

const despues = {
  deuda: await prisma.deuda.findUnique({ where: { id: B.deudaId } }),
  ingreso: await prisma.ingreso.findUnique({ where: { id: B.ingresoId } }),
  egreso: await prisma.egreso.findUnique({ where: { id: B.egresoId } }),
  objetivo: await prisma.objetivo.findUnique({ where: { id: B.objetivoId } }),
  egresoExtra: await prisma.egresoExtra.findUnique({ where: { id: B.egresoExtraId } }),
  usuario: await prisma.usuario.findUnique({ where: { id: B.usuarioId } }),
}

comprobar(
  "B sigue con su onboarding completado",
  despues.usuario?.onboardingCompletadoEn != null,
  `onboardingCompletadoEn=${despues.usuario?.onboardingCompletadoEn}`,
)

comprobar(
  "B sigue sin el permiso de recalcular",
  despues.usuario?.puedeRecalcularPlan === false,
  `puedeRecalcularPlan=${despues.usuario?.puedeRecalcularPlan}`,
)

comprobar(
  "La deuda de B sigue existiendo, con su nombre y su saldo",
  despues.deuda !== null &&
    despues.deuda.nombre === antes.deuda!.nombre &&
    String(despues.deuda.montoActual) === String(antes.deuda!.montoActual) &&
    despues.deuda.estado === antes.deuda!.estado,
  `nombre="${despues.deuda?.nombre}" saldo=${despues.deuda?.montoActual} estado=${despues.deuda?.estado}`,
)

comprobar(
  "El ingreso de B sigue existiendo, con su monto",
  despues.ingreso !== null &&
    String(despues.ingreso.montoMensual) === String(antes.ingreso!.montoMensual),
  `monto=${despues.ingreso?.montoMensual}`,
)

comprobar(
  "El gasto fijo de B sigue existiendo, con su monto",
  despues.egreso !== null &&
    String(despues.egreso.montoMensual) === String(antes.egreso!.montoMensual),
  `monto=${despues.egreso?.montoMensual}`,
)

comprobar(
  "El gasto grande de B sigue existiendo, con su monto",
  despues.egresoExtra !== null &&
    String(despues.egresoExtra.monto) === String(antes.egresoExtra!.monto),
  `monto=${despues.egresoExtra?.monto}`,
)

comprobar(
  "El objetivo de B conserva intención, estado y acumulado",
  despues.objetivo !== null &&
    despues.objetivo.intencion === antes.objetivo!.intencion &&
    despues.objetivo.estado === antes.objetivo!.estado &&
    String(despues.objetivo.montoAcumulado) === String(antes.objetivo!.montoAcumulado),
  `intencion="${despues.objetivo?.intencion}" estado=${despues.objetivo?.estado} acumulado=${despues.objetivo?.montoAcumulado}`,
)

// ─── Controles positivos ───────────────────────────────────────────────────
// Sin esto, un script roto (cuerpo inválido, ruta mal escrita) daría 404 en
// todo y se leería como una app segura.
console.log("\n── Controles positivos: A contra SUS PROPIOS recursos ──")

r = await pedir("PATCH", `/api/deudas/${A.deudaId}`, cookieA, {
  nombre: "Tarjeta renombrada por su dueña",
  saldo: 7_000_000,
})
comprobar("PATCH de A sobre su propia deuda funciona", r.status === 200, `status ${r.status}`)

r = await pedir("PATCH", `/api/objetivos/${A.objetivoId}`, cookieA, {
  intencion: "Intencion editada por su propia dueña",
})
comprobar("PATCH de A sobre su propio objetivo funciona", r.status === 200, `status ${r.status}`)

r = await pedir("PATCH", `/api/egresos/${A.egresoId}`, cookieA, {
  categoria: "arriendo",
  monto: 1_600_000,
})
comprobar("PATCH de A sobre su propio gasto fijo funciona", r.status === 200, `status ${r.status}`)

// Va antes del DELETE del ingreso: borrarlo deja a A sin ingresos, y sin
// ingresos no hay umbral —el gasto grande pasaría por otro camino y el control
// dejaría de medir lo que dice medir.
r = await pedir("DELETE", `/api/egresos/extra/${A.egresoExtraId}`, cookieA)
comprobar(
  "DELETE de A sobre su propio gasto grande funciona",
  r.status === 200,
  `status ${r.status}`,
)

r = await pedir("DELETE", `/api/ingresos/${A.ingresoId}`, cookieA)
comprobar("DELETE de A sobre su propio ingreso funciona", r.status === 200, `status ${r.status}`)

// ─── Veredicto ─────────────────────────────────────────────────────────────
const fallidas = resultados.filter((x) => !x.ok)
console.log(`\n${"═".repeat(60)}`)
console.log(`${resultados.length - fallidas.length}/${resultados.length} comprobaciones pasan.`)
if (fallidas.length > 0) {
  console.log("\nFALLAN:")
  for (const f of fallidas) console.log(`  - ${f.nombre}: ${f.detalle}`)
}
console.log(fallidas.length === 0 ? "IDOR: sin hallazgos." : "IDOR: HAY HALLAZGOS.")

await prisma.$disconnect()
process.exit(fallidas.length === 0 ? 0 : 1)
