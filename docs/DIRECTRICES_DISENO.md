# Directrices de Diseño — Coach Financiero IA

> Documento de referencia visual y de interacción. La **Parte I** es un encargo autocontenido: un agente puede leerla y construir el MVP visual sin funcionalidad. La **Parte II** es el sistema de diseño que sostiene ese MVP y todo el desarrollo posterior.

**Documentos hermanos:** [`ESPECIFICACION_TECNICA.md`](ESPECIFICACION_TECNICA.md) (qué hace la app) · [`plan.md`](plan.md) (en qué orden se construye) · Este documento (cómo se ve y se siente).

---

# PARTE I — Encargo: MVP visual sin funcionalidad

## 1. Objetivo del encargo

Construir un **prototipo navegable de toda la interfaz** de Coach Financiero IA, con datos falsos y sin ninguna lógica de negocio, para validar la dirección de diseño antes de escribir features reales.

El resultado debe permitir a una persona recorrer la app completa en el navegador —login, onboarding, dashboard, objetivos, check-in, admin— y opinar sobre el diseño. Nada persiste, nada se calcula, nada se envía.

## 2. Reglas obligatorias antes de escribir código

1. **Este proyecto usa Next.js 16.2.6 + React 19.2 + Tailwind CSS 4.** Las APIs y convenciones difieren de versiones anteriores. Lee las guías relevantes en `node_modules/next/dist/docs/01-app/` **antes** de escribir cualquier componente o ruta, y respeta los avisos de deprecación. No asumas conocimiento previo de Next.js.
2. **No toques** `prisma/`, `lib/db/`, `lib/auth/`, `lib/ia/`, `lib/email/`, `.env`, ni `app/api/`. El MVP visual no los necesita.
3. **No instales dependencias nuevas.** Todo lo necesario ya está en `package.json`: `lucide-react` (íconos), `recharts` (gráficas), primitives de Radix (`dialog`, `select`, `label`, `dropdown-menu`, `slot`), `clsx` + `tailwind-merge` (helper `cn`), `class-variance-authority`.
4. **shadcn/ui se construye a mano**, no con el CLI. Los primitives ya están instalados; escribe los componentes en `components/ui/` usando los tokens de la Parte II, no los colores por defecto de shadcn.
5. Todo el texto visible al usuario va en **español**. Nombres de archivos, variables y tipos en español también, consistentes con el schema de Prisma (`deudas`, `ingresos`, `objetivos`, `checkin`).

## 3. Alcance — qué SÍ y qué NO

| SÍ incluye | NO incluye |
|---|---|
| Todas las pantallas maquetadas y navegables por link | Base de datos, Prisma, migraciones |
| Datos falsos importados desde `lib/mock/` | API routes, server actions que escriban |
| Formularios completos, con validación visual simulada | Validación real con Zod, persistencia |
| Estados vacío / cargando / error, como variantes visibles | Autenticación, sesiones, middleware, roles |
| Componentes base en `components/ui/` | Llamadas a OpenAI o a Resend |
| Las 2 gráficas, plegadas por defecto | Cron, emails, cálculos financieros reales |
| Responsive 375px y 1280px | Modo oscuro (ver §9) |

**Comportamiento de los formularios en el MVP:** al enviar, no guardan nada — navegan al siguiente paso o cierran el diálogo. Deja un `// TODO: conectar API` en el handler. Los campos sí deben ser interactivos (escribir, seleccionar, agregar/quitar filas), con estado local de React.

## 4. Entregables — archivos exactos

### 4.1 Fundaciones

| Archivo | Contenido |
|---|---|
| `app/globals.css` | Reemplazar completo por los tokens de §11 |
| `app/layout.tsx` | Metadata `title: "Coach Financiero"`, `lang="es"`, fuente Geist Sans, `bg-paper text-ink` |
| `lib/utils.ts` | Helper `cn()` = `twMerge(clsx(...))` |
| `lib/formato.ts` | `formatearMoneda()`, `formatearFecha()`, `formatearMeses()` — ver §14 |

### 4.2 Componentes base — `components/ui/`

`button.tsx` · `input.tsx` · `label.tsx` · `card.tsx` · `dialog.tsx` · `select.tsx` · `textarea.tsx` · `badge.tsx` · `campo.tsx` (label + ayuda + input + error, ver §15.2) · `campo-moneda.tsx` (ver §15.3)

### 4.3 Componentes de dominio

| Ruta | Componente |
|---|---|
| `components/layout/` | `nav-principal.tsx`, `encabezado-pagina.tsx` |
| `components/forms/` | `paso-formulario.tsx` (contenedor multi-paso), `lista-repetible.tsx`, `fila-deuda.tsx`, `fila-ingreso.tsx`, `fila-egreso.tsx` |
| `components/dashboard/` | `siguiente-paso.tsx`, `cifras-clave.tsx`, `plan-accion.tsx`, `historial-checkins.tsx`, `dialogo-ingreso-extra.tsx`, `proyeccion-plegable.tsx` |
| `components/gastos/` | `dialogo-gasto-fijo.tsx`, `dialogo-gasto-grande.tsx` (Sprint 9) |
| `components/graficas/` | `grafica-deuda-tiempo.tsx`, `grafica-progreso.tsx` |
| `components/estados/` | `estado-vacio.tsx`, `estado-cargando.tsx`, `estado-error.tsx` |

### 4.4 Pantallas

| Ruta de archivo | URL | Qué muestra |
|---|---|---|
| `app/page.tsx` | `/` | Landing mínima: nombre, una frase, botón "Entrar" → `/login` |
| `app/(auth)/login/page.tsx` | `/login` | Email + contraseña |
| `app/(auth)/register/page.tsx` | `/register` | Nombre, email, contraseña, confirmación |
| `app/onboarding/page.tsx` | `/onboarding` | Bienvenida + botón "Empezar" → `/onboarding/intencion` |
| `app/onboarding/intencion/page.tsx` | Paso 1 de 4 | Textarea de intención libre + ejemplos |
| `app/onboarding/deudas/page.tsx` | Paso 2 de 4 | Lista repetible de deudas |
| `app/onboarding/ingresos/page.tsx` | Paso 3 de 4 | Lista repetible de ingresos |
| `app/onboarding/egresos/page.tsx` | Paso 4 de 4 | Lista repetible de egresos fijos |
| `app/(dashboard)/dashboard/page.tsx` | `/dashboard` | **La pantalla central — ver §6** |
| `app/(dashboard)/objetivos/page.tsx` | `/objetivos` | Hasta 3 intenciones, con días para poder editar |
| `app/(dashboard)/deudas/page.tsx` | `/deudas` | Tabla/lista editable de deudas |
| `app/(dashboard)/ingresos/page.tsx` | `/ingresos` | Ingresos fijos + historial de extras |
| `app/(dashboard)/gastos/page.tsx` | `/gastos` | Gastos fijos editables + gastos grandes puntuales (Sprint 9) |
| `app/(dashboard)/checkin/page.tsx` | `/checkin` | Flujo de 3 pasos + pantalla de resultado |
| `app/(admin)/admin/page.tsx` | `/admin` | Lista de usuarios: estado, último acceso, acciones |

Las carpetas de rutas ya existen vacías. Los grupos `(auth)`, `(dashboard)`, `(admin)` llevan su propio `layout.tsx`: `(dashboard)` y `(admin)` con navegación persistente; `(auth)` centrado sin navegación.

### 4.5 Datos falsos — `lib/mock/`

Un archivo por dominio (`usuario.ts`, `objetivos.ts`, `deudas.ts`, `ingresos.ts`, `egresos.ts`, `plan.ts`, `checkins.ts`, `usuarios-admin.ts`), exportando objetos tipados cuyos **campos y enums coinciden con `prisma/schema.prisma`** (`tipo: "tarjeta_credito"`, `categoria: "salario"`, `estado: "activo"`, etc.). Así conectar la API real después es sustituir el import, no reescribir la vista.

Que los datos sean **creíbles y en pesos colombianos**: una persona con ~$4.800.000 de ingreso mensual, tres deudas (una tarjeta de crédito de $8.200.000 al 32% E.A., un crédito de vehículo, una deuda con un familiar), egresos fijos de ~$3.100.000, y un plan de la IA con 4 pasos concretos. Nada de "Deuda 1: $1.000".

### 4.6 Página de referencia visual

`app/estilo/page.tsx` — una página de desarrollo que muestra la paleta, la escala tipográfica, todos los componentes en todos sus estados, y los tres estados de sistema. Sirve para revisar el sistema completo de un vistazo. Se elimina antes de producción.

**Ya se eliminó** (Sprint 8, antes del despliegue). Esta sección queda como registro de para qué existió: si hiciera falta revisar el sistema completo de un vistazo otra vez, se recrea desde el historial de git y se vuelve a borrar. No debe existir en producción.

## 5. Cómo llenar cada pantalla con contenido falso

- **Onboarding:** cada paso arranca con 1 fila vacía; el botón "Agregar otra" añade filas al estado local.
- **Dashboard, objetivos, deudas, ingresos, admin:** renderizan directamente desde `lib/mock/`.
- **Check-in:** flujo de 3 pasos que termina en una pantalla de resultado con el mensaje motivacional falso ya escrito en `lib/mock/plan.ts`.
- **Estados vacío/cargando/error:** además de la página `/estilo` (ya eliminada, §4.6), deja cada uno alcanzable con un query param (`/dashboard?estado=vacio`, `?estado=cargando`, `?estado=error`) para poder revisarlos.

## 6. La pantalla que define el proyecto — el dashboard

Esta es la pantalla que hay que hacer bien. El resto del sistema existe para sostenerla.

**El principio:** el usuario abre la app para saber **qué hacer ahora**, no para contemplar sus datos. La respuesta a esa pregunta ocupa el mejor lugar de la pantalla; todo lo demás está subordinado.

Orden vertical exacto, sin excepciones:

1. **Saludo + intención activa.** Una línea. La intención va **entrecomillada y en las palabras del propio usuario**: `Tu intención: "Quiero saldar mis deudas lo más rápido posible"`. Sin tarjeta, sin ícono, sin fondo de color — texto sobre el fondo de la página.

2. **Tu siguiente paso.** El elemento más prominente de la pantalla. Una sola acción, tomada del plan de la IA, escrita como instrucción concreta con monto y fecha:
   > **Abona $850.000 a la tarjeta Visa antes del 15 de agosto.**
   > Es la deuda más cara que tienes (32% anual). Cada mes que la mantienes te cuesta $218.000.

   Tarjeta con borde y fondo `surface`, un poco más de padding que las demás. Sin ícono grande, sin gradiente, sin botón de acción (no hay nada que la app pueda hacer por él aquí).

3. **Tres cifras. Exactamente tres.** En una fila (móvil: una columna). Etiqueta pequeña arriba, cifra grande con `tabular-nums` debajo, y una línea de contexto en prosa:
   - `Disponible este mes` · $1.700.000 · *después de deudas y gastos fijos*
   - `Deuda total` · $14.600.000 · *bajó $1.200.000 desde tu último check-in*
   - `Faltan` · 11 meses · *para saldar todo, al ritmo actual*

   Sin íconos, sin flechas de tendencia, sin porcentajes de colores, sin sparklines. La tercera línea en prosa hace el trabajo que la gente cree que hacen las flechitas.

4. **Tu plan.** Los pasos restantes del plan de la IA como **lista numerada de texto**, no como tarjetas. Cada paso: una línea en negrita con la acción, una línea normal con el porqué. Máximo 5 pasos.

5. **Ver la proyección** — un `<details>`/disclosure **cerrado por defecto**, rotulado `Ver proyección de tu deuda ↓`. Al abrirlo aparecen las dos gráficas de §17. Cerrado es el estado normal: si el usuario nunca lo abre, la app funcionó como debe.

6. **Tus check-ins.** Lista compacta de texto, últimos 4, formato `12 jul · Pagaste $780.000 · Avance 34%`. Prosa, no gráfica. Link "Ver todos" al final.

7. **Registrar ingreso extra** — botón secundario, siempre visible. En móvil, fijo al fondo de la pantalla. Abre el diálogo de §16 (RF-018).

**Qué NO va en el dashboard:** una fila de 4-6 tarjetas de KPI · gráfica de dona de gastos por categoría · barras de progreso decorativas · el saludo con el nombre en tipografía enorme · íconos de colores en círculos · tarjetas con sombra flotante · contadores animados · confeti al lograr una meta.

## 7. Checklist de aceptación

Antes de reportar el encargo como terminado, verifica cada punto:

- [ ] `npm run build` termina sin errores ni warnings de TypeScript o ESLint.
- [ ] `npm run dev` levanta y las 14 URLs de §4.4 cargan sin error de runtime.
- [ ] Se puede recorrer el flujo completo por links: `/` → `/login` → `/onboarding` → 4 pasos → `/dashboard` → `/checkin` → resultado → `/dashboard`.
- [ ] En `/dashboard`, **ninguna gráfica es visible al cargar**. Solo aparecen tras abrir el disclosure.
- [ ] En `/dashboard` hay **exactamente tres** cifras grandes por encima del pliegue.
- [ ] Cada pantalla tiene **un solo** botón primario.
- [ ] A 375px de ancho no hay scroll horizontal en ninguna pantalla y ningún texto queda cortado.
- [ ] A 1280px ninguna columna de texto supera los ~70 caracteres por línea.
- [ ] Todos los inputs tienen `<label>` asociado; ningún placeholder actúa como etiqueta.
- [ ] Todos los montos usan `formatearMoneda()` y `tabular-nums`; ninguno aparece como `1700000`.
- [ ] Ningún color hexadecimal aparece dentro de un componente — todo sale de los tokens de Tailwind.
- [ ] Cero emojis en la interfaz.
- [ ] Cero gradientes, cero `backdrop-blur`, cero sombras mayores a `shadow-card`.
- [x] La página `/estilo` muestra la paleta, la tipografía y todos los componentes. *(Cumplido en la maqueta; la página se eliminó antes de producción — §4.6.)*
- [ ] Navegación completa con teclado: foco visible en todo elemento interactivo, orden de tabulación lógico.

## 8. Qué reportar al terminar

Un resumen corto con: pantallas construidas, decisiones de diseño que tomaste donde el documento no era explícito, puntos donde el documento se contradice con lo que la ETR pide, y capturas o la ruta para ver el resultado. Si algo del documento no funcionó en la práctica, dilo — este documento es un borrador que se corrige con lo aprendido en el prototipo.

---

# PARTE II — Sistema de diseño

## 9. Los cinco principios

**1. La acción antes que el dato.** Cada pantalla responde primero "¿qué hago?" y solo después "¿cómo voy?". Un número sin una acción asociada es ruido.

**2. La prosa gana a la gráfica.** "Bajó $1.200.000 desde tu último check-in" comunica más rápido y más claro que una flecha verde con `-7,6%`. Las gráficas son opcionales y están plegadas; el texto no.

**3. Calma, no urgencia.** El usuario llega con ansiedad sobre su dinero. Sin rojos de alarma, sin badges de "¡Atención!", sin cuentas regresivas parpadeantes. La deuda se muestra en terracota, no en rojo de error.

**4. Un formulario es una conversación.** Una pregunta a la vez, en lenguaje humano, en una sola columna. El usuario pasará más tiempo llenando formularios que mirando el dashboard: es ahí donde se gana o se pierde.

**5. Reconocible, no genérico.** Fondo de papel cálido, verde petróleo, tipografía sobria, casi sin sombras. Si la pantalla podría ser el dashboard de cualquier SaaS, está mal.

## 10. La lista de "nunca"

Estas prohibiciones existen para evitar el aspecto de plantilla genérica de IA. No hay excepciones sin acuerdo explícito.

- Gradientes de cualquier tipo, en especial violeta→azul.
- Glassmorphism, `backdrop-blur`, transparencias sobre imágenes.
- Sombras difusas o de colores. Solo `shadow-card` (1px, casi imperceptible).
- Emojis en la interfaz. Los íconos vienen de `lucide-react`.
- Íconos de colores dentro de círculos o cuadrados con fondo tintado.
- Muros de KPIs: más de tres cifras grandes juntas.
- Gráficas de dona o pastel, en cualquier lugar.
- Sparklines decorativas dentro de tarjetas.
- Números que se animan al aparecer; barras que crecen al cargar.
- Confeti, medallas, insignias, rachas, o cualquier gamificación.
- Más de un color de acento por pantalla.
- Tarjeta dentro de tarjeta.
- Texto sobre imagen de fondo.
- Modo oscuro a medias. (El MVP es solo claro; los tokens están listos para agregarlo bien, después.)
- Íconos como única forma de identificar una acción destructiva — siempre con texto o `aria-label`.

## 11. Tokens — `app/globals.css`

Reemplaza el archivo completo por esto. Es la única fuente de verdad de color, tipografía, radio y sombra.

```css
@import "tailwindcss";

@theme {
  /* ── Neutros cálidos (papel y tinta) ───────────────────────── */
  --color-paper:       #FBF9F6;  /* fondo de página */
  --color-surface:     #FFFFFF;  /* tarjetas, inputs */
  --color-surface-alt: #F4F1EB;  /* filas alternas, fondos sutiles */
  --color-ink:         #1A1815;  /* texto principal */
  --color-ink-soft:    #5B554E;  /* texto secundario */
  --color-ink-mute:    #8A8279;  /* etiquetas, texto terciario */
  --color-line:        #E7E2DA;  /* bordes */
  --color-line-strong: #D4CCC0;  /* bordes de input, separadores fuertes */

  /* ── Primario: verde petróleo ──────────────────────────────── */
  --color-primary:       #0E4F4B;
  --color-primary-hover: #0A3E3B;
  --color-primary-soft:  #E3EFED;  /* solo fondos */
  --color-on-primary:    #FBF9F6;

  /* ── Semánticos financieros ────────────────────────────────── */
  --color-deuda:        #A6462F;  /* terracota — deuda, saldos negativos */
  --color-deuda-soft:   #F7E9E4;
  --color-avance:       #3F6B4A;  /* salvia — progreso, disponible */
  --color-avance-soft:  #E7EFE8;
  --color-atencion:     #8A5A0B;  /* ámbar oscuro — avisos (texto) */
  --color-atencion-mid: #B47A16;  /* ámbar — solo íconos y bordes */
  --color-atencion-soft:#FAF0DC;

  /* ── Tipografía ────────────────────────────────────────────── */
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;

  --text-cifra:   2.5rem;   --text-cifra--line-height:   1.1;
  --text-titulo:  1.75rem;  --text-titulo--line-height:  1.2;
  --text-seccion: 1.25rem;  --text-seccion--line-height: 1.4;
  --text-cuerpo:  1rem;     --text-cuerpo--line-height:  1.625;
  --text-menor:   0.875rem; --text-menor--line-height:   1.43;
  --text-micro:   0.75rem;  --text-micro--line-height:   1.33;

  /* ── Radios ────────────────────────────────────────────────── */
  --radius-campo: 8px;
  --radius-card:  12px;

  /* ── Sombra: una sola, casi invisible ──────────────────────── */
  --shadow-card: 0 1px 2px rgb(26 24 21 / 0.05);
}

@layer base {
  body {
    background-color: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: var(--text-cuerpo);
    line-height: var(--text-cuerpo--line-height);
    -webkit-font-smoothing: antialiased;
  }

  /* Foco visible y consistente en toda la app */
  :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
}
```

Esto genera las utilidades `bg-paper`, `text-ink-soft`, `border-line`, `text-cifra`, `rounded-card`, `shadow-card`, etc. **Ningún componente debe contener un hexadecimal.**

**Contraste — reglas que no se rompen:**
- `text-atencion-mid` (#B47A16) **no** se usa para texto: no alcanza 4.5:1. Para texto de aviso usa `text-atencion` (#8A5A0B).
- `text-ink-mute` es el gris más claro permitido para texto, y solo en tamaño `menor` o mayor.
- Los tokens `-soft` son exclusivamente fondos. Nunca texto.

## 12. Tipografía

Geist Sans (ya cargada por `next/font` en el layout) para todo. Geist Mono no se usa.

| Rol | Token | Peso | Uso |
|---|---|---|---|
| Cifra | `text-cifra` | 600 | Las tres cifras del dashboard. `tabular-nums`. Máximo 3 por pantalla |
| Título | `text-titulo` | 600 | Un solo `<h1>` por pantalla |
| Sección | `text-seccion` | 600 | `<h2>`, títulos de tarjeta, título de paso |
| Cuerpo | `text-cuerpo` | 400 | Todo el texto corrido y todos los inputs |
| Menor | `text-menor` | 500 | Etiquetas de campo, texto de ayuda, celdas de tabla |
| Micro | `text-micro` | 500 | Etiquetas de cifra, metadatos. `uppercase tracking-wide` solo aquí |

Reglas: los inputs siempre a 16px (`text-cuerpo`) — por debajo, iOS hace zoom al enfocarlos. El texto corrido no supera ~70 caracteres por línea (`max-w-[65ch]`). Nunca texto centrado en párrafos de más de dos líneas. **Todos los montos llevan `tabular-nums`** para que las columnas de números se alineen.

## 13. Espaciado, layout y navegación

Escala de 4px: usa `1, 2, 3, 4, 6, 8, 12, 16` de Tailwind (4 a 64px). Nada intermedio.

- Ancho de contenido: `max-w-3xl` (768px) en dashboard y listas; `max-w-xl` (576px) en formularios.
- Padding de página: `px-4 py-6` en móvil, `px-8 py-10` en desktop.
- Padding de tarjeta: `p-5`; la tarjeta de "Tu siguiente paso" lleva `p-6`.
- Separación entre secciones del dashboard: `space-y-8`.
- Separación entre campos de un formulario: `space-y-5`.

**Navegación:** barra superior en desktop con el nombre de la app a la izquierda y los enlaces `Inicio · Objetivos · Deudas · Ingresos · Check-in` más el menú de usuario a la derecha. El enlace activo se marca con `text-ink` + borde inferior de 2px `border-primary`; los inactivos en `text-ink-soft`.

Por debajo de `md` (768px) esos enlaces pasan a un **menú de hamburguesa**: la barra queda con el nombre de la app y el botón, y el panel se despliega debajo con los enlaces en vertical y "Salir" al final. En vertical el marcador de activo va a la **izquierda** —un borde inferior a todo el ancho se lee como separador de lista, no como "estás aquí"—.

> **Corrección de la versión anterior.** Esto decía "una fila de enlaces con scroll horizontal — **no** un menú hamburguesa". Se probó en navegador y se cambió: en un teléfono no hay ninguna señal de que haya más enlaces a la derecha, así que media navegación quedaba escondida detrás de un gesto que nadie adivina. Lo que **sigue descartado** es la **tab bar inferior**: ahí abajo vive el botón fijo de "Registrar ingreso extra" (§6.7) y competirían por el mismo pulgar.

`/admin` tiene su propia barra, sin los enlaces de usuario: el admin no ve datos financieros de nadie (RNF-006).

## 14. Formato de datos — `lib/formato.ts`

**Confirmado (2026-07-30):** la app opera en **pesos colombianos** (`es-CO`). El COP es la **moneda canónica**: es la única en la que se guardan montos.

### Multi-moneda

Hay que distinguir dos cosas que suenan igual:

- **Moneda de denominación** — un hecho. Una deuda de 2.000 USD *es* de 2.000 USD; su valor en pesos flota. Guardarla convertida a COP pierde información de forma irreversible: al mes siguiente la tasa cambió, el usuario abonó, y el saldo calculado ya no corresponde a la deuda real. En una app de coaching eso significa decirle "vas bien" a alguien a quien la devaluación le está comiendo el avance.
- **Moneda de presentación** — cosmética. "Quiero ver todo en dólares." Reversible y sin pérdida.

**Modelo adoptado: denominación por registro, COP como moneda funcional de cálculo, tasa congelada en cada snapshot.**

- Cada monto se guarda en **su** moneda, con el campo `moneda` en la fila. **Nunca se reescribe convertido.**
- Los cálculos que necesiten sumar monedas distintas se hacen convirtiendo a COP; se convierte al calcular y al mostrar, jamás al escribir.
- Los **snapshots** (`CheckIn`, `Evento`) guardan la tasa usada en `tasaCopUsada`. Sin eso, un check-in de hace tres meses muestra cifras distintas cada vez que se abre y el historial parece inestable sin que nada haya cambiado.
- El **Motor IA recibe la moneda** junto con cada monto (RF-036), más un indicador de **exposición cambiaria**. Quien gana en COP y debe en USD carga un riesgo real: su deuda crece sin que gaste un peso. Un coach que lo ignora da consejos peligrosos.

**Regla del MVP: sin tasas de cambio, no se mezclan monedas.** El usuario elige su `monedaBase` al empezar el onboarding y todos sus montos quedan denominados en ella. Es la única regla coherente sin conversión — no se puede sumar un ingreso en dólares con una deuda en pesos sin una tasa. La mezcla llega con la integración de tasas, y el schema ya está listo para permitirla sin migración.

**Para la fuente de tasas (pendiente):** en Colombia la referencia es la **TRM** de la Superfinanciera — pública, diaria, gratuita, y es la que los usuarios reconocen como "la" tasa. Una API genérica da mid-market, que no coincide con lo que ven en su banco. Cachear una vez al día en `TasaCambio` (ya hay `node-cron`); nunca llamarla durante un render.

Todas las funciones de `lib/formato.ts` reciben la moneda como segundo argumento, con `"COP"` por defecto:

- `formatearMoneda(1700000)` → `$ 1.700.000`. Sin decimales, nunca. Separador de miles con punto.
- `formatearMoneda(1800.5, "USD")` → `US$ 1,800.00`. Prefijo `US$` y no `$`, para que ambas monedas se distingan de un vistazo cuando convivan; 2 decimales y separadores `en-US`.
- En prosa, redondea: "unos $1,7 millones", no "$1.700.000,00".
- `formatearFecha(d)` → `15 de agosto`; con año solo si es otro año. En listas compactas, `12 jul`.
- `formatearMeses(11)` → `11 meses`; `formatearMeses(1)` → `1 mes`; ≥24 → `2 años y 3 meses`.
- Porcentajes sin decimales: `34%`.
- Tasas de interés siempre con su unidad explícita: `32% E.A.`

## 15. Formularios

Esta es la mitad de la app. RF-008 a RF-012, RF-019, RF-029.

### 15.1 Reglas generales

- **Una sola columna. Siempre.** Sin excepciones para campos "cortos".
- **Etiqueta arriba del campo, siempre visible.** El placeholder nunca hace de etiqueta.
- El **texto de ayuda va entre la etiqueta y el campo**, no debajo: se lee antes de responder, no después de equivocarse.
- El **placeholder solo muestra formato de ejemplo**: `Ej: 8.200.000`.
- Los campos opcionales se marcan `(opcional)` en la etiqueta, en `text-ink-mute`. **Nunca** se marcan los obligatorios con asterisco.
- Altura mínima de control táctil: 44px.
- **Un solo botón primario por pantalla.** "Atrás"/"Cancelar" son `ghost` y van a la izquierda.
- El botón dice lo que hace: `Continuar`, `Guardar deuda`, `Registrar ingreso`. Nunca `Enviar` ni `OK`.
- Validación **al salir del campo (blur) y al enviar**. Nunca mientras se escribe — regañar a alguien a mitad de palabra es hostil.
- Los `<select>` (tipo de deuda, categoría) usan las etiquetas humanas de los enums: `tarjeta_credito` → "Tarjeta de crédito", `colegiaturas` → "Colegios y universidad".

### 15.2 Anatomía de un campo — `components/ui/campo.tsx`

```
Monto de la deuda                       ← Label, text-menor 500, text-ink
Lo que debes hoy, no lo que pediste     ← Ayuda, text-menor, text-ink-mute
┌──────────────────────────────────┐
│ $  8.200.000                     │    ← Input, text-cuerpo, h-11,
└──────────────────────────────────┘      border-line-strong, rounded-campo,
Escribe cuánto debes                    ← Error, text-menor, text-deuda
```

Estados del input: reposo `border-line-strong` · foco `outline` de 2px `primary` (del `:focus-visible` global) · error `border-deuda` + mensaje · deshabilitado `bg-surface-alt text-ink-mute`, sin cursor de prohibido.

**Mensajes de error en lenguaje humano y en segunda persona:** "Escribe cuánto debes", "Ese correo no parece válido", "Las contraseñas no coinciden". Jamás "Campo requerido", "Input inválido" ni un mensaje de Zod crudo.

### 15.3 Campos de dinero — `components/ui/campo-moneda.tsx`

El control más usado de la app. Debe ser impecable:

- Prefijo `$` fijo dentro del campo, a la izquierda, en `text-ink-mute`, no seleccionable.
- `inputMode="numeric"` para que el móvil abra el teclado numérico.
- El usuario escribe dígitos sin formato; al salir del campo (blur) el valor se muestra con separadores de miles.
- Acepta que peguen `$1.200.000` o `1200000` — se limpia todo lo que no sea dígito.
- Sin decimales. Sin flechas de incremento (`appearance-none`).
- Alineación a la izquierda en formularios; a la derecha solo en columnas de tabla.

### 15.4 Listas repetibles — `components/forms/lista-repetible.tsx`

Para deudas, ingresos y egresos (varios registros del mismo tipo):

- Cada registro es una **fila con borde**, no una tarjeta con sombra.
- Al final, un botón `ghost` con ícono `Plus`: `+ Agregar otra deuda`.
- Cada fila tiene un botón de eliminar, ícono `X` solo, con `aria-label="Eliminar esta deuda"`, en `text-ink-mute`, que pasa a `text-deuda` al hover.
- Eliminar **no pide confirmación** durante el onboarding (nada se ha guardado); sí la pide en las pantallas de edición.
- Si la lista está vacía: una línea de texto, no un ilustración. "Todavía no agregaste ninguna deuda."
- El total de la lista se muestra al pie, alineado a la derecha, en `text-seccion tabular-nums`: `Total: $14.600.000`.

### 15.5 Flujos multi-paso (onboarding y check-in)

- Indicador de progreso en texto: `Paso 2 de 4` en `text-micro uppercase text-ink-mute`, más una barra de 2px de alto (`bg-line`, tramo cumplido en `bg-primary`). **No** un stepper de círculos numerados con conectores.
- Un `<h1>` por paso, redactado como pregunta: *"¿Qué deudas tienes hoy?"*
- Debajo, una o dos líneas explicando por qué se pregunta: *"Con esto la IA sabe cuál conviene atacar primero. Puedes editarlas cuando quieras."*
- Botonera fija al fondo en móvil (`sticky bottom-0`, fondo `paper`, borde superior): `Atrás` (ghost) a la izquierda, `Continuar` (primary) a la derecha.
- El paso 1 del onboarding (la intención) lleva un `<textarea>` de 4 líneas y **tres ejemplos clicables** que la rellenan: *"Quiero saldar mis deudas lo más rápido posible"*, *"Quiero ahorrar para la cuota inicial de un apartamento"*, *"Quiero dejar de vivir al día"*. La intención es el corazón del producto (RF-037): merece la pantalla más cuidada de todo el flujo.

## 16. Diálogo "Registrar ingreso extra"

Radix Dialog. Tres campos: monto (`campo-moneda`), descripción (input), fecha (input `date`, por defecto hoy). Botón primario `Registrar ingreso`.

Ancho `max-w-md`, mismo padding que una tarjeta. Overlay `bg-ink/20` — **sin blur**. En móvil se ancla al fondo de la pantalla en lugar de centrarse. Cierra con `Esc` y con clic fuera; el foco vuelve al botón que lo abrió.

En la app real, al enviarlo se recalcula el plan (RF-020) y hay una espera de hasta 30 segundos (RNF-008): el diálogo se queda abierto mostrando el estado de carga de §18. En el MVP visual, simplemente cierra.

## 17. Gráficas

**Existen exactamente dos gráficas en toda la aplicación, y ambas viven plegadas dentro del disclosure del dashboard.** Ninguna otra pantalla lleva gráficas. Ninguna se muestra sin que el usuario la pida (§6.5).

1. **Deuda vs. tiempo** — línea. Eje X: meses. Eje Y: deuda total. Una sola serie en `--color-deuda`.
2. **Progreso acumulado** — barras verticales, una por check-in, en `--color-avance`.

Configuración de Recharts, obligatoria en ambas:

- Sin `CartesianGrid` vertical; la horizontal en `--color-line`, `strokeDasharray="3 3"`.
- Sin `Legend` cuando hay una sola serie (siempre es el caso).
- Máximo 4 marcas en el eje Y, con `formatearMoneda` abreviado (`$14,6M`).
- Sin puntos en la línea (`dot={false}`), grosor 2px.
- Tooltip de fondo `surface`, borde `line`, sombra `shadow-card`, texto plano: `Marzo · $12.400.000`.
- Sin animación de entrada (`isAnimationActive={false}`).
- `ResponsiveContainer` con alto fijo de 220px.
- Debajo de cada gráfica, **una frase en prosa que dice lo mismo** — para quien no lee gráficas y para lectores de pantalla: *"Si mantienes el ritmo, tu deuda llega a cero en septiembre del próximo año."*

Si más adelante alguien pide una tercera gráfica, la respuesta por defecto es una tabla o una frase.

## 18. Estados de sistema

**Vacío.** Una línea que explica y un botón que resuelve. Sin ilustración, sin ícono grande.
> Todavía no tienes objetivos. *[Definir mi primera intención]*

**Cargando.** Dos formas y solo dos:
- Navegación entre páginas: bloques `bg-surface-alt` con `animate-pulse` que respetan la forma real del contenido. Sin spinners.
- Espera de la IA (hasta 30s, RNF-008): mensaje explícito con lo que está pasando, porque 30 segundos en silencio se sienten como un error.
  > **Estamos armando tu plan.** Puede tomar hasta medio minuto — estamos revisando tus deudas, tus ingresos y tu intención para darte pasos concretos.

  Barra indeterminada de 2px en `bg-primary`. Nunca un porcentaje falso.

**Error.** Qué pasó, en lenguaje humano, y qué puede hacer. Nunca el mensaje técnico (RNF de gestión de errores IA).
> **No pudimos generar tu plan.** Tus datos están guardados. Intenta de nuevo en un momento. *[Reintentar]*

Fondo `bg-atencion-soft`, borde `border-atencion-mid`, texto `text-atencion`. **Rojo nunca**: se reserva para deuda, que es un dato, no una falla.

## 19. Tono de voz

Tuteo. Segunda persona. Frases cortas. Español neutro con vocabulario colombiano donde la ETR ya lo usa (arriendo, colegiaturas, recibos, mercado).

| En vez de | Escribe |
|---|---|
| "Ingrese el monto de la obligación financiera" | "¿Cuánto debes?" |
| "Su capacidad de pago mensual es de $1.700.000" | "Te quedan $1.700.000 al mes para tus objetivos" |
| "Optimización de la amortización de pasivos" | "Cuál deuda conviene pagar primero" |
| "No ha completado su check-in" | "Hace 16 días que no nos vemos. ¿Cómo te fue?" |
| "Error: transacción fallida" | "No pudimos guardar tu deuda. Intenta otra vez." |

**Nunca regañes.** El check-in genera un mensaje positivo con al menos una mejora sugerida sin importar el resultado (RF-031). Si el usuario no cumplió, el tono es "esto pasa, ajustemos el plan", nunca "no cumpliste tu meta". Si logró algo, se dice con sobriedad: *"Bajaste $1.200.000 de deuda este mes."* — sin signos de exclamación, sin "¡Increíble!".

Sin jerga financiera sin explicar. Si aparece "tasa efectiva anual", va seguida de qué significa en pesos: *"32% E.A. — cada mes que mantienes ese saldo te cuesta $218.000."*

## 20. Accesibilidad

Objetivo: WCAG 2.1 AA.

- Contraste de texto ≥ 4.5:1 (los tokens de §11 lo cumplen si se respetan las restricciones de uso).
- Toda la app navegable con teclado; foco visible mediante el `:focus-visible` global. Nunca `outline: none`.
- Todo `<input>` con `<label htmlFor>`. Los errores se asocian con `aria-describedby` y `aria-invalid`.
- Los diálogos atrapan el foco y lo devuelven al cerrar (Radix lo hace; no lo deshabilites).
- Los botones de solo ícono llevan `aria-label`.
- El color nunca es el único portador de información: la deuda dice "Deuda", no solo se pinta de terracota.
- `lang="es"` en `<html>`.
- Objetivo táctil mínimo 44×44px.
- Respeta `prefers-reduced-motion`: sin `animate-pulse` ni transiciones cuando está activo.

## 21. Íconos

`lucide-react`, tamaño 20px (16px dentro de texto), grosor 1.5, color heredado del texto. Sin fondos de color, sin círculos, sin bandejas.

Los íconos **acompañan** al texto, no lo reemplazan — salvo eliminar (`X`) y cerrar, que llevan `aria-label`. El dashboard usa cero íconos decorativos.

Set en uso: `Plus`, `X`, `ChevronDown`, `ChevronRight`, `ArrowLeft`, `Check`, `AlertCircle`, `Calendar`, `LogOut`.

## 22. Decisiones abiertas

Se resuelven después de revisar el MVP visual:

1. **Modo oscuro.** Fuera del MVP. Los tokens están listos para agregarlo con una capa `@media (prefers-color-scheme: dark)`, pero mal hecho se ve peor que no tenerlo.
2. ~~**Moneda y locale.**~~ Resuelto el 2026-07-30 — ver §14. El schema y la capa de formato ya soportan COP y USD; el MVP sale sin tasas de cambio y sin mezclar monedas. Pendientes de la actualización posterior: elegir la fuente de tasas (se recomienda la TRM), el job diario que puebla `TasaCambio`, y **enseñarle al Motor IA a redactar los montos en la moneda del usuario** — hoy la prosa que genera lleva el símbolo incrustado en el texto, así que no basta con formatear en el front.
3. **Identidad.** Aún no hay nombre definitivo, logo ni favicon. El MVP usa el nombre "Coach Financiero" como texto plano en la barra de navegación.
4. **Densidad del dashboard con 3 objetivos activos.** El diseño de §6 asume una intención dominante. Con 3 intenciones activas (RF-022) hay que decidir si el "siguiente paso" es uno solo o uno por objetivo. **En el MVP: uno solo, el de la intención más antigua**, y las otras dos se listan debajo del plan, en una línea cada una.
