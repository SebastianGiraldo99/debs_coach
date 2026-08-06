import { NextResponse } from "next/server"

import { exigirUsuario } from "@/lib/auth/api"
import { esquemaCheckin } from "@/lib/checkins/esquema"
import { calcularAvances, progresoPrincipal } from "@/lib/checkins/progreso"
import { prisma } from "@/lib/db/prisma"
import type { TipoDeuda } from "@/lib/finanzas/etiquetas"
import { generarYGuardarPlan } from "@/lib/ia/servicio"

/**
 * POST /api/checkin — el check-in quincenal (RF-029 a RF-032).
 *
 * El orden no es negociable y es el mismo que en el ingreso extra: **primero
 * se persiste lo que la persona reportó, después se llama al modelo**. Al
 * revés, un fallo del proveedor borraría los pagos que acaba de anotar, que es
 * lo único que la app no puede reconstruir sola. Por eso responde 200 aunque
 * el plan falle, y el cliente distingue por `planActualizado`.
 *
 * Todo lo que llega con id —deudas, objetivos— se consulta filtrando además
 * por el `usuarioId` de la sesión: los ids son adivinables y sin ese filtro se
 * podría abonar a la deuda de otra persona.
 */

/** Tope de la primera transacción. Son muchas escrituras pequeñas, no lentas. */
const TIMEOUT_TX = 15_000

function aNumero(valor: { toString(): string } | null): number {
  return valor === null ? 0 : Number(valor.toString())
}

export async function POST(request: Request) {
  const guardia = await exigirUsuario()
  if (!guardia.ok) return guardia.respuesta

  if (!guardia.usuario.onboardingCompletadoEn) {
    return NextResponse.json(
      { ok: false, mensaje: "Primero termina tu registro." },
      { status: 409 },
    )
  }

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ ok: false, mensaje: "No pudimos leer los datos." }, { status: 400 })
  }

  const datos = esquemaCheckin.safeParse(cuerpo)
  if (!datos.success) {
    return NextResponse.json(
      { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa los datos del check-in." },
      { status: 400 },
    )
  }

  const usuarioId = guardia.usuario.id
  const moneda = guardia.usuario.monedaBase
  const { pagos, nuevasDeudas, ingresosExtra, aportes } = datos.data

  const checkin = await prisma.$transaction(
    async (tx) => {
      // ─── Pagos a deudas ────────────────────────────────────────────────
      // Se releen de la base con el usuarioId de sesión: el monto que se resta
      // sale del saldo guardado, nunca de un saldo que mande el cliente.
      const deudas = await tx.deuda.findMany({
        where: { id: { in: pagos.map((p) => p.deudaId) }, usuarioId, estado: "activa" },
        select: { id: true, nombre: true, montoActual: true, montoOriginal: true },
      })
      const porId = new Map(deudas.map((d) => [d.id, d]))

      let totalPagado = 0
      for (const pago of pagos) {
        const deuda = porId.get(pago.deudaId)
        // Una deuda ajena, ya saldada o borrada mientras llenaba el formulario
        // simplemente no se toca. No es un error que merezca tumbar el
        // check-in entero y hacerle repetir todo lo demás.
        if (!deuda) continue

        const saldoAnterior = aNumero(deuda.montoActual)
        // El abono no puede dejar el saldo en negativo: pagar de más es
        // saldar, no generar un saldo a favor que la app no sabe representar.
        const abono = Math.min(pago.monto, saldoAnterior)
        const saldoNuevo = saldoAnterior - abono
        totalPagado += abono

        await tx.deuda.update({
          where: { id: deuda.id },
          data: { montoActual: saldoNuevo, ...(saldoNuevo <= 0 && { estado: "saldada" }) },
        })

        if (saldoNuevo <= 0) {
          await tx.evento.create({
            data: {
              usuarioId,
              tipo: "deuda_pagada",
              payload: {
                deudaId: deuda.id,
                nombre: deuda.nombre,
                montoOriginal: aNumero(deuda.montoOriginal),
              },
            },
          })
        }
      }

      // ─── Deudas nuevas (RF-030) ────────────────────────────────────────
      for (const d of nuevasDeudas) {
        const creada = await tx.deuda.create({
          data: {
            usuarioId,
            nombre: d.nombre,
            tipo: d.tipo as TipoDeuda,
            montoOriginal: d.saldo,
            montoActual: d.saldo,
            moneda,
            tasaInteres: d.tasaEA ?? null,
            pagoMinimo: d.pagoMinimo ?? null,
          },
          select: { id: true },
        })
        await tx.evento.create({
          data: {
            usuarioId,
            tipo: "deuda_nueva",
            payload: { deudaId: creada.id, nombre: d.nombre, monto: d.saldo, origen: "check_in" },
          },
        })
      }

      // ─── Ingresos extraordinarios ──────────────────────────────────────
      for (const i of ingresosExtra) {
        const creado = await tx.ingresoExtra.create({
          data: {
            usuarioId,
            monto: i.monto,
            moneda,
            descripcion: i.descripcion,
            // Sin la Z, una fecha "2026-08-04" se leería en la zona del
            // servidor y en Colombia el día se guardaría corrido.
            fecha: new Date(`${i.fecha}T00:00:00Z`),
          },
          select: { id: true },
        })
        await tx.evento.create({
          data: {
            usuarioId,
            tipo: "ingreso_extra",
            payload: {
              ingresoExtraId: creado.id,
              monto: i.monto,
              descripcion: i.descripcion,
              origen: "check_in",
            },
          },
        })
      }

      // ─── Aportes a las metas con monto ─────────────────────────────────
      // El filtro por usuarioId va en el updateMany, no en un findFirst
      // previo: así la comprobación y la escritura son la misma operación y
      // no hay ventana entre ellas.
      for (const aporte of aportes) {
        await tx.objetivo.updateMany({
          where: {
            id: aporte.objetivoId,
            usuarioId,
            estado: "activo",
            montoObjetivo: { not: null },
          },
          data: { montoAcumulado: { increment: aporte.monto } },
        })
      }

      // ─── Foto del después ──────────────────────────────────────────────
      const [capacidad, objetivos, deudasTodas] = await Promise.all([
        // No se puede usar `calcularCapacidadReal` aquí: consulta con el
        // cliente de fuera de la transacción y no vería nada de lo anterior.
        (async () => {
          const [ingresos, egresos, activas] = await Promise.all([
            tx.ingreso.findMany({ where: { usuarioId }, select: { montoMensual: true } }),
            tx.egreso.findMany({
              where: { usuarioId },
              select: { categoria: true, montoMensual: true },
            }),
            tx.deuda.findMany({
              where: { usuarioId, estado: "activa" },
              select: { montoActual: true, pagoMinimo: true },
            }),
          ])
          let impuestos = 0
          let supervivencia = 0
          for (const e of egresos) {
            const monto = aNumero(e.montoMensual)
            if (e.categoria === "impuestos") impuestos += monto
            else supervivencia += monto
          }
          const totalIngresos = ingresos.reduce((s, i) => s + aNumero(i.montoMensual), 0)
          return {
            ingresos: totalIngresos,
            impuestos,
            supervivencia,
            capacidadReal: totalIngresos - impuestos - supervivencia,
            deudaTotal: activas.reduce((s, d) => s + aNumero(d.montoActual), 0),
            pagosMinimos: activas.reduce((s, d) => s + aNumero(d.pagoMinimo), 0),
          }
        })(),
        tx.objetivo.findMany({
          where: { usuarioId, estado: "activo" },
          orderBy: { createdAt: "asc" },
          select: { id: true, intencion: true, montoObjetivo: true, montoAcumulado: true },
        }),
        // El original incluye las saldadas: si no, saldar una deuda BAJARÍA el
        // porcentaje de avance, que es exactamente al revés de lo que pasó.
        tx.deuda.findMany({ where: { usuarioId }, select: { montoOriginal: true } }),
      ])

      const avances = calcularAvances(
        objetivos.map((o) => ({
          id: o.id,
          intencion: o.intencion,
          montoObjetivo: o.montoObjetivo === null ? null : aNumero(o.montoObjetivo),
          montoAcumulado: aNumero(o.montoAcumulado),
        })),
        {
          total: capacidad.deudaTotal,
          original: deudasTodas.reduce((s, d) => s + aNumero(d.montoOriginal), 0),
        },
      )
      const progreso = progresoPrincipal(avances)

      const creado = await tx.checkIn.create({
        data: {
          usuarioId,
          pagosRealizados: pagos,
          nuevasDeudas,
          ingresosExtra,
          snapshot: { moneda, capacidad, avances, totalPagado },
        },
        select: { id: true },
      })

      await tx.evento.create({
        data: {
          usuarioId,
          tipo: "check_in",
          progresoPct: progreso,
          // El contrato que ya consume el historial del dashboard.
          // Ver lib/checkins/historial.ts.
          payload: { checkInId: creado.id, pagado: totalPagado, deudaTotal: capacidad.deudaTotal },
        },
      })

      return { id: creado.id, totalPagado, progreso, avances }
    },
    { timeout: TIMEOUT_TX },
  )

  // El motor va fuera de la transacción: tarda hasta 45 s y mantener una
  // transacción abierta ese tiempo bloquearía filas sin ninguna necesidad.
  const resultado = await generarYGuardarPlan(usuarioId, "check_in")

  if (resultado.ok) {
    await prisma.checkIn.update({
      where: { id: checkin.id },
      data: {
        respuestaIa: resultado.plan.mensaje.cuerpo,
        planGenerado: resultado.plan,
      },
    })
  }

  return NextResponse.json({
    ok: true,
    checkInId: checkin.id,
    planActualizado: resultado.ok,
    progresoPct: checkin.progreso,
    plan: resultado.ok ? resultado.plan : null,
    mensaje: resultado.ok ? undefined : resultado.mensaje,
  })
}
