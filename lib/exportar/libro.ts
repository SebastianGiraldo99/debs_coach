import type { EstadoObjetivo } from "@prisma/client"
import ExcelJS from "exceljs"

import type { UsuarioSesion } from "@/lib/auth/dal"
import { cargarDashboard } from "@/lib/dashboard/datos"
import { prisma } from "@/lib/db/prisma"
import { hoyEnBogota } from "@/lib/finanzas/calendario"
import {
  etiquetasCategoriaEgreso,
  etiquetasCategoriaIngreso,
  etiquetasTipoDeuda,
  type TipoDeuda,
} from "@/lib/finanzas/etiquetas"
import type { Moneda } from "@/lib/formato"

/**
 * El libro de Excel con todos los datos de una persona (RF-071 a RF-074).
 *
 * Existe para que quien paga otra IA pueda dársela y conversar a fondo sobre
 * sus finanzas: aquí el motor no es un chat (RF-035) y no lo va a ser. Por eso
 * cada decisión de formato está pensada para que un modelo lo lea sin
 * adivinar:
 *
 * - **Una tabla por hoja**, con los títulos en la fila 1 y nada encima. Una
 *   hoja con celdas combinadas o un título decorativo arriba se lee mal.
 * - **Los montos son números**, no texto con "$" y puntos: así se pueden
 *   sumar, y el formato de celda se encarga de mostrarlos agrupados.
 * - **Sin ids.** Un uuid no le dice nada a nadie y es un dato interno que no
 *   tiene por qué salir de la app.
 * - **La hoja "Léeme" va primero** y explica qué es cada cifra. Sin ella, la
 *   IA confundiría la capacidad estructural con el disponible del mes, que es
 *   justo la distinción que más le costó a este producto.
 *
 * Las cifras de "Resumen" y "Plan actual" salen de `cargarDashboard()`, la
 * misma función que pinta el dashboard: el Excel dice lo mismo que la
 * pantalla, calculado en el mismo momento.
 *
 * Todo se consulta con el `usuarioId` de la sesión y ningún parámetro llega
 * del cliente. El texto que escribió la persona entra como cadena, nunca como
 * fórmula: una descripción que empiece por "=" no se ejecuta al abrir el
 * archivo.
 */

type Columna = { titulo: string; clave: string; ancho: number; tipo?: "monto" | "fecha" | "pct" }

function aNumero(valor: { toString(): string } | null | undefined): number | null {
  return valor === null || valor === undefined ? null : Number(valor.toString())
}

/**
 * Un instante (`createdAt`) como el día que era en Bogotá.
 *
 * Excel no tiene zonas horarias: guarda un número de días. ExcelJS lo calcula
 * sobre UTC, así que un registro de las 8 p.m. en Colombia saldría con la
 * fecha del día siguiente. Se lleva a medianoche UTC del día de Bogotá, que es
 * como ya vienen las columnas `@db.Date`.
 */
function diaBogota(instante: Date): Date {
  return new Date(`${hoyEnBogota(instante)}T00:00:00Z`)
}

function formatoMonto(moneda: Moneda): string {
  // Sin símbolo en la celda: la moneda va en el Léeme y en el título de la
  // columna. Con "$" dentro del formato, algunas hojas de cálculo lo leen
  // como texto al copiar.
  return moneda === "USD" ? "#,##0.00" : "#,##0"
}

function agregarHoja(
  libro: ExcelJS.Workbook,
  nombre: string,
  columnas: Columna[],
  filas: Record<string, unknown>[],
  moneda: Moneda,
  vacia: string,
) {
  const hoja = libro.addWorksheet(nombre, {
    views: [{ state: "frozen", ySplit: 1 }],
  })
  hoja.columns = columnas.map((c) => ({ header: c.titulo, key: c.clave, width: c.ancho }))

  const cabecera = hoja.getRow(1)
  cabecera.font = { bold: true }
  cabecera.alignment = { vertical: "middle", wrapText: true }

  if (filas.length === 0) {
    // Una hoja vacía sin explicación parece un error de exportación.
    hoja.addRow({ [columnas[0].clave]: vacia })
    return hoja
  }

  hoja.addRows(filas)

  columnas.forEach((c, i) => {
    const columna = hoja.getColumn(i + 1)
    if (c.tipo === "monto") columna.numFmt = formatoMonto(moneda)
    if (c.tipo === "fecha") columna.numFmt = "dd/mm/yyyy"
    if (c.tipo === "pct") columna.numFmt = "0.0"
    if (!c.tipo) columna.alignment = { wrapText: true, vertical: "top" }
  })
  // El formato de columna también alcanza a la cabecera; se restituye.
  cabecera.font = { bold: true }

  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } }
  return hoja
}

const etiquetaEstadoObjetivo: Record<EstadoObjetivo, string> = {
  activo: "Activo",
  logrado: "Logrado",
  cancelado: "Cancelado",
}

/** Lo que el check-in guardó. Tolerante: un payload distinto da ceros, no un 500. */
type PagoGuardado = { deudaId?: unknown; monto?: unknown }
type SnapshotGuardado = { totalPagado?: unknown; capacidad?: { deudaTotal?: unknown } }

function numeroSeguro(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null
}

export async function construirLibro(usuario: UsuarioSesion): Promise<ExcelJS.Workbook> {
  const usuarioId = usuario.id
  const moneda = usuario.monedaBase

  const [
    dashboard,
    objetivos,
    deudas,
    ingresos,
    egresos,
    ingresosExtra,
    egresosExtra,
    checkins,
    eventosCheckin,
  ] = await Promise.all([
    cargarDashboard(usuario),
    prisma.objetivo.findMany({
      where: { usuarioId },
      orderBy: { createdAt: "asc" },
      select: {
        intencion: true,
        estado: true,
        montoObjetivo: true,
        montoAcumulado: true,
        createdAt: true,
      },
    }),
    // Todas, saldadas incluidas: que una deuda desapareciera del Excel
    // escondería justo el avance que la persona quiere comentar.
    prisma.deuda.findMany({
      where: { usuarioId },
      orderBy: [{ estado: "asc" }, { montoActual: "desc" }],
      select: {
        id: true,
        nombre: true,
        tipo: true,
        estado: true,
        montoOriginal: true,
        montoActual: true,
        tasaInteres: true,
        pagoMinimo: true,
        createdAt: true,
      },
    }),
    prisma.ingreso.findMany({
      where: { usuarioId },
      orderBy: { montoMensual: "desc" },
      select: { descripcion: true, categoria: true, montoMensual: true },
    }),
    prisma.egreso.findMany({
      where: { usuarioId },
      orderBy: { montoMensual: "desc" },
      select: { descripcion: true, categoria: true, montoMensual: true },
    }),
    prisma.ingresoExtra.findMany({
      where: { usuarioId },
      orderBy: { fecha: "desc" },
      select: { fecha: true, descripcion: true, monto: true },
    }),
    prisma.egresoExtra.findMany({
      where: { usuarioId },
      orderBy: { fecha: "desc" },
      select: { fecha: true, descripcion: true, monto: true },
    }),
    prisma.checkIn.findMany({
      where: { usuarioId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        pagosRealizados: true,
        nuevasDeudas: true,
        ingresosExtra: true,
        snapshot: true,
        respuestaIa: true,
      },
    }),
    // El avance de la intención principal vive en el evento, no en el
    // check-in (ver lib/checkins/historial.ts).
    prisma.evento.findMany({
      where: { usuarioId, tipo: "check_in" },
      select: { progresoPct: true, payload: true },
    }),
  ])

  const avancePorCheckin = new Map<string, number | null>()
  for (const e of eventosCheckin) {
    const id = (e.payload as { checkInId?: unknown } | null)?.checkInId
    if (typeof id === "string") avancePorCheckin.set(id, aNumero(e.progresoPct))
  }
  const nombreDeuda = new Map(deudas.map((d) => [d.id, d.nombre]))

  const libro = new ExcelJS.Workbook()
  libro.creator = "Coach Financiero"
  libro.created = new Date()

  // ─── Léeme ─────────────────────────────────────────────────────────────
  const leeme = libro.addWorksheet("Léeme")
  leeme.columns = [{ width: 110 }]
  const lineas = [
    "Coach Financiero — exportación de tus datos",
    `Fecha de exportación: ${hoyEnBogota()} (hora de Colombia)`,
    `Moneda: todos los montos están en ${moneda}. Ninguno está convertido de otra moneda.`,
    "",
    "Qué hay en cada hoja:",
    "- Resumen: las cifras de hoy, las mismas que muestra el dashboard.",
    "- Objetivos: tus intenciones, activas y cerradas. La meta en dinero solo existe si la escribiste.",
    "- Deudas: todas, incluidas las ya saldadas. La tasa es efectiva anual (E.A.), en porcentaje; si no la sabías, la app la dedujo de la cuota y el plazo.",
    "- Ingresos y Gastos fijos: lo que entra y sale cada mes, de forma recurrente.",
    "- Ingresos extra y Gastos grandes: movimientos que ocurrieron una sola vez. No se repiten cada mes.",
    "- Check-ins: uno por fila, con lo que pagaste, cómo quedó la deuda y lo que respondió el coach.",
    "- Pagos por check-in: el detalle de cada abono, una fila por deuda y por check-in. Es lo que reportaste; si superaba el saldo, la app aplicó solo el saldo, y el \"Total pagado\" de la hoja Check-ins es lo aplicado.",
    "- Plan actual: el último plan que te dio el coach, paso por paso.",
    "",
    "Cómo leer las cifras:",
    "- Capacidad real = ingresos mensuales − impuestos − gastos fijos. Es tu margen mensual recurrente y puede ser negativa.",
    "- Disponible este mes = capacidad real − gastos grandes de este mes. Solo cambia el mes en curso.",
    "- La proyección de meses para salir de deudas usa la capacidad real, no el disponible del mes: un gasto grande no se repite.",
    "- La proyección simula el método avalancha: primero los pagos mínimos de todas, y el resto a la deuda con la tasa más alta.",
    "- Las cifras del plan son las del día en que se generó; las del Resumen son las de hoy. Pueden no coincidir.",
  ]
  lineas.forEach((texto, i) => {
    const fila = leeme.addRow([texto])
    fila.alignment = { wrapText: true, vertical: "top" }
    if (i === 0) fila.font = { bold: true, size: 14 }
    if (texto.endsWith(":") && !texto.startsWith("-")) fila.font = { bold: true }
  })

  // ─── Resumen ───────────────────────────────────────────────────────────
  const c = dashboard.capacidad
  const resumen = libro.addWorksheet("Resumen", { views: [{ state: "frozen", ySplit: 1 }] })
  resumen.columns = [
    { header: "Concepto", key: "concepto", width: 44 },
    { header: `Valor (${moneda})`, key: "valor", width: 20 },
    { header: "Nota", key: "nota", width: 60 },
  ]
  resumen.getRow(1).font = { bold: true }
  const filasResumen: { concepto: string; valor: number | string | null; nota?: string; monto?: boolean }[] = [
    { concepto: "Ingresos mensuales", valor: c.ingresos, monto: true },
    { concepto: "Impuestos mensuales", valor: c.impuestos, monto: true },
    { concepto: "Gastos fijos de supervivencia", valor: c.supervivencia, monto: true, nota: "Todos los gastos fijos menos impuestos." },
    { concepto: "Capacidad real (margen mensual)", valor: c.capacidadReal, monto: true, nota: "Ingresos − impuestos − gastos fijos." },
    { concepto: "Gastos grandes de este mes", valor: c.gastosPuntualesMes, monto: true },
    { concepto: "Disponible este mes", valor: c.disponibleEsteMes, monto: true, nota: "Capacidad real − gastos grandes de este mes." },
    { concepto: "Deuda total", valor: c.deudaTotal, monto: true, nota: `Suma de ${dashboard.numeroDeudas} deudas activas.` },
    { concepto: "Pagos mínimos mensuales", valor: c.pagosMinimos, monto: true, nota: "Solo de las deudas que tienen mínimo registrado." },
    {
      concepto: "Meses para saldar todo al ritmo actual",
      valor: dashboard.proyeccion.meses,
      nota: dashboard.proyeccion.meses === null ? dashboard.proyeccion.frase : "Simulación por avalancha, con interés.",
    },
    { concepto: "Intención principal", valor: dashboard.intencion },
  ]
  for (const f of filasResumen) {
    const fila = resumen.addRow({ concepto: f.concepto, valor: f.valor ?? "—", nota: f.nota ?? "" })
    if (f.monto) fila.getCell("valor").numFmt = formatoMonto(moneda)
    fila.getCell("nota").alignment = { wrapText: true, vertical: "top" }
  }

  // ─── Objetivos ─────────────────────────────────────────────────────────
  agregarHoja(
    libro,
    "Objetivos",
    [
      { titulo: "Intención", clave: "intencion", ancho: 50 },
      { titulo: "Estado", clave: "estado", ancho: 12 },
      { titulo: `Meta (${moneda})`, clave: "meta", ancho: 16, tipo: "monto" },
      { titulo: `Acumulado (${moneda})`, clave: "acumulado", ancho: 16, tipo: "monto" },
      { titulo: "Avance %", clave: "avance", ancho: 10, tipo: "pct" },
      { titulo: "Creado", clave: "creado", ancho: 12, tipo: "fecha" },
    ],
    objetivos.map((o) => {
      const meta = aNumero(o.montoObjetivo)
      const acumulado = aNumero(o.montoAcumulado) ?? 0
      return {
        intencion: o.intencion,
        estado: etiquetaEstadoObjetivo[o.estado],
        meta,
        acumulado: meta === null ? null : acumulado,
        avance: meta ? Math.min(100, (acumulado / meta) * 100) : null,
        creado: diaBogota(o.createdAt),
      }
    }),
    moneda,
    "Todavía no hay objetivos.",
  )

  // ─── Deudas ────────────────────────────────────────────────────────────
  agregarHoja(
    libro,
    "Deudas",
    [
      { titulo: "Nombre", clave: "nombre", ancho: 28 },
      { titulo: "Tipo", clave: "tipo", ancho: 26 },
      { titulo: "Estado", clave: "estado", ancho: 10 },
      { titulo: `Saldo inicial (${moneda})`, clave: "original", ancho: 18, tipo: "monto" },
      { titulo: `Saldo actual (${moneda})`, clave: "actual", ancho: 18, tipo: "monto" },
      { titulo: `Pagado (${moneda})`, clave: "pagado", ancho: 16, tipo: "monto" },
      { titulo: "Tasa E.A. %", clave: "tasa", ancho: 11, tipo: "pct" },
      { titulo: `Pago mínimo mensual (${moneda})`, clave: "minimo", ancho: 20, tipo: "monto" },
      { titulo: "Registrada", clave: "creada", ancho: 12, tipo: "fecha" },
    ],
    deudas.map((d) => {
      const original = aNumero(d.montoOriginal) ?? 0
      const actual = aNumero(d.montoActual) ?? 0
      return {
        nombre: d.nombre,
        tipo: etiquetasTipoDeuda[d.tipo as TipoDeuda] ?? d.tipo,
        estado: d.estado === "activa" ? "Activa" : "Saldada",
        original,
        actual,
        pagado: Math.max(0, original - actual),
        tasa: aNumero(d.tasaInteres),
        minimo: aNumero(d.pagoMinimo),
        creada: diaBogota(d.createdAt),
      }
    }),
    moneda,
    "No hay deudas registradas.",
  )

  // ─── Ingresos y gastos fijos ───────────────────────────────────────────
  agregarHoja(
    libro,
    "Ingresos",
    [
      { titulo: "Categoría", clave: "categoria", ancho: 26 },
      { titulo: "Descripción", clave: "descripcion", ancho: 40 },
      { titulo: `Monto mensual (${moneda})`, clave: "monto", ancho: 20, tipo: "monto" },
    ],
    ingresos.map((i) => ({
      categoria: etiquetasCategoriaIngreso[i.categoria],
      descripcion: i.descripcion ?? "",
      monto: aNumero(i.montoMensual),
    })),
    moneda,
    "No hay ingresos registrados.",
  )

  agregarHoja(
    libro,
    "Gastos fijos",
    [
      { titulo: "Categoría", clave: "categoria", ancho: 26 },
      { titulo: "Descripción", clave: "descripcion", ancho: 40 },
      { titulo: `Monto mensual (${moneda})`, clave: "monto", ancho: 20, tipo: "monto" },
    ],
    egresos.map((e) => ({
      categoria: etiquetasCategoriaEgreso[e.categoria],
      descripcion: e.descripcion ?? "",
      monto: aNumero(e.montoMensual),
    })),
    moneda,
    "No hay gastos fijos registrados.",
  )

  // ─── Movimientos puntuales ─────────────────────────────────────────────
  const columnasPuntuales: Columna[] = [
    { titulo: "Fecha", clave: "fecha", ancho: 12, tipo: "fecha" },
    { titulo: "Descripción", clave: "descripcion", ancho: 44 },
    { titulo: `Monto (${moneda})`, clave: "monto", ancho: 18, tipo: "monto" },
  ]
  // Las columnas `@db.Date` ya vienen a medianoche UTC: van tal cual.
  agregarHoja(
    libro,
    "Ingresos extra",
    columnasPuntuales,
    ingresosExtra.map((i) => ({ fecha: i.fecha, descripcion: i.descripcion, monto: aNumero(i.monto) })),
    moneda,
    "No hay ingresos extra registrados.",
  )
  agregarHoja(
    libro,
    "Gastos grandes",
    columnasPuntuales,
    egresosExtra.map((e) => ({ fecha: e.fecha, descripcion: e.descripcion, monto: aNumero(e.monto) })),
    moneda,
    "No hay gastos grandes registrados.",
  )

  // ─── Check-ins ─────────────────────────────────────────────────────────
  agregarHoja(
    libro,
    "Check-ins",
    [
      { titulo: "Fecha", clave: "fecha", ancho: 12, tipo: "fecha" },
      { titulo: `Total pagado (${moneda})`, clave: "pagado", ancho: 18, tipo: "monto" },
      { titulo: `Deuda total después (${moneda})`, clave: "deuda", ancho: 22, tipo: "monto" },
      { titulo: "Avance intención principal %", clave: "avance", ancho: 16, tipo: "pct" },
      { titulo: "Deudas nuevas", clave: "nuevas", ancho: 10 },
      { titulo: "Ingresos extra", clave: "extras", ancho: 10 },
      { titulo: "Respuesta del coach", clave: "respuesta", ancho: 80 },
    ],
    checkins.map((ci) => {
      const snapshot = (ci.snapshot ?? {}) as SnapshotGuardado
      return {
        fecha: diaBogota(ci.createdAt),
        pagado: numeroSeguro(snapshot.totalPagado),
        deuda: numeroSeguro(snapshot.capacidad?.deudaTotal),
        avance: avancePorCheckin.get(ci.id) ?? null,
        nuevas: Array.isArray(ci.nuevasDeudas) ? ci.nuevasDeudas.length : 0,
        extras: Array.isArray(ci.ingresosExtra) ? ci.ingresosExtra.length : 0,
        respuesta: ci.respuestaIa ?? "",
      }
    }),
    moneda,
    "Todavía no hay check-ins.",
  )

  agregarHoja(
    libro,
    "Pagos por check-in",
    [
      { titulo: "Fecha del check-in", clave: "fecha", ancho: 14, tipo: "fecha" },
      { titulo: "Deuda", clave: "deuda", ancho: 32 },
      { titulo: `Monto reportado (${moneda})`, clave: "monto", ancho: 20, tipo: "monto" },
    ],
    checkins.flatMap((ci) => {
      const pagos = Array.isArray(ci.pagosRealizados) ? (ci.pagosRealizados as PagoGuardado[]) : []
      return pagos.map((p) => ({
        fecha: diaBogota(ci.createdAt),
        // Una deuda borrada después sigue en el historial del check-in.
        deuda:
          (typeof p.deudaId === "string" && nombreDeuda.get(p.deudaId)) || "Deuda eliminada",
        monto: numeroSeguro(p.monto),
      }))
    }),
    moneda,
    "Todavía no hay pagos reportados en check-ins.",
  )

  // ─── Plan actual ───────────────────────────────────────────────────────
  const plan = dashboard.plan
  agregarHoja(
    libro,
    "Plan actual",
    [
      { titulo: "Orden", clave: "orden", ancho: 8 },
      { titulo: "Qué hacer", clave: "accion", ancho: 60 },
      { titulo: "Por qué", clave: "porque", ancho: 70 },
    ],
    plan
      ? [
          { orden: 1, accion: plan.siguientePaso.accion, porque: plan.siguientePaso.porque },
          ...plan.pasos.map((p, i) => ({ orden: i + 2, accion: p.accion, porque: p.porque })),
          ...(plan.alerta ? [{ orden: "Alerta", accion: plan.alerta, porque: "" }] : []),
          { orden: "Mensaje", accion: plan.mensaje.titulo, porque: plan.mensaje.cuerpo },
          {
            orden: "Generado",
            accion: dashboard.planGeneradoEn ? hoyEnBogota(dashboard.planGeneradoEn) : "",
            porque:
              plan.origen === "ia"
                ? "Lo escribió el coach con IA."
                : "Lo calculó la app sin IA, porque el proveedor no respondió.",
          },
        ]
      : [],
    moneda,
    "Todavía no hay un plan generado.",
  )

  return libro
}
