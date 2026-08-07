# Plan de Ejecución — Coach Financiero IA (debs_coach)

## Contexto

Se cuenta con la **ETR completa** (`ESPECIFICACION_TECNICA.md`) y el **andamiaje base del proyecto** ya creado:

- Next.js 16 + React 19 + TypeScript + Tailwind 4 inicializados
- Prisma 7 con `schema.prisma` validado (10 modelos, 8 enums)
- Dependencias instaladas: `@prisma/client`, `openai`, `resend`, `recharts`, `jose`, `zod`, `node-cron`, primitives de Radix UI
- Capa `lib/` creada con stubs: `db/prisma.ts`, `auth/session.ts`, `ia/motor.ts + prompts.ts`, `email/resend.ts`
- Estructura completa de carpetas (rutas y APIs vacías esperando implementación)
- `.env.example` y `.env` creados (pendientes valores reales)

### Capa visual — mockup de validación (2026-07-30)

Existe además un **MVP visual completo y navegable**, portado desde el repo privado `SebastianGiraldo99/coach-financiero` (prototipo generado con v0 a partir de `DIRECTRICES_DISENO.md`).

> ⚠️ **Este código es un mockup de prueba, no la implementación final.** No tiene backend, ni validación real, ni persistencia: renderiza datos falsos desde `lib/mock/` y los formularios no guardan nada. **Pero el diseño que expresa sí es la base sobre la que se debe trabajar de aquí en adelante** — no se rehace, se conecta.

Qué entró (49 archivos, ~2.900 líneas): las 14 pantallas de la ETR, `components/ui|forms|layout|dashboard|graficas|estados|checkin`, `lib/utils.ts`, `lib/formato.ts` y `lib/mock/`. Cero dependencias nuevas. `npm run lint` y `npm run build` pasan.

Cómo usarlo en los sprints siguientes:

- **`lib/mock/` es el contrato.** Sus objetos replican los campos y enums de `schema.prisma`, así que conectar cada pantalla es sustituir el import por la consulta real, no reescribir la vista.
- **Los formularios ya están maquetados** con estado local de React; falta añadirles Zod, server actions y manejo de errores. Cada handler tiene un `// TODO: conectar API`.
- **`app/(dashboard)/estilo/`** es una página de desarrollo con la paleta y todos los componentes. Se elimina antes de producción.
- **Los tokens de `app/globals.css` son la única fuente de color y tipografía.** Ningún componente lleva hexadecimales; mantener esa regla.
- **`/dashboard?estado=vacio|cargando|error`** renderiza los estados de sistema para revisarlos sin provocarlos.

Pendientes conocidos de esta capa (ver también `DIRECTRICES_DISENO.md` §22):

1. `/checkin` es un formulario de un solo campo, **no** el flujo de 3 pasos que exige RF-029 (pagos, deudas nuevas, ingresos extra). Hay que rehacerlo en el Sprint 5.
2. El dashboard rotula la intención como `Trabajando en: "..."`; `DIRECTRICES_DISENO.md` §6.1 pide `Tu intención: "..."` con saludo. Falta decidir cuál gana y alinear código y documento.
3. `proyeccion-plegable.tsx` importa Recharts estáticamente: la librería entra en el chunk del dashboard aunque las gráficas nunca se rendericen. Candidato a `next/dynamic` al optimizar.
4. Sin verificar en navegador: ausencia de scroll horizontal a 375px, longitud de línea a 1280px y recorrido completo con teclado.

Durante el port se corrigieron dos errores de tipos preexistentes que impedían compilar: `SessionPayload` ahora extiende `JWTPayload` en `lib/auth/session.ts`, y se eliminó el import inexistente de `Decimal` en `lib/ia/prompts.ts`.

### Multi-moneda — preparado, sin activar (2026-07-30)

El schema y la capa de formato ya soportan **COP y USD**; el MVP sale **sin tasas de cambio**. Se hizo ahora porque `prisma/` aún no tiene migraciones: agregar la columna `moneda` después obligaría a adivinar, para cada monto histórico, si era pesos o dólares — un dato irrecuperable.

Ya está hecho:
- `enum Moneda { COP, USD }` y campo `moneda` en `Deuda`, `Ingreso`, `Egreso`, `IngresoExtra`; `Usuario.monedaBase`; `tasaCopUsada` en `CheckIn` y `Evento`; tabla `TasaCambio` (creada, **sin uso** hasta que se integre la fuente).
- `lib/formato.ts` recibe la moneda en todas sus funciones (default `COP`) y `CampoMoneda` acepta `moneda`, con prefijo, decimales, `inputMode` y separadores correctos por moneda.
- La bienvenida del onboarding pregunta la moneda base.

**Regla del MVP: no se mezclan monedas.** Sin tasa no se puede sumar un ingreso en USD con una deuda en COP, así que todos los montos de un usuario comparten su `monedaBase`. El schema ya permite la mezcla; solo falta la conversión.

Pendiente para la actualización posterior:
1. Elegir la fuente de tasas — se recomienda la **TRM** de la Superfinanciera, no una API genérica de FX (la mid-market no coincide con lo que el usuario ve en su banco). Cachear una vez al día con `node-cron`.
2. Poblar `TasaCambio` y activar la conversión en `lib/formato.ts`, congelando `tasaCopUsada` en cada snapshot.
3. Añadir `moneda` y un indicador de **exposición cambiaria** al contexto JSON del Motor IA (RF-036): quien gana en COP y debe en USD carga riesgo de devaluación, y el plan debería tenerlo en cuenta.
4. **La prosa que genera la IA lleva el símbolo de moneda incrustado en el texto** (`"Abona $ 850.000 a la tarjeta Visa"`). Formatear en el front no basta: hay que instruir al modelo en `lib/ia/prompts.ts` para que redacte en la moneda del usuario.

**Decisiones confirmadas:**
- Scope = **Desarrollo + deployment + scripts utilitarios** (backup, seed, logs)
- Hashing de contraseñas = **argon2**
- Admin inicial = **Prisma seed script**

El plan se organiza en 8 sprints alineados al roadmap de 15 días del ETR.

---

## Sprint 0 — Fundaciones (Día 1)

Cierra el setup técnico antes de empezar a codear features.

> **Ya resuelto por el mockup visual:** las tareas 2, 3 y la parte de maquetado/metadata de la 5. `lib/utils.ts` existe, `components/ui/` tiene los 6 componentes base más `textarea`, `badge`, `campo` y `campo-moneda`, y `app/layout.tsx` ya lleva `title: "Coach Financiero"`. De la tarea 5 queda pendiente **solo la lógica de redirección por sesión**.

**Tareas:**
1. Instalar dependencias faltantes: `argon2`, `tsx` (para correr scripts TS).
2. ~~Crear `lib/utils.ts` con helper `cn()`~~ — hecho.
3. ~~Componentes base en `components/ui/`~~ — hecho (ver nota arriba).
4. Crear `middleware.ts` en la raíz con la lógica de redirección por rol/estado:
   - Sin sesión → `/login`
   - Sesión + estado `pendiente` o `bloqueado` → `/login?error=acceso`
   - Sesión + rol `usuario` sin objetivos → `/onboarding`
   - Sesión + rol `admin` → permite `/admin`, redirige `/` a `/admin`
5. Reemplazar `app/page.tsx` y `app/layout.tsx` por una landing simple que redirige a `/login` o al dashboard según sesión. Ajustar metadata: `title: "Coach Financiero"`.
6. Crear `prisma/seed.ts` que lee `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env`, hashea con argon2 y crea el admin con `estado=activo`, `rol=admin`. Configurar `prisma.config.ts` con `migrations.seed`.
7. Crear DB en el VPS: `createdb coach_financiero`, completar `DATABASE_URL` en `.env`, correr `npx prisma migrate dev --name init`, luego `npx prisma db seed`.
8. Smoke test: `npm run dev` arranca sin errores, redirige correctamente, login del admin funciona contra DB.

**Archivos creados/modificados:**
- `lib/utils.ts`, `middleware.ts`, `prisma/seed.ts`, `prisma.config.ts`
- `app/page.tsx`, `app/layout.tsx`
- `components/ui/{button,input,label,card,dialog,select}.tsx`
- `.env` (con valores reales del usuario)

---

## Sprint 1 — Autenticación, Invitaciones y Panel Admin (Días 2-4)

Implementa todo el módulo de acceso (RF-001 a RF-007, HU-001, HU-006).

**Tareas:**
1. **API auth:**
   - `POST /api/auth/login` → valida credenciales con argon2, verifica `estado=activo`, crea sesión JWT, actualiza `ultimo_acceso`.
   - `POST /api/auth/logout` → destruye cookie.
   - `POST /api/auth/register` → recibe `token` + datos; valida invitación vigente, crea usuario con `estado=pendiente`, marca invitación `usado`, notifica al admin.
2. **Páginas auth:**
   - `app/(auth)/login/page.tsx` → form email + password.
   - `app/(auth)/register/page.tsx` → recibe `?token=`, valida server-side y muestra form de registro.
3. **API admin** (todas protegidas por middleware que valida `rol=admin`):
   - `POST /api/admin/invitaciones` → genera token único (32 bytes hex), expira en 48h, envía email via Resend.
   - `GET /api/admin/usuarios` → lista todos los usuarios con su estado y `ultimo_acceso`.
   - `PATCH /api/admin/usuarios/[id]` → aprobar / bloquear / desbloquear.
4. **Página admin:**
   - `app/(admin)/admin/page.tsx` → tabla de usuarios con filas: nombre, email, estado, último acceso, acciones (aprobar/bloquear). Modal para enviar nueva invitación.
5. **Plantillas email** (en `emails/`): `Invitacion.tsx`, `Aprobacion.tsx`, `NotificacionAdmin.tsx`. Conectar con `lib/email/resend.ts`.
6. **Validación con zod** para todos los inputs de API.

**Verificación:** flujo completo admin invita → email llega → registro → admin aprueba → usuario hace login.

**Archivos creados:**
- `app/api/auth/{login,logout,register}/route.ts`
- `app/api/admin/invitaciones/route.ts`, `app/api/admin/usuarios/route.ts`, `app/api/admin/usuarios/[id]/route.ts`
- `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`
- `app/(admin)/admin/page.tsx`
- `emails/{Invitacion,Aprobacion,NotificacionAdmin}.tsx`
- `lib/auth/password.ts` (wrapper de argon2 hash/verify)

---

## Sprint 2 — Onboarding (Días 5-6)

Implementa el flujo de primera carga (RF-008 a RF-013, HU-002).

**Tareas:**
1. **Página onboarding multi-paso:**
   - `app/onboarding/page.tsx` con estado por pasos (1: intención, 2: deudas, 3: ingresos, 4: egresos, 5: generando plan).
2. **Componentes de formulario** en `components/forms/`:
   - `FormIntencion.tsx`, `FormDeudas.tsx` (lista dinámica), `FormIngresos.tsx`, `FormEgresos.tsx`.
3. **API CRUD básicas** (cada una valida `usuarioId` del JWT, nunca acepta `usuarioId` del cliente):
   - `POST /api/objetivos` → crea objetivo con `editable_desde = now + 30d`, genera evento.
   - `POST /api/deudas` → crea deuda, genera evento.
   - `POST /api/ingresos` → crea ingreso.
   - `POST /api/egresos` → crea egreso.
4. **Helper `lib/finanzas/capacidad.ts`:** función `calcularCapacidadReal(usuarioId)` que retorna `Σ ingresos − Σ egresos − (impuestos mensuales)`.
5. Al completar paso 4, redirige a `/onboarding?step=plan` que llama internamente al Motor IA (Sprint 3) y luego a `/dashboard`.

**Verificación:** un usuario aprobado entra, completa 4 pasos, los datos quedan persistidos en DB con `usuario_id` correcto.

**Archivos creados:**
- `app/onboarding/page.tsx`
- `components/forms/{FormIntencion,FormDeudas,FormIngresos,FormEgresos}.tsx`
- `app/api/objetivos/route.ts`, `app/api/deudas/route.ts`, `app/api/ingresos/route.ts`, `app/api/egresos/route.ts`
- `lib/finanzas/capacidad.ts`

---

## Sprint 3 — Motor IA (Días 7-8)

Conecta el cerebro de la app (RF-034 a RF-038).

**Tareas:**
1. **Mejorar `lib/ia/motor.ts`:** agregar timeout de 45s, retry simple (1 reintento), logging de errores con contexto (sin loguear contenido financiero sensible más allá de lo necesario).
2. **Validación de respuesta IA con zod:** crear `lib/ia/schema.ts` con el shape esperado del JSON (`mensaje_motivacional`, `plan_pagos[]`, `proyeccion_meses_libertad`, `mejoras_sugeridas[]`, `alerta`). Si no valida, generar mensaje fallback genérico y loguear el response crudo.
3. **API `POST /api/ia/generar-plan`** (interna, no expuesta como chat):
   - Recibe `{ trigger, ingresoExtraId? }` — nunca recibe texto libre del usuario.
   - Construye `ContextoFinanciero` desde DB (intención + objetivos activos + deudas + capacidad real + últimos 5 eventos).
   - Llama al Motor IA, valida, guarda en `PlanIa` + `Evento` (tipo `plan_generado`).
   - Retorna el plan al cliente.
4. **Modo dev (mock):** si `OPENAI_API_KEY` está vacía, retornar un plan stub determinista para testing local sin gastar tokens.

**Verificación:** llamar al endpoint con un usuario que tiene datos genera un plan persistido + evento. Cortar la API key → el mock retorna plan válido. Devolver JSON malformado simulado → fallback se activa y loguea.

**Archivos creados/modificados:**
- `lib/ia/motor.ts` (mejorado), `lib/ia/schema.ts` (nuevo), `lib/ia/mock.ts` (nuevo)
- `app/api/ia/generar-plan/route.ts`

---

## Sprint 4 — Dashboard e Ingresos Extra (Días 9-11)

Vista principal del usuario (RF-014 a RF-021, HU-004).

**Tareas:**
1. **`app/(dashboard)/dashboard/page.tsx`** (server component):
   - Carga datos del usuario: último plan, eventos recientes, capacidad real, totales.
   - Renderiza componentes hijos.
2. **Componentes en `components/dashboard/`:**
   - `ResumenFinanciero.tsx` → tarjetas con intención activa, "Dinero disponible para deudas", total deudas, meses para libertad.
   - `PlanIA.tsx` → muestra `mensaje_motivacional`, lista `plan_pagos`, alertas, `mejoras_sugeridas`.
   - `GraficaProgreso.tsx` → Recharts: línea temporal de progreso (% por check-in), barra de deuda actual vs original.
   - `BotonIngresoExtra.tsx` → abre modal con `FormIngresoExtra`.
3. **`components/forms/FormIngresoExtra.tsx`** (modal): monto + descripción + fecha.
4. **API `POST /api/ingresos/extra`:** persiste registro, crea evento `ingreso_extra`, dispara recálculo (`/api/ia/generar-plan` con `trigger=ingreso_extra`), retorna nuevo plan al cliente para refrescar UI.
5. **Página deudas/ingresos** (`(dashboard)/deudas/page.tsx`, `(dashboard)/ingresos/page.tsx`): permiten editar datos base sin disparar check-in. Solo CRUD con eventos `ingreso_actualizado` / `deuda_pagada` cuando aplique.

**Verificación:** un usuario con plan generado ve gráficas, agrega ingreso extra y observa el plan actualizado en pantalla en < 30 s.

**Archivos creados:**
- `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/deudas/page.tsx`, `app/(dashboard)/ingresos/page.tsx`
- `app/api/ingresos/extra/route.ts`
- `components/dashboard/{ResumenFinanciero,PlanIA,GraficaProgreso,BotonIngresoExtra}.tsx`
- `components/forms/FormIngresoExtra.tsx`

---

## Sprint 5 — Check-in Quincenal y Cron (Días 12-13)

Cierra el loop motivacional (RF-028 a RF-033, HU-003).

**Tareas:**
1. **Página `app/(dashboard)/checkin/page.tsx`** con componente `FlujoChekin.tsx` (multi-step):
   - Paso 1: lista deudas activas → marca cuáles pagó y montos.
   - Paso 2: ¿abriste nuevas deudas? → reusa `FormDeudas`.
   - Paso 3: ¿ingresos extra? → reusa `FormIngresoExtra`.
   - Paso 4: loader mientras IA recalibra → muestra plan + mensaje motivacional.
2. **API `POST /api/checkin`:**
   - Persiste `CheckIn` con snapshot del estado.
   - Actualiza deudas (resta pagos, marca `saldada` si llega a 0 → evento `deuda_pagada`).
   - Crea nuevos `IngresoExtra` si aplica.
   - Calcula `progreso_pct` por objetivo (heurística: `1 − (deuda_actual / deuda_original)` o similar para objetivos de saldo de deuda).
   - Llama Motor IA con `trigger=check_in`.
   - Crea evento `check_in` con `progreso_pct`.
3. **Cron quincenal con node-cron:**
   - Crear `lib/cron/scheduler.ts` con job que corre cada día a las 9am y para cada usuario `activo` revisa si pasaron ≥ 15 días desde el último `check_in`, envía email.
   - Inicializar el scheduler en `instrumentation.ts` (hook oficial de Next.js para tareas de arranque del servidor).
4. **Plantilla `emails/RecordatorioCheckin.tsx`** ya delineada en `lib/email/resend.ts`.

**Verificación:** simular paso del tiempo (alterar `created_at` del último check-in a 16 días atrás), trigger manual del job → email enviado. Hacer check-in completo → plan se recalibra con tono motivacional.

**Archivos creados:**
- `app/(dashboard)/checkin/page.tsx`
- `components/checkin/FlujoChekin.tsx`
- `app/api/checkin/route.ts`
- `lib/cron/scheduler.ts`, `instrumentation.ts`
- `emails/RecordatorioCheckin.tsx`

---

## Sprint 6 — Gestión de Objetivos (Día 14)

Permite manejar hasta 3 intenciones (RF-022 a RF-027, HU-005).

**Tareas:**
1. **Página `app/(dashboard)/objetivos/page.tsx`:**
   - Lista objetivos activos con tarjeta por cada uno: intención, días restantes para edición.
   - Botón "+ Agregar objetivo" deshabilitado si ya hay 3.
   - Modal para crear/editar (editar solo si `now >= editable_desde`).
   - Botón "Marcar como logrado" → cierra objetivo, propone uno nuevo.
2. **API endpoints adicionales sobre `/api/objetivos`:**
   - `PATCH /api/objetivos/[id]` → solo si `now >= editable_desde`; actualiza `editable_desde = now + 30d`.
   - `POST /api/objetivos/[id]/logrado` → marca `estado=logrado`, crea evento `objetivo_logrado`, dispara recálculo IA.
   - Validación de máximo 3 activos por usuario.
3. **Integración con dashboard:** mostrar el objetivo más antiguo / principal como intención activa.

**Verificación:** crear objetivo → no se puede editar antes de 30 días → forzar fecha → editable. Marcar logrado → app propone nuevo. Intentar agregar el 4to → bloqueado.

**Archivos creados/modificados:**
- `app/(dashboard)/objetivos/page.tsx`
- `app/api/objetivos/[id]/route.ts`, `app/api/objetivos/[id]/logrado/route.ts`

---

## Sprint 7 — Sesión completa y contenedor (Día 15)

Dos cosas que el plan original daba por hechas y no lo estaban: la mitad
revocable de la sesión y un despliegue que se parezca al VPS real.

**Tareas de sesión (RNF-002):**
1. Modelo `Sesion` + migración: token hasheado, familia, vencimiento, marcas de rotación y revocación.
2. `lib/auth/refresco.ts`: emitir, rotar con detección de reutilización, revocar familia, limpiar vencidas.
3. Conectarlo en `proxy.ts` (páginas) y en `exigirUsuario()` (API, que el proxy no cubre). Login emite, logout revoca, bloquear un usuario revoca.
4. Limpieza diaria de sesiones vencidas dentro del planificador que ya existe.

**Tareas de contenedor:**
1. `output: "standalone"` en `next.config.ts`.
2. `Dockerfile` en tres etapas —dependencias, constructor, ejecución— sobre Debian slim, con usuario sin privilegios.
3. `compose.yaml`: servicio `migraciones` que corre `prisma migrate deploy` y termina, y servicio `app` que solo arranca si aquel salió bien. Publica en `127.0.0.1:3000`, una sola réplica, logs rotados.
4. `.dockerignore` que excluya `.env` antes que nada.
5. `GET /api/salud` para la sonda del contenedor, sin tocar la base.
6. `deployment/nginx.conf.example` con HSTS y cabeceras de seguridad (RNF-003).
7. Scripts de operación: `backup-db.sh` y `restore-db.sh` contra el contenedor de Postgres, y `limpiar-invitaciones.mts`.
8. `docs/OPERACIONES.md`: primer despliegue, actualización, logs, respaldos, tareas periódicas.

**Nota importante:** este sprint sustituye el despliegue con PM2 y PostgreSQL
en el host que describía la versión anterior de este documento. El VPS ya corre
todo en contenedores y la base es el `shared_postgres` que ya existe; no se
instala PostgreSQL ni se toca `pg_hba.conf`.

**Archivos creados:**
- `Dockerfile`, `compose.yaml`, `.dockerignore`, `deployment/nginx.conf.example`
- `prisma/migrations/*_sesiones_refresh/`, `lib/auth/refresco.ts`, `app/api/salud/route.ts`
- `scripts/{backup-db.sh,restore-db.sh,limpiar-invitaciones.mts}`, `docs/OPERACIONES.md`

---

## Sprint 8 — QA y puesta en producción (Día 16+)

**Tareas QA:**
1. Recorrido manual del checklist de "Criterios de Aceptación del Proyecto" del ETR (son 10 ítems, no 16 como decía este documento).
2. Pruebas de seguridad IDOR: con usuario A logueado, intentar manipular ids ajenos en `/api/deudas/[id]`, `/api/ingresos/[id]` y `/api/objetivos/[id]`. Verificar 404.
3. Verificar responsive en 375px, 768px, 1280px — incluidas la barra fija de móvil (§6.7) y la pantalla de objetivos, que son lo único que nadie ha visto en navegador.
4. Verificar que el admin nunca puede listar datos financieros (solo metadatos de usuarios).
5. Verificar el ciclo de sesión en navegador: cerrar sesión, volver a los 25 h y comprobar que entra sin re-autenticarse.

**Puesta en producción:**
1. Instalar Docker y git en el VPS si faltaran; clonar en `/opt/coach`.
2. Crear usuario y base dentro de `shared_postgres`, y el `.env` de producción.
3. `docker compose up -d --build` y `docker compose run --rm migraciones npx prisma db seed`.
4. Nginx + certbot con la plantilla versionada.
5. Cron del host para el respaldo diario.
6. Smoke test desde un navegador externo y primera invitación real.

Todo el detalle está en `docs/OPERACIONES.md`; aquí solo queda el orden.

---

## Archivos Críticos Existentes a Reutilizar

| Archivo | Contiene |
|---|---|
| `prisma/schema.prisma` | 10 modelos + 8 enums validados — no rehacer |
| `lib/db/prisma.ts` | Singleton de Prisma Client — usar en todas las APIs |
| `lib/auth/session.ts` | `crearSession`, `obtenerSession`, `eliminarSession` con JWT (jose) |
| `lib/ia/motor.ts` | `generarPlan(ctx)` — ya integrado con OpenAI SDK |
| `lib/ia/prompts.ts` | `construirPrompt(ctx)` con system + user — extender, no rehacer |
| `lib/email/resend.ts` | `enviarInvitacion`, `enviarAprobacion`, `enviarRecordatorioCheckin` |
| `.env.example` | Plantilla de todas las variables — agregar `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| `ESPECIFICACION_TECNICA.md` | Fuente de verdad de RF/RNF/criterios de aceptación |

---

## Verificación End-to-End

El MVP se valida ejecutando este script manual completo en orden:

1. `npm run dev` arranca sin errores.
2. Visitar `/` redirige a `/login`. Loguearse como admin (seed).
3. Desde `/admin`: invitar un email → revisar bandeja → click en link → registrarse.
4. Volver como admin → aprobar al nuevo usuario → recibir email de aprobación.
5. Loguearse como usuario nuevo → completa onboarding en < 10 min → ver dashboard con plan IA.
6. Agregar ingreso extra → plan se recalcula en pantalla.
7. Crear segundo objetivo → intentar editarlo → bloqueado por 30 días.
8. Simular fecha de check-in (UPDATE manual en DB) → trigger cron → email llega.
9. Hacer check-in → ver mensaje motivacional + plan recalibrado.
10. Como admin: bloquear usuario → usuario no puede loguearse.
11. Auditoría IDOR: con `curl` desde una sesión de usuario A, atacar endpoints intentando acceder a datos de usuario B → todas las respuestas 403/404.
12. Probar build de prod: `npm run build && npm start` localmente sin errores.
13. Deploy al VPS siguiendo `docs/OPERACIONES.md` → repetir checklist 1-10 contra `https://tudominio.com`.
14. Validar backup automático: día siguiente revisar `/var/backups/coach/` tiene el dump.
