@AGENTS.md

# Instrucciones de Sesión (ejecutar SIEMPRE al inicio)

1. **Leer este archivo completo** antes de hacer cualquier cosa.
2. **Trabajar siempre en local** hasta que se indique explícitamente el despliegue a producción.
3. **Al final de cada instrucción completada**, indicar qué servidor hay que reiniciar: `npm run dev` o `ninguno`.
4. **Explicar siempre** lo que se va a hacer, lo que se está haciendo y lo que se acaba de hacer.
5. **Actualizar CLAUDE.md** después de cada cambio significativo y al inicio de cada sesión.
6. **Si la instrucción no es clara**, preguntar antes de ejecutar — nunca asumir.
7. **No modificar procesos que ya estén funcionando y validados** — si algo funciona, no tocarlo.

---

# ConectaIA — Contexto del Proyecto

## Qué es este proyecto
Marketplace **bidireccional** de servicios. Una misma cuenta publica lo que **necesita**
(NECESIDAD) y lo que **sabe hacer** (SERVICIO); la plataforma detecta coincidencias entre ambos
lados y cobra un crédito a **quien decide iniciar el contacto**. Pensado para el mercado peruano:
precios en soles, recargas por Yape con comprobante y aprobación manual del administrador.

No son dos marketplaces: es **uno solo**, leído desde los dos extremos. Esa idea se nota en el
código (una sola tabla `Match` que las dos partes consultan al revés) y en la interfaz (los dos
lados conviven en `/oportunidades` con pestañas, no en pantallas separadas).

### Fallos que NO avisan (leer antes de dar algo por bueno)
Todos estos compilan sin error y se manifiestan como "no pasa nada" o, peor, como un cobro mal
hecho. Cada uno tiene su sección más abajo.

| Síntoma | Causa | Dónde |
|---|---|---|
| Se cobra un crédito por un teléfono que ya se veía | Cobrar por publicación mientras la visibilidad es por pareja | `lib/contacto.ts` |
| Con 0 créditos no se puede aceptar una oferta ya pagada | Mirar el saldo sin mirar si la pareja ya está desbloqueada | `necesidades/[id]/Ofertas.tsx` |
| Un doble clic revienta y enseña un error de base de datos | Comprobar el estado FUERA de la transacción y no tomarlo de forma atómica | `necesidades/[id]/aceptar/route.ts` |
| El usuario ve texto interno de Prisma en pantalla | Devolver `e.message` al navegador en el 500 | `lib/guard.ts` |
| Un dato privado aparece en el HTML | Hacer `spread` del usuario al construir props de cliente | `necesidades/[id]/page.tsx` |
| Nadie recibe oportunidades | El servicio está en borrador, pausado o **en revisión**: solo se cruza lo publicado | `lib/matching.ts` |
| Publico algo y no aparece por ningún lado | Es correcto: está esperando aprobación. Sin el aviso, se lee como que se perdió | `components/AvisoRevision.tsx` |
| La aprobación se salta editando después | Editar lo ya aprobado tiene que devolverlo a la cola | `api/necesidades/[id]/route.ts` |
| Una cola espera días sin que nadie la mire | Falta el badge: sin número, nadie sabe que hay trabajo | `lib/menu.ts` |
| El matching no encuentra nada obvio | `claves` se calcula AL GUARDAR; si no se recalcula, queda viejo | `lib/texto.ts` |
| Veo servicios compatibles y no puedo hacer nada | Enlazar la coincidencia a `/p/servicio/[id]` en vez de a `/oportunidades/[id]` | *hay DOS sitios que la listan* |
| Una fecha borrada reaparece sola al editar | Guardar `fechaDeseada` sin mirar la `urgencia` | `lib/publicaciones.ts` |
| Una subcategoría escrita a mano reaparece sola | Guardar `subcategoriaOtra` sin mirar si se eligió una de la lista | `lib/publicaciones.ts` |
| Publicar al editar no hace nada y no avisa | El formulario pide `publicada`, pero el dueño solo puede pedir `en_revision` | `NecesidadForm.tsx` |
| El acento rompe la búsqueda | El regex de tildes reescrito con caracteres literales | `lib/texto.ts` |
| Un ajuste de créditos descuadra el saldo | Escribir `usuario.creditos` sin pasar por `mover()` | `lib/creditos.ts` |
| **Un botón se ve perfecto y al pulsarlo no pasa nada** | Un componente `'use client'` importa un módulo que arrastra Prisma | `lib/lados.ts` |
| Un lado "apagado" se puede usar igual | Ocultar el enlace sin poner `vetoPorModo` en la API | `lib/modos.ts` |
| Se vuelve a preguntar el lado a quien ya lo eligió | Preguntar en el login o el registro; se elige en la portada | `app/page.tsx` |
| Una cuenta ve medio menú y no tiene forma de arreglarlo | Leer un `modo` nulo o `'ambos'` sin `modoEfectivo()` | `lib/modos.ts` |
| Entro por "necesito" y veo el panel de ofrecer | El `?lado=` se pierde entre login y registro | `lib/destino.ts` |
| Entro por una puerta y sale el lado de la última vez | El login navega sin escribir el modo | `login/LoginForm.tsx` |
| Quien cambia de lado cree que perdió sus publicaciones | No decirlo en el propio selector | `panel/SelectorLado.tsx` |
| Cambiar de lado exige recargar la página a mano | No soltar el `ocupado` al acertar, o `replace` a la misma URL comiéndose el `refresh` | `panel/SelectorLado.tsx` |
| Alguien se queda encerrado en un lado | Esconder el cambio de lado tras una condición | `panel/SelectorLado.tsx` |
| **Se borran solos los datos de una cuenta de pruebas manuales** | `npm run probar` reinicia la base: borra las publicaciones de TODAS las cuentas | `scripts/reiniciar.ts` |
| El test pasa una vez y falla la siguiente | IDs a mano: SQLite no reutiliza autoincrementos | `scripts/probar-flujo.mjs` |
| El test cree ver en el menú un lado que no está | El panel nombra el otro lado en la tarjeta de cambio | `scripts/probar-entrada.mjs` |
| Un texto de la interfaz "no aparece" en el test | React separa nodos con `<!-- -->` | `scripts/probar-entrada.mjs` |
| El logotipo sale agujereado | Borrar todo el blanco en vez de rellenar desde el borde | `scripts/imagenes.mjs` |
| El logotipo "no se ve" en una zona | Está sobre fondo oscuro: el nombre es azul marino | *Marca* |
| El logotipo se ve blando al agrandarlo | El PNG de origen se quedó corto para 2x | `scripts/imagenes.mjs` |
| Todos fuera aunque el login funcione | Falta `trustHost` en `auth.config.ts` | *Despliegue* |

## Stack
Es el mismo de CalificaIA e IPER-INNOVA. **No introducir tecnologías nuevas.**

- Next.js 16.2.7 + React 19 + TypeScript (monolito, sin `backend/` ni `frontend/` aparte)
- Tailwind CSS v4 (paleta propia en `app/globals.css` vía `@theme`; utilidades con `@utility`)
- Fuente Inter (`next/font/google`)
- **Prisma 6.19.3** + SQLite — generador `prisma-client-js` en `app/generated/prisma`,
  **sin adapters** (Prisma 7 con adapters libsql da problemas en Windows)
- NextAuth v5 beta — login con correo y contraseña (`credentials`)
- bcryptjs
- **Sin IA en esta versión.** El matching es estructurado y determinista; `lib/matching.ts`
  está aislado para poder sustituirlo por un motor de IA sin tocar nada más (PDR §48).
- Sin librerías de iconos ni de gráficos: los iconos son SVG propios (`components/Icono.tsx`)
- `sharp` **solo como herramienta de desarrollo** (`scripts/imagenes.mjs`), nunca en ejecución

**Puerto local: 3003** (3000 = calificaprof, 3001 = publipropiedades, 3002 = iper-innova).

## Roles
Solo dos, y es deliberado (PDR §4-5):

- **usuario** — la cuenta normal. La MISMA persona publica necesidades, publica servicios, se
  postula, recibe ofertas, contrata, ejecuta, califica y es calificada. **No existen cuentas
  separadas de "cliente" y "proveedor"**; no crearlas.
- **admin** — controla la plataforma: usuarios, publicaciones, recargas, paquetes, categorías,
  moderación y estadísticas. No participa en el marketplace.

El tercer "rol" del PDR (SISTEMA) no es una cuenta: son los procesos automáticos
(matching, notificaciones), que corren dentro de las rutas de API.

## Modo: qué lado del marketplace ve cada usuario (lib/modos.ts)

**Hay DOS lados y solo dos.** `Usuario.modo` guarda en cuál está el usuario ahora mismo:
`busco` · `ofrezco`. **No existe `ambos`** — se quitó a propósito, y la API lo rechaza igual que
cualquier otro valor inventado.

El lado se elige **en la portada, antes de entrar** («Busco un servicio» / «Ofrezco un servicio»), y dentro se cambia con **los dos botones que
el panel tiene siempre abajo**. Ni el login ni el registro lo preguntan.

⚠️ **Esto NO parte la cuenta en dos ni contradice el PDR §4.** Sigue habiendo un solo tipo de
usuario y nadie necesita una segunda cuenta: la misma persona hace las dos cosas, solo que **mira
una a la vez**. El modo decide **qué se enseña**, no qué se puede llegar a ser. A quien solo quiere
que le pinten una habitación, media aplicación le sobra.

**Cambiar de lado no borra ni despublica nada.** Las necesidades y los servicios que ya existan
siguen ahí y reaparecen al volver a ese lado. Se dice explícitamente en la interfaz porque, si no,
la gente supone que va a perder su trabajo y no toca el botón.

Qué se ve con cada lado:

| | `busco` | `ofrezco` |
|---|---|---|
| `/necesidades` (publicar y recibir ofertas) | ✅ | — |
| `/servicios` (publicar lo que sabe hacer) | — | ✅ |
| `/postulaciones` | — | ✅ |
| `/oportunidades` | solo "servicios para mí" | solo "oportunidades para mí" |
| …y en el menú se llama | **«Posibles trabajadores»** | **«Mis oportunidades de trabajo»** |
| `/trabajos`, `/creditos`, `/perfil`, `/notificaciones` | ✅ | ✅ |

Un trabajo y un crédito son los mismos se haya llegado por donde se haya llegado; por eso no
dependen del lado.

⚠️ **`/oportunidades` es la MISMA pantalla con dos nombres**, y el título tiene que coincidir con el
del menú o parecen dos sitios distintos. "Oportunidades" a secas no decía a quién se iba a encontrar
uno ahí: desde la oferta son trabajos posibles; desde la demanda, personas que podrían hacerlos.

⚠️ **`modoEfectivo()` es lo que sostiene a las cuentas viejas.** En la base quedan cuentas con
`modo` nulo (de cuando se preguntaba al entrar) y con `'ambos'` (de cuando se podían tener los dos
lados). Las dos herencias se leen como `busco`, que es el lado con el que llega la mayoría y el
único que no presupone que el usuario tenga algo que ofrecer.
`npx tsx scripts/migrar-modos.ts` lo deja además escrito en la base, y no pone lo mismo a todas:
mira lo que cada una publicó. **Ojo:** esa cortesía es para un usuario que EXISTE — `vetoPorModo`
comprueba aparte que el usuario esté, porque si no un `findUnique` fallido se leería como permiso
concedido.

### ⚠️ `lib/lados.ts` vs `lib/modos.ts` — la separación NO es cosmética
Son dos archivos a propósito, y confundirlos rompe la interfaz **sin dar un solo error**:

- **`lib/lados.ts`** — `MODOS`, `Modo`, `esModo`, `ETIQUETA_MODO`, `modoEfectivo`, `puedeBuscar`,
  `puedeOfrecer`, `otroLado`, `rutaPermitida`. **No importa nada de servidor.** Es el que usan los
  componentes de cliente.
- **`lib/modos.ts`** — `usuarioActual`, `exigirLado`, `vetoPorModo`. Importa `prisma` y `@/auth`, y
  reexporta todo lo de `lados` para que el servidor siga importando de un solo sitio.

**Qué pasa si un `'use client'` importa de `modos`:** el bundler se lleva Prisma al navegador, el
módulo revienta al evaluarse y **el componente nunca se hidrata**. El botón se pinta bien, el HTML
del servidor contiene todo lo esperado, `npm run build` y `eslint` pasan limpios… y al pulsar no
ocurre nada. Ya pasó con los dos botones de `SelectorLado.tsx`.

Lo vigila `node scripts/probar-cliente.mjs` (necesita un `npm run build` antes): recorre los chunks
del navegador buscando rastros de Prisma y bcrypt. **Es la única red contra este fallo.**

### La restricción se aplica en TRES sitios, y hacen falta los tres
1. **El menú** (`lib/menu.ts`) — oculta los enlaces. Es solo cosmético.
2. **Las páginas** (`exigirLado('busco'|'ofrezco')`) — quien escriba la dirección a mano acaba en
   `/panel?activar=…`, no en un 404: la página existe, lo que falta es activar el lado. Se le
   devuelve al **panel** porque es justo donde está el botón para pasarse a ese lado.
3. **Las rutas de API** (`vetoPorModo(ctx.id, lado)`) → 403 con `motivo: 'modo'`. **Sin esto la
   restricción sería puro maquillaje**: bastaría con llamar a `POST /api/servicios` desde la
   consola del navegador para publicar con el lado apagado.

Llevan `vetoPorModo`: `/api/necesidades`, `/api/servicios`, `/api/postulaciones`,
`/api/necesidades/[id]/aceptar` y `/api/oportunidades/[id]/contactar`.

### El lado se elige en UN SOLO sitio: la portada
La cadena completa, y no hay ninguna pregunta en el medio:

```
Portada "Necesito algo"  ->  /login?lado=busco          (el MISMO login para los dos lados)
                         ->  entra, o "Crear cuenta" -> /registro?lado=busco
                         ->  al entrar se guarda modo: 'busco'
                         ->  /panel, con el menú de ese lado
                         ->  abajo, los dos botones para cambiar de lado
```

- La **portada** cuenta qué hace la app y enseña las dos puertas («Busco un servicio» / «Ofrezco un servicio»). El lado de la demanda se dice **«Busco»**, nunca «Necesito»: es la palabra que ya usa el menú y la que da nombre al modo, y llamarlo de dos formas obligaba al usuario a atar cabos.
  **Cada puerta ES la elección.** Sin sesión llevan a `/login?lado=…`; con sesión, las dos llevan al
  panel — quien ya está dentro cambia de lado con los botones, no volviendo a la portada.
- El **login** es uno solo para los dos lados. **No pregunta nada**: solo recuerda por qué puerta
  entró. `LoginForm` guarda el lado nada más autenticar, ANTES de navegar.
- El **registro** es un alta general. **No pregunta si necesita u ofrece ni nada al respecto**: el
  lado viaja de fondo en `?lado=`.

⚠️ **El `?lado=` tiene que sobrevivir a los dos saltos.** El login lo pasa a su enlace "Crear
cuenta" y el registro lo devuelve a su enlace "Entrar". Si se pierde en cualquiera de los dos, quien
no tiene cuenta acaba en el panel contrario al que pulsó — que es el fallo original.

⚠️ **El lado de la puerta MANDA sobre el de la última vez.** Quien tiene cuenta de "ofrezco" y entra
por la puerta "necesito" tiene que ver el panel de necesito. Por eso el login escribe el modo en vez
de limitarse a navegar.

⚠️ **Que la escritura del modo falle no puede dejar a nadie fuera.** El `fetch` va con `.catch(() =>
{})`: se entra igual, con el lado que ya se tuviera, y los dos botones del panel siguen ahí. Al
administrador esa llamada le devuelve 403 y es correcto — no participa en el marketplace.

⚠️ **Ninguna cuenta puede nacer sin lado.** Si `POST /api/registro` recibe un `modo` que no existe
—o no recibe ninguno— `modoEfectivo()` guarda `busco`. Nacer en `null` dejaría media cuenta
inservible, porque ya no hay ninguna pantalla que pregunte.

⚠️ **`destinoSeguro()` no es decorativo.** Aunque la portada ya no genere `?destino=`, el login lo
sigue aceptando. Sin esa validación, `/login?destino=https://otro-sitio` convertiría el login en un
trampolín para llevarse a alguien a otra página justo después de escribir su contraseña. Solo se
aceptan rutas internas, y se descartan también `//otro-sitio` y `/\otro-sitio`, que el navegador
interpreta como absolutas. Casos cubiertos en `scripts/probar-destino.ts`.

### Los dos botones del panel (panel/SelectorLado.tsx)
El panel termina SIEMPRE con los dos lados, los dos visibles, marcando en cuál se está («Aquí
estás») y ofreciendo el otro. **No es un aviso que aparece cuando falta algo: es el mando.** Por eso
no depende de ninguna condición y va abajo, cerrando la pantalla.

Sin tenerlo a la vista, el lado que se eligió en la portada el primer día sería para siempre en la
práctica, y la mitad de la aplicación no existiría para ese usuario.

**Cambiar de lado no borra ni despublica nada** — y el propio componente lo dice en voz alta, porque
si no la gente supone que va a perder su trabajo y no toca el botón.

⚠️ **Dos trampas al refrescar, y las dos dejaban el selector muerto hasta recargar a mano:**
1. **Soltar el `ocupado` SIEMPRE**, salga bien o mal. Si solo se suelta en la rama de error, al
   acertar se queda puesto y los dos botones siguen deshabilitados — el cambio sí se guardó, pero
   el selector ya no responde.
2. **`router.replace()` a la MISMA dirección se come el `router.refresh()`** que va detrás, así que
   el servidor no vuelve a pintar y el menú se queda con el lado viejo. El `replace` solo se hace
   si de verdad hay un `?activar=` que limpiar; el resto de las veces, `refresh()` a secas.

El refresco va dentro de `useTransition`: `router.refresh()` **no desmonta** el componente, así que
sin eso no hay forma de saber cuándo terminó para volver a habilitar los botones.

⚠️ **El selector nombra los dos lados con los MISMOS rótulos del menú.** Por eso los tests que
comprueban qué hay en el menú miran solo dentro de `<nav>`: buscar el rótulo suelto en todo el HTML
del panel da un falso positivo. Ya pasó una vez.

⚠️ **Síntomas parecidos con causas distintas, y los cuatro ya ocurrieron:**
1. *Las dos puertas acaban en el mismo menú.* La elección se perdía por el camino.
2. *Entro por "necesito" y el menú dice "ofrezco".* La puerta no llevaba el lado consigo, o el login
   navegaba sin escribirlo.
3. *Me vuelve a preguntar si necesito u ofrezco.* La pregunta vivía después del login, en una
   pantalla intermedia.
4. *Me quedo encerrado en un lado.* El cambio de lado estaba escondido en el perfil.

Antes de tocar nada de esto, `node scripts/probar-entrada.mjs`, que reproduce los cuatro escenarios.

### Otros detalles que se rompen solos si se tocan
- **`/bienvenida` ya no pregunta**: solo redirige a `/panel`. Se deja porque estuvo enlazada desde
  el panel y desde las guardas de ruta, y un enlace guardado tiene que caer en algún sitio con
  sentido. No volver a meter la pregunta ahí.
- La **portada mira la sesión**: con sesión abierta enseña "Ir a mi panel" en vez de "Crear cuenta".
  Sin eso, a alguien que ya entró se le ofrece registrarse otra vez.
- El **admin no tiene modo** y nunca ve nada de esto: no participa en el marketplace. `migrar-modos`
  lo deja fuera a propósito, y el `PATCH /api/perfil/modo` del login le devuelve 403 sin
  consecuencias.
- **El perfil también deja cambiar de lado**, con las mismas dos opciones. Es el mismo cambio que
  los botones del panel; está ahí porque es donde la gente busca los ajustes de su cuenta.

## Moderación previa: nada se publica sin aprobación

**Ni una necesidad ni un servicio llegan al escaparate por su cuenta.** Pulsar "Publicar" deja la
publicación en `en_revision`; a `publicada` / `publicado` solo se llega desde
`PATCH /api/admin/aprobaciones/[id]`.

```
Usuario pulsa "Publicar"  ->  en_revision   (no lo ve nadie más)
Admin aprueba             ->  publicada     (+ matching + aviso al usuario)
Admin rechaza (con motivo)->  rechazada     (el usuario lee el motivo y corrige)
Usuario edita y guarda    ->  en_revision   (vuelve a la cola)
```

### Las cuatro piezas, y por qué hacen falta las cuatro
1. **El estado** (`lib/estados.ts`) — `en_revision` y `rechazada`/`rechazado`. Un aviso en revisión
   no existe para el resto de la plataforma, y eso sale gratis porque el matching, el escaparate y
   las postulaciones filtran por `publicada`/`publicado`. ⚠️ Cualquier consulta nueva que use
   `estado !== 'borrador'` en vez de `estado === 'publicada'` **enseñaría lo no aprobado**.
2. **Las transiciones del dueño** — `borrador -> en_revision`, nunca `-> publicada`. Si se dejara
   ese salto, la moderación se saltaría con una llamada desde la consola del navegador.
3. **El aviso al usuario** (`components/AvisoRevision.tsx`) — sin él, alguien publica, no encuentra
   su anuncio en el escaparate, da por hecho que se perdió y lo vuelve a publicar (o se va).
4. **El badge del menú** (`lib/menu.ts` + `Sidebar`) — es lo único que convierte "hay una cola" en
   "hay trabajo pendiente". Sin número, la cola espera a que a alguien se le ocurra entrar a mirar.

### ⚠️ Editar lo ya aprobado lo devuelve a la cola, y NO es opcional
Sin eso, la aprobación es teatro: se publica algo inocente, se espera el visto bueno y luego se
edita para meter el teléfono que la revisión iba a impedir. Al volver a revisión se retiran también
sus coincidencias **sin usar** (las ya contactadas o con postulación se respetan: son relaciones
reales entre personas).

**Pausar y reactivar NO re-revisan**, y es correcto: es contenido ya aprobado que no ha cambiado.
Lo que dispara una revisión es tocar el contenido, no encender y apagar.

### El rechazo exige motivo
Mínimo 5 caracteres, por la misma razón que un ajuste de créditos: un "no aprobado" sin explicación
deja al usuario sin nada que corregir, y lo único que puede hacer es reenviar exactamente lo mismo.
El motivo se le muestra tal cual y se le manda por notificación.

### Detalles que tienen su motivo
- **La cola del admin va en tarjetas con el texto completo y las fotos**, encima de la tabla, y no
  depende de los filtros de esa pantalla. No se puede aprobar lo que no se puede leer, y una fila
  recortada obliga a abrir cada aviso en otra pestaña — entonces nadie revisa. Las fotos van ahí
  porque también se cuelan teléfonos en ellas, y la ficha pública todavía no existe (daría 404).
- **`publicadaAt` se fija al APROBAR, no al enviar**: es la antigüedad real del aviso para los demás.
- **Aprobar dos veces devuelve 409.** Con dos administradores mirando la misma cola, el segundo
  pisaría al primero — incluyendo republicar algo que el otro acababa de rechazar.
- **No se escribe en `AlertaModeracion`**: esa tabla es de detecciones de antievasión y reportes, y
  mezclar ahí las decisiones de la cola desvirtuaría el contador de `/admin/moderacion`.
- La antievasión **sigue corriendo antes**: bloquea lo evidente sin gastarle tiempo al admin.

## Reglas de negocio que NO se pueden romper

### 1. Quién paga el crédito (PDR §14-16)
**Paga quien INICIA el contacto, y solo esa persona.** Hay exactamente tres caminos:

- **Caso A** — quien publicó la necesidad **acepta una oferta** →
  `POST /api/necesidades/[id]/aceptar`. Paga el dueño de la necesidad.
  ⚠️ La necesidad se **toma** dentro de la transacción con un `updateMany` condicionado por
  `estado: 'publicada'`, que es atómico. La comprobación de más arriba no basta: con un doble clic
  las dos peticiones salen a la vez, las dos leen "publicada" y las dos siguen. Antes la segunda
  llegaba hasta `trabajo.create`, chocaba contra el índice único y el usuario veía en pantalla
  *"Unique constraint failed on the fields: (postulacionId)"*. Ahora la segunda sale por un 409 con
  `motivo: 'ya_resuelta'`. En el navegador, además, `Ofertas.tsx` bloquea con un `useRef` —el
  estado de React no cambia hasta el siguiente pintado, así que dos pulsaciones seguidas entran las
  dos en el manejador— y no vuelve a habilitar el botón tras acertar, porque la navegación tarda.
- **Caso B** — quien ofrece un servicio ve una oportunidad y **decide contactar** →
  `POST /api/oportunidades/[id]/contactar`. Paga el dueño del servicio.
- **Caso C** — quien publicó la necesidad ve un **servicio compatible** y decide contactar →
  la MISMA ruta `POST /api/oportunidades/[id]/contactar`. Paga el dueño de la necesidad.

En los tres casos, **la contraparte no paga nada** y a partir de ahí **ambos** ven los datos del
otro. Postularse es gratis siempre.

⚠️ **El caso C es el espejo del B y comparte endpoint a propósito.** La ruta mira quién llama:
dueño del servicio → caso B; dueño de la necesidad → caso C; cualquier otro → 403. Lo que decide
quién paga es **quién da el primer paso**, nunca de qué lado del marketplace viene. El `origen` del
`Desbloqueo` los distingue (`oportunidad` / `servicio_compatible`) solo para poder auditarlos.

⚠️ **Se comprueba que siga en pie la publicación de la OTRA parte**, que es por lo que se contacta
—la necesidad en el caso B, el servicio en el C—. La propia no se comprueba: que yo haya pausado mi
servicio no me impide escribirle a alguien que necesita eso mismo.

⚠️ **Antes solo existían A y B, y eso dejaba un callejón sin salida:** quien buscaba veía "2
servicios compatibles", hacía clic y aterrizaba en la ficha pública del profesional, que no ofrecía
ninguna acción y encima le invitaba a "publicar mi necesidad" — la que ya tenía publicada y era la
razón de estar ahí.

⚠️ **Los servicios compatibles se listan en DOS sitios, y los dos tienen que enlazar igual**, a
`/oportunidades/[id]`: la pestaña "Servicios para mí" de `/oportunidades` y la sección "Servicios
compatibles" de `/necesidades/[id]`. Arreglar solo uno deja el callejón sin salida por el otro —
ya pasó. La ficha pública `/p/servicio/[id]` sigue existiendo para quien llega de fuera, y ahí sí
tiene sentido invitarle a publicar su necesidad.

### 2. El cobro es POR PAREJA DE PERSONAS, no por publicación
Una vez que A y B se desbloquearon, ninguno vuelve a pagar por contactar al otro, sea cual sea la
necesidad o el servicio de por medio.

⚠️ **Esto empezó siendo un fallo y es fácil reintroducirlo.** `puedeVerContacto()` busca la pareja
en los dos sentidos y sin filtrar por publicación; `cobrarDesbloqueo()` filtraba además por
`necesidadId`. El resultado era que la segunda necesidad entre las mismas dos personas **cobraba
un crédito por un teléfono que el usuario ya tenía delante en la pantalla**. Las dos funciones
tienen que mirar exactamente lo mismo: si se cambia una, hay que cambiar la otra.

Si algún día se quiere cobrar por trabajo en vez de por persona, hay que cambiar **las dos**, y
asumir que el usuario pagará por un dato que ya tiene guardado en su móvil.

⚠️ **La interfaz tiene que decir la verdad sobre ese coste, y eso no es cosmético.** El recorrido
más frecuente es: quien busca desbloquea a un profesional (1 crédito) → el profesional le manda una
propuesta (gratis) → quien busca la acepta. **Ese tercer paso cuesta 0**, porque la pareja ya está
desbloqueada. Antes el botón seguía pidiendo un crédito y —peor— `sinSaldo` lo **bloqueaba**: quien
había gastado su último crédito abriendo el contacto no podía aceptar la oferta, aunque aceptarla
fuera gratis. Es exactamente la fricción que empuja a cerrar el trato por fuera de la plataforma, y
justo en el último paso.

`parejasDesbloqueadas()` (una sola consulta para todos los que ofertaron) alimenta
`OfertaVista.yaDesbloqueado`, y con eso el botón dice «sin coste», el diálogo lo explica y el aviso
de recargar solo sale si queda alguna oferta que sí se va a cobrar.

**Por qué importa más allá del texto:** los dos caminos dejan el mismo ingreso —1 crédito—, pero
solo el que termina dentro crea un `Trabajo`, y sin `Trabajo` no hay calificación (regla 6), sin
calificación no hay reputación, y sin reputación el matching pierde uno de sus seis factores. El
trato por fuera no roba dinero: roba los datos que hacen funcionar la plataforma. Por eso **el
camino honesto tiene que ser también el más barato y el que menos estorba**.

### 3. Todo movimiento de créditos pasa por `mover()`
`lib/creditos.ts` es la única puerta. Nadie escribe `usuario.creditos` por su cuenta. Así el
histórico de `MovimientoCredito` cuadra siempre con el saldo, que es lo que hace auditable la
plataforma (PDR §31). `mover()` recibe el cliente de transacción como primer argumento: cobrar el
crédito y crear el trabajo tienen que ocurrir juntos o no ocurrir.

Un ajuste manual **exige motivo** (mínimo 5 caracteres). Un movimiento sin explicación deja el
histórico inauditable.

### 4. Las devoluciones NO son automáticas (PDR §32-33)
Desbloquear un contacto no devuelve nada por sí solo, ni siquiera si el trabajo se cancela
después. Solo el admin devuelve, a mano, desde `/admin/usuarios`, y queda registrado.

### 5. Los datos privados no viajan al navegador
No basta con no pintarlos. En `necesidades/[id]/page.tsx` el objeto `OfertaVista` se construye
**campo a campo**; hacer `...p.usuario` metería celular, correo y dirección en el HTML y bastaría
con abrir las herramientas del navegador para saltarse el muro de créditos. Lo mismo en
`/u/[id]`: el `select` de Prisma directamente no pide esos campos.

### 6. Calificar exige un trabajo real y finalizado (PDR §27)
Las cinco condiciones del PDR se reducen a una comprobación: tiene que existir un `Trabajo`
**finalizado** en el que quien califica sea una de las dos partes. Como el trabajo solo nace al
aceptar una oferta, exigirlo garantiza a la vez que hubo necesidad, oferta, selección y relación.
El `@@unique(trabajoId, autorId)` impide calificar dos veces.

### 7. El matching muestra, nunca contacta ni contrata (PDR §22)
Detectar una coincidencia no revela datos ni crea una contratación. Siempre decide el usuario.

## Modelo de datos (Prisma)

```
Usuario (rol: admin|usuario · creditos · estado)
  ├─ Necesidad ──── Foto[]      borrador|publicada|oferta_seleccionada|en_proceso|finalizada|cancelada
  ├─ Servicio  ──── Foto[]      borrador|publicado|pausado|desactivado
  ├─ Postulacion (@@unique necesidadId+usuarioId)  enviada|seleccionada|no_seleccionada|retirada
  ├─ Trabajo (necesidad ↔ postulación, solicitante + proveedor)
  ├─ Calificacion (@@unique trabajoId+autorId, bidireccional, `oculta` para moderar)
  ├─ Desbloqueo (iniciador → contraparte)   ← el corazón del cobro
  ├─ MovimientoCredito (recarga|consumo|devolucion|ajuste, con saldoDespues)
  ├─ Recarga (paquete + comprobante Yape → pendiente|aprobada|rechazada)
  ├─ Notificacion
  └─ AlertaModeracion
Categoria → Subcategoria    PaqueteCredito    Match(necesidad×servicio)    Configuracion
```

Detalles que tienen su motivo:

- **`Foto` en tabla propia**, no un JSON: SQLite no guarda listas, y un JSON en columna no se
  puede contar ni borrar en cascada.
- **`Necesidad.urgencia` + `fechaDeseada`** (`lib/urgencia.ts`): para cuándo se necesita, elegido
  entre cinco opciones — `cuanto_antes` · `esta_semana` · `proxima_semana` · `flexible` ·
  `fecha_fija`. Era un calendario a secas, y eso pedía un dato que el usuario no tiene: quien
  necesita que le arreglen un caño no piensa "el 14 de marzo", piensa "cuanto antes", así que se
  inventaba una fecha — y una fecha inventada es peor que ningún dato, porque el proveedor la toma
  en serio. El calendario aparece **solo** con `fecha_fija`.
  **`flexible` no sobra:** si todas las opciones implican prisa, todo el mundo marca la más urgente
  y el dato deja de distinguir nada.
  ⚠️ Los dos campos salen juntos de `cuandoSeNecesita()` y nunca por separado: si no, pasar una
  necesidad de "el 14 de marzo" a "cuanto antes" dejaría la fecha vieja en la base, invisible en la
  ficha pero reapareciendo en cuanto alguien volviera a marcar "fecha exacta".
- **`subcategoriaOtra`** (necesidad y servicio): el desplegable ofrece **"Otro (especificar)"** y
  este campo guarda lo que el usuario escribió. La lista la fija el administrador y nunca lo cubre
  todo; sin esa salida, quien no se ve reflejado elige la subcategoría que más se le parece —y
  ensucia el matching de esa otra— o deja el campo vacío y pierde la mitad de sus 15 puntos.
  El texto entra en las `claves`, así que el matching lo aprovecha por la vía de la descripción.
  ⚠️ Los dos campos salen juntos de `subcategoriaElegida()` y son **excluyentes**: si se calcularan
  por separado, pasar de "Otro" a una subcategoría de la lista dejaría el texto viejo escondido en
  la base, reapareciendo al volver a marcar "Otro". Es el mismo problema que ya tuvo `fechaDeseada`.
- **`Necesidad.claves` / `Servicio.claves`**: palabras normalizadas (minúsculas, sin tildes, sin
  vacías) que calcula `lib/texto.ts` **al guardar**. SQLite no tiene búsqueda de texto completo;
  normalizar en cada consulta obligaría a traerse la tabla entera a memoria. Si se edita una
  publicación sin recalcular `claves`, el matching sigue usando las palabras viejas.
- **`Match` persistido**: el PDR §40 pide contar coincidencias *detectadas / consultadas / que
  generaron postulación / que generaron contacto*. Sin guardarlas no hay nada que contar. Las
  marcas de tiempo (`vistoAt`, `postuloAt`, `contactoAt`) son ese embudo.
- **`MovimientoCredito.refTipo` + `refId`**: referencia suelta a propósito. Un movimiento no debe
  desaparecer si se borra lo que lo originó.

## Matching (lib/matching.ts)

Puntaje de 0 a 100, suma de seis factores con los pesos del PDR §19:

| Factor | Peso | Cómo se calcula |
|---|---|---|
| Categoría | 35 | Todo o nada |
| Subcategoría | 15 | Igual = todo · si alguno no la declaró = mitad · distinta = 0 |
| Ubicación | 20 | Misma ciudad (normalizada) o nada |
| Precio | 15 | El "desde" bajo el presupuesto = todo; por encima decae hasta el doble |
| Descripción | 10 | Solapamiento de `claves` sobre el conjunto más pequeño |
| Disponibilidad | 5 | 40% por declararla + 60% proporcional a la reputación |

El "medio punto" cuando falta un dato es deliberado: un dato ausente no es un desacuerdo, y
castigarlo como tal dejaría fuera publicaciones que sí sirven.

Solo se comparan publicaciones de la **misma categoría** (sin ese filtro habría que puntuar la
tabla entera contra cada publicación, y sin categoría común nunca se llegaría al mínimo).
Solo entra lo **publicado**: un borrador o un servicio pausado no le aparece a nadie.

Comprobación: `npx tsx scripts/probar-match-pdr.ts` reproduce el ejemplo del PDR §45
(pintura + Cajamarca + S/100 vs "desde S/80", Carlos con ⭐4.8) y da exactamente **94%**.

## Antievasión (lib/antievasion.ts + lib/moderacion.ts)

Cuatro reglas sobre cada texto público: teléfono, correo, redes sociales y frases de salida de la
plataforma ("escríbeme al", "coordinamos por"). Antes de aplicarlas, `digitosEscritos()` convierte
los números escritos con letras ("nueve ocho siete…") en dígitos, que es el truco más común.

Se revisan: necesidades, servicios, postulaciones, calificaciones y la descripción del perfil.
Cada detección deja una fila en `AlertaModeracion` **aunque no bloquee**.

El interruptor `antievasion_bloquea` decide si además impide guardar. Existe porque ninguna
detección por patrones es perfecta: si empieza a bloquear publicaciones legítimas, el admin la
pasa a modo aviso desde `/admin/configuracion` sin tocar código.

## Rutas de la app

**Públicas** (se ven sin cuenta — un marketplace vacío detrás de un login no convence a nadie):
- `/` portada con las dos puertas (**aquí se elige el lado**) · `/login?lado=busco|ofrezco` ·
  `/registro?lado=busco|ofrezco` (ninguno de los dos pregunta nada: el lado viaja de fondo)
- `/buscar?tipo=necesidad|servicio` escaparate con filtros
- `/p/necesidad/[id]` · `/p/servicio/[id]` fichas públicas
- `/u/[id]?volver=…` perfil público (reputación, servicios, calificaciones; **nunca** contacto).
  El `?volver=` pinta un botón para regresar: se llega aquí desde la comparación de ofertas y desde
  una coincidencia, y quien compara tres personas perdería el hilo tres veces con el botón "atrás".
  ⚠️ **Pasa por `destinoSeguro()`**: es una pantalla PÚBLICA, y sin validar,
  `?volver=https://otro-sitio` sería un botón de aspecto inofensivo que se lleva al usuario fuera.
  Lo que no sea ruta interna no pinta botón.

**Usuario** (grupo `(panel)`):
- `/panel` inicio: lo que requiere acción primero, luego cifras y oportunidades
- `/necesidades` · `/necesidades/nueva` · `/necesidades/[id]` (comparar ofertas y aceptar) · `/[id]/editar`
- `/servicios` · `/servicios/nuevo` · `/servicios/[id]` · `/[id]/editar`
- `/oportunidades?lado=para-mi|servicios` las dos caras del matching · `/oportunidades/[id]`
  (**la misma ruta se lee desde los dos extremos**: al dueño del servicio le enseña la necesidad
  compatible; al dueño de la necesidad, el profesional compatible)
- `/postulaciones` · `/trabajos` · `/trabajos/[id]` (contacto, cerrar y calificar)
- `/creditos` saldo, paquetes, recarga Yape e historial · `/notificaciones` · `/perfil`

**Admin**, en el menú: `/admin` (estadísticas del PDR §40) · `/admin/usuarios` ·
`/admin/necesidades` · `/admin/servicios` · `/admin/postulaciones` · `/admin/matching` ·
`/admin/recargas` · `/admin/movimientos` · `/admin/calificaciones` · `/admin/moderacion` ·
`/admin/configuracion`

**Dentro de Configuración**, no en el menú: `/admin/categorias` · `/admin/paquetes`. Son ajustes
del catálogo que se tocan de vez en cuando; al lado de las colas que piden atención a diario solo
alargaban el menú. Configuración los enlaza con sus cifras (cuántas categorías activas, cuántos
paquetes) para no tener que entrar solo a mirar.

⚠️ **Las dos pantallas llevan "Volver a Configuración" en su encabezado.** Ya no están en el menú,
así que sin ese enlace la única salida sería el botón "atrás" del navegador.

## API

Todas las rutas de escritura pasan por `conRol([...], handler)` de `lib/guard.ts`, que traduce
`NoAutorizado` a JSON. No comprobar el rol a mano en cada ruta.

⚠️ **El 500 de `conRol` NO devuelve el mensaje del error.** Antes sí, y así acabó un
`Unique constraint failed on the fields: (postulacionId)` delante de un usuario: un texto que no le
dice nada y que además cuenta cómo está hecha la base por dentro. Lo que llega a ese `catch` es un
fallo nuestro; los errores previstos devuelven su propia respuesta con un mensaje escrito para
personas. El detalle va a `console.error`, no al navegador.

| Ruta | Qué hace |
|---|---|
| `POST /api/registro` | Alta con su `modo` ya puesto (`busco` si no llega ninguno) + créditos de bienvenida como movimiento (no como valor inicial) |
| `PATCH /api/perfil/modo` | Cambia de lado. Solo acepta `busco` u `ofrezco`; lo llaman el login, los botones del panel y el perfil |
| `POST/PATCH/DELETE /api/necesidades[/[id]]` | CRUD; recalcula matching y `claves` |
| `PATCH /api/necesidades/[id]/estado` | Transiciones válidas; al cancelar avisa a quienes ofertaron |
| `POST /api/necesidades/[id]/aceptar` | **Caso A**: cobra, desbloquea, crea trabajo, descarta las demás — todo en una transacción |
| `POST/PATCH/DELETE /api/servicios[/[id]]` | CRUD |
| `PATCH /api/servicios/[id]/estado` | Al pausar retira las coincidencias sin usar |
| `POST /api/postulaciones` · `DELETE /api/postulaciones/[id]` | Postularse (las 4 reglas del §11) y retirar |
| `PATCH /api/oportunidades/[id]` | Marca la coincidencia como consultada (métrica §40) |
| `POST /api/oportunidades/[id]/contactar` | **Casos B y C**: cobra a quien llama y desbloquea. NO crea contratación |
| `PATCH /api/trabajos/[id]` | Finalizar o cancelar; avisa a ambas partes |
| `POST /api/calificaciones` | Calificar (exige trabajo finalizado) |
| `POST /api/recargas` | Solicitar recarga con comprobante. **No acredita nada** |
| `PATCH /api/admin/recargas/[id]` | Aprobar (acredita) o rechazar |
| `POST /api/admin/creditos` | Devolución o ajuste manual, con motivo obligatorio |
| `PATCH /api/admin/aprobaciones/[id]` | **Aprobar o rechazar** una publicación (`tipo`: necesidad/servicio). Único camino a `publicada`. Rechazar exige motivo |
| `PATCH /api/admin/usuarios/[id]` | Suspender/reactivar; al suspender retira sus publicaciones |
| `PATCH/DELETE /api/admin/categorias[/[id]]` · `/paquetes[/[id]]` | Lo que está en uso se DESACTIVA, no se borra |
| `PATCH /api/admin/configuracion` | Solo acepta claves conocidas de `CONFIG_DEFAULTS` |

## Marca: logotipo, icono y pie de página

Los originales están en `archivos/` (`logotipo.png`, `favicon.png` y `hero.png`).
**No se usan directamente**: `node scripts/imagenes.mjs` genera las versiones que sirve la app.
Se corre a mano cuando cambien los originales; lo que se despliega son los PNG ya generados.

| Archivo | Tamaño | Dónde se usa |
|---|---|---|
| `public/hero.webp` | 1536×1024 · 199 KB | **Portada**, a todo el ancho de la columna |
| `public/logotipo.png` | 606×560 · 81 KB | Login (150), registro (130) |
| `public/logotipo-menu.png` | 346×320 · 33 KB | Menú lateral (120) y cabeceras |
| `public/marca.png` | 256×256 · 15 KB | Barra móvil, donde no cabe el logotipo apilado |
| `app/icon.png` | 512×512 · 43 KB | Icono del navegador (Next lo detecta solo) |
| `app/apple-icon.png` | 180×180 · 9 KB | Icono al instalar en iPhone/iPad |

⚠️ **Los altos de origen son el DOBLE del mayor tamaño al que se pinta cada versión**, por las
pantallas de densidad doble. Si se agranda el logotipo en la interfaz hay que subir esos números en
`scripts/imagenes.mjs` y volver a generarlos, o se verá blando sin que nada dé error. Pasar de un
tamaño a otro también puede obligar a cambiar de archivo: la portada usa el grande, no el del menú,
justo por eso.

### Cómo se quita el fondo blanco, y por qué así
`scripts/imagenes.mjs` hace un **relleno desde los bordes**, no un borrado global de píxeles
blancos. La diferencia es la que decide si el logotipo queda bien o queda roto: dentro del
logotipo **el apretón de manos ES blanco**, y un borrado global lo dejaría agujereado. El relleno
solo alcanza el blanco que está conectado con el borde de la imagen.

Después suaviza la orla del antialias (los píxeles casi blancos que tocan el fondo pierden opacidad
según lo claros que sean) y recorta el margen sobrante, para que el alto que se pide en el código
sea el del dibujo y no el del espacio en blanco.

⚠️ **Quedan blancos interiores no conectados con el borde**: los huecos de la "o", la "e" y la "a"
del nombre. Sobre fondo claro es exactamente lo que se quiere; sobre un fondo oscuro se verían como
manchas blancas. Da igual porque el logotipo va siempre sobre superficies claras — pero es la razón
de la regla siguiente.

### El logotipo NO va sobre fondos oscuros
El nombre "Conecta" del logotipo es azul marino (`#032c5b`), el mismo color del pie de página:
puesto ahí, desaparecería. Por eso **en el pie el nombre va como texto blanco**, no con la imagen.

### Colores de marca
`--color-logo-azul: #032c5b` · `--color-logo-azul-claro: #0256ba` · `--color-logo-verde: #66aa11`

Están muestreados del propio archivo con `node scripts/colores-logo.mjs`, no elegidos a ojo. Si
hace falta otro color de la marca, sacarlo de ahí en vez de aproximarlo.

De esos dos colores salen dos escalas completas, para poder usarlos como fondo, borde y texto sin
inventarse tonos por el camino:

- **`marino-50…900`** — el azul del nombre "Conecta" (`900`) y su versión clara (`600`).
- **`verde-50…700`** — el verde de "IA".
- **`btn-marino`** — el botón de la cara pública.

⚠️ **Estas escalas son de la MARCA y viven en la cara pública** (portada, pie). **No sustituyen a
los colores con significado de dentro de la aplicación** — `cielo` = lo que busco, `menta` = lo que
ofrezco, `durazno` = oportunidades, `sol` = a la espera, `marca` (índigo) = plataforma y créditos.
En la portada, las dos puertas siguen siendo cielo y menta justamente por eso: son las mismas dos
cosas que el usuario va a encontrar dentro.

### La ilustración de la portada (`hero.webp`)
Preside la portada **a todo el ancho de la columna** y lleva el logotipo dibujado dentro, así que
sustituye al logotipo suelto que había ahí. Enseña de un vistazo la marca **y de qué va esto**
—oficios concretos, no un concepto abstracto—, que es lo que necesita quien llega sin saber qué es
ConectaIA.

⚠️ **Va en WEBP y no en PNG, y esta vez importa.** El original pesa 3.1 MB. Con la paleta de 256
colores que usa `comprimir()` bajaría a 711 KB **pero con bandas visibles** en las pieles y los
degradados; en webp son 199 KB sin tocar la calidad. `sharp` lo hace de serie — no es una
dependencia nueva. `scripts/probar-marca.mjs` comprueba el tipo que corresponde a cada archivo, no
"png" para todos.

⚠️ **NO se le quita el fondo, y se probó.** El fondo tiene un viñeteado que corta el relleno desde
los bordes, así que queda un rectángulo a medias. Subir el umbral se comería el gorro del chef, el
overol del pintor y la diadema de la señora, que también son casi blancos. Se deja con su fondo
claro y la portada **la enmarca** (esquinas redondeadas y borde): sin marco, ese blanco cálido no
coincide con el degradado de la sección y se lee como un rectángulo suelto.

### La portada: la marca preside, centrada
El logotipo va **centrado y grande en el héroe**, no arrinconado en la barra; la cabecera se queda
solo con los botones. Es lo primero que ve quien llega sin saber qué es esto.

⚠️ **Todos los fondos de la portada son claros a propósito.** El nombre "Conecta" es azul marino:
sobre una superficie oscura desaparecería (ver la regla del pie de página). Si alguna sección se
pinta en `marino-800`, el logotipo NO puede ir encima.

### Pie de página
Texto blanco sobre `bg-logo-azul`, en **todas** las pantallas (panel, admin, públicas, login y
registro):

> **ConectaIA** © es un producto de [SolucionesCTEC](https://www.solucionesctec.com)
> www.solucionesctec.com

Comprobación: `node scripts/probar-marca.mjs` recorre las pantallas públicas, las del usuario y las
del admin verificando que en todas está el logotipo y el pie.

## Convenciones de código

- **Todo en español**: modelos, campos, rutas, variables, comentarios, mensajes.
- **Colores con significado fijo** en toda la app: `cielo` = lo que busco (necesidades),
  `menta` = lo que ofrezco (servicios), `durazno` = oportunidades, `sol` = a la espera,
  `marca` (índigo) = la plataforma y los créditos. No mezclarlos.
- **Estados centralizados** en `lib/estados.ts`: etiqueta y color de cada estado en un solo sitio.
  Nunca escribir "Publicada" a mano en una pantalla.
- **Confirmación obligatoria antes de gastar un crédito**, con el coste escrito en el propio botón
  y en el diálogo (`useConfirmar` con `tono: 'credito'`). El PDR §13 lo exige.
- **Fechas y precios** siempre por `lib/fechas.ts` (`fecha`, `fechaHora`, `hace`, `soles`).
- `Date.now()` **no** puede llamarse dentro de un componente (regla de pureza de React): para eso
  está `haceDias()` en `lib/fechas.ts`.
- Los formularios con dos acciones (guardar / publicar) usan **dos botones `submit` con el mismo
  `name` y distinto `value`**, y leen el `submitter` en `new FormData(form, submitter)`. Sin pasar
  el submitter, el valor del botón no viaja y las dos acciones se vuelven idénticas.

## Comandos

```bash
npm run dev          # http://localhost:3003
npm run build
npm run db:push      # aplica el schema a SQLite
npm run db:seed      # catálogo, paquetes, admin y las cuentas de demostración
npm run db:reset     # borra lo transaccional y vuelve a sembrar
npm run probar:aislado  # ✅ las 158 comprobaciones en su PROPIA base y puerto (3099).
                        #    No toca prisma/dev.db. Es el que hay que usar para
                        #    verificar un cambio si alguien está probando a mano.
npm run probar       # ⚠️ REINICIA LA BASE y corre las 162 comprobaciones de flujo
                     #    Borra las publicaciones de TODAS las cuentas, también
                     #    las creadas a mano. Se planta si detecta trabajo real;
                     #    para forzarlo: CONFIRMAR=si npm run probar
node scripts/probar-cliente.mjs       # que Prisma no viaje al navegador (exige npm run build antes)
node scripts/probar-marca.mjs         # logotipo y pie de página en todas las pantallas
node scripts/probar-entrada.mjs       # portada (elige lado) -> login -> panel de ese lado -> cambio
npx tsx scripts/probar-destino.ts     # validación del destino de vuelta tras el login
npx tsx scripts/ver-modos.ts          # en qué lado está cada cuenta
npx tsx scripts/migrar-modos.ts       # cuentas con modo nulo o 'ambos' -> un lado real (idempotente)
npx tsx scripts/restaurar.ts --lista  # copias de la base guardadas antes de cada reinicio
npx tsx scripts/restaurar.ts          # volver a la copia más reciente (para el servidor antes)
node scripts/imagenes.mjs             # regenera logotipo e iconos desde archivos/
node scripts/colores-logo.mjs         # muestrea los colores del logotipo
npx tsx scripts/probar-match-pdr.ts   # comprueba el 94% del ejemplo del PDR §45
```

## Cuentas de prueba

| Correo | Contraseña | Quién es |
|---|---|---|
| `admin@conectaia.com` | `admin123` | Administrador |
| `maria@conectaia.com` | `demo123` | Modo `busco` — publica la necesidad de pintura (PDR §45) |
| `carlos@conectaia.com` | `demo123` | Modo `ofrezco` — el pintor del PDR §45 |

`npm run db:seed` devuelve a María y Carlos a 3 créditos, para que el flujo automatizado mida
siempre lo mismo.

## ⚠️ Las pruebas y los datos de prueba manuales comparten base

`npm run probar` empieza por `db:reset`, y eso **borra las publicaciones de todas las cuentas**, no
solo las de los guiones. También pone a cero los créditos de todo el mundo.

**Ya pasó:** alguien publicó un servicio con una cuenta suya (`luis@gmail.com`), se corrieron las
pruebas para validar otra cosa, y el servicio desapareció. Desde la aplicación se veía como si los
datos se borraran al iniciar sesión — no había ninguna pista de la causa real.

Por eso `scripts/reiniciar.ts` **se planta** si encuentra publicaciones de cuentas que no son ni las
sembradas (`admin@`, `maria@`, `carlos@`) ni las que fabrican los guiones (`rosa+`, `diana+`,
`entrada+`, `prueba+`, `diag+`). Para reiniciar de todas formas:

```bash
CONFIRMAR=si npm run probar
```

Solo mira cuentas **con algo publicado**: una vacía no pierde nada y no vale la pena estorbar por
ella en cada pasada.

### ✅ La solución de verdad: `npm run probar:aislado`

```bash
npm run probar:aislado    # las 158 comprobaciones SIN tocar prisma/dev.db
```

Levanta un **segundo servidor en el puerto 3099** apuntando a `prisma/test.db`, prepara esa base
desde cero, corre la suite contra él y lo apaga. `prisma/dev.db` no se abre en ningún momento —
comprobado comparando su huella SHA antes y después: idéntica.

**Es el que hay que usar mientras alguien esté probando a mano.** `npm run probar` sigue existiendo
para cuando la base sea desechable, pero no es el de por defecto para verificar un cambio.

⚠️ **El script espera a que el servidor de pruebas muera antes de terminar.** Next se niega a
arrancar un segundo `next dev` en la misma carpeta, así que si se fuera antes, el `npm run dev` de
siempre fallaría con *"Another next dev server is already running"* y el culpable ya no estaría a
la vista. Y mata el ÁRBOL de procesos: `next dev` deja un hijo que es el que tiene el puerto.

### El histórico de por qué existe todo esto

⚠️ **El aviso no bastó: se saltó con `CONFIRMAR=si` y se perdieron datos reales que no
había forma de recuperar.** Por eso ahora `reiniciar.ts` **copia `prisma/dev.db` antes de tocar
nada**, en `prisma/copias/` (las 10 últimas, fuera de git). Es un archivo SQLite: copiarlo es
copiar la base entera.

```bash
npx tsx scripts/restaurar.ts --lista   # qué copias hay
npx tsx scripts/restaurar.ts           # volver a la más reciente
```

Restaurar guarda además la base actual antes de pisarla, por si la restauración era el error.
**Para el servidor antes de restaurar**: Next mantiene abierta la conexión con SQLite.

⚠️ **Cada guion de prueba que invente correos nuevos tiene que añadir su prefijo a `DE_PRUEBA`.**
Si no, la barrera los toma por cuentas de verdad, se planta en cada pasada, y acabas saltándotela
siempre — que es exactamente como se perdieron los datos.

⚠️ **Segundo efecto, distinto y fácil de confundir con el anterior:** si alguien entra por la puerta
"Necesito algo" de la portada, su lado pasa a `busco` y **el menú deja de enseñar "Ofrezco un
servicio"**. Sus servicios NO se borran — están ahí y vuelven a aparecer al cambiarse de lado con
los botones del panel. Pero el síntoma que ve el usuario ("mi servicio ya no está") es idéntico.
Antes de buscar un borrado, comprobar el `modo` con `npx tsx scripts/ver-modos.ts`.

## Comprobación automatizada

`scripts/probar-flujo.mjs` recorre la app entera por HTTP con sesiones reales de NextAuth y
comprueba **162** cosas que no se pueden verificar leyendo el código: quién paga, quién no paga,
qué se ve antes y después del desbloqueo, qué se bloquea y qué pasa cuando algo falla a mitad.

Cubre: autenticación · antievasión (incluidos números escritos con letras) · publicación ·
matching · las 4 reglas de postulación · privacidad antes del cobro · caso A · caso B con una
tercera persona · cobro por pareja · calificación bidireccional · perfil público · permisos por
rol · devoluciones · recarga Yape completa · estados de servicio · y el caso sin créditos,
verificando que la transacción **revierte del todo** (ni necesidad a medias, ni trabajo fantasma).

Los identificadores se leen de la base al arrancar. **No escribir `id: 1` a mano**: tras un
reinicio SQLite no reutiliza los autoincrementos y la segunda pasada fallaría entera.

## Estado actual
- [x] Proyecto Next.js 16 + Tailwind v4 + Prisma 6 + SQLite
- [x] Schema completo, seed con 16 categorías / 57 subcategorías / 4 paquetes
- [x] Autenticación, roles, middleware y layouts
- [x] Necesidades y servicios: CRUD, fotos, estados, antievasión
- [x] Matching estructurado bidireccional (94% en el caso del PDR §45)
- [x] Postulaciones y las dos vías de desbloqueo con cobro de créditos
- [x] Trabajos, calificaciones bidireccionales y notificaciones
- [x] Recargas por Yape con aprobación del administrador
- [x] Panel de administración completo con las estadísticas del PDR §40
- [x] Moderación previa: nada se publica sin aprobación del admin, con badges de cola pendiente
- [x] Escaparate público (portada, buscador, fichas, perfiles)
- [x] Elección del lado en la portada; login y registro generales, sin preguntar nada
- [x] Dos lados y solo dos (`ambos` retirado), con los dos botones siempre al pie del panel
- [x] `npm run build` y `npx eslint .` limpios · 162/162 comprobaciones de flujo

### Fuera del MVP a propósito (PDR §47)
App móvil nativa, chat interno, pasarela de pago automática, GPS, mapas, IA generativa,
videollamadas, suscripciones y sistema de disputas.

### Despliegue — **EN PRODUCCIÓN**: https://conectaia.solucionesctec.com

Servidor Hetzner `87.99.144.139` (`eskulclass-server`), **compartido con 6 aplicaciones más**
(publipropiedades 3000, calificaprof 3001, iper-innova 3002, medicaia, nutriia, nutrichefia).
ConectaIA vive en `/var/www/conectaia`, proceso PM2 `conectaia`, **puerto 3003**.

```bash
# Actualizar producción
ssh -i ~/.ssh/publipropiedades_deploy root@87.99.144.139
cd /var/www/conectaia && git pull && npm ci && npm run build && pm2 restart conectaia
```

⚠️ **Es un servidor compartido: `nginx -t` SIEMPRE antes de `systemctl reload nginx`.** Una
configuración mala tumba los otros seis sitios, no solo este.

⚠️ **`www.conectaia.solucionesctec.com` no resuelve** — falta el registro DNS. El certificado se
emitió solo para el dominio sin `www`; cuando exista el registro hay que ampliarlo con
`certbot --nginx -d conectaia.solucionesctec.com -d www.conectaia.solucionesctec.com`.

Copias diarias (03:20, se guardan 14 días) en `/root/backups/conectaia/`: la base **y** los
uploads, por `copia.sh`.

El paso a paso completo está en **`DESPLIEGUE.md`**.

- Repositorio `git@github.com:abantostechnology2030/conectaia.git` · dominio
  **www.conectaia.solucionesctec.com** · puerto interno **3003**, el mismo que en local.
- `ecosystem.config.cjs` (PM2, **una sola instancia**: SQLite es un archivo y dos procesos
  escribiendo a la vez se pisan) y `despliegue/nginx-conectaia.conf`.
- `postinstall: prisma generate` — **sin esto el servidor no compila**, porque `app/generated` no
  está en el repositorio.

⚠️ **Las cabeceras `X-Forwarded-*` del Nginx no son opcionales.** Con `trustHost: true`, NextAuth
reconstruye la URL con lo que le llegue: sin `X-Forwarded-Proto https` cree que está en http, marca
la cookie como insegura y el navegador la rechaza. El login "funciona" y acto seguido estás fuera.

⚠️ **Pendiente en el servidor, y no es opcional:**
- **`AUTH_SECRET` nuevo**, generado allí (`openssl rand -base64 32`). Con el de desarrollo,
  cualquiera que lo conozca puede fabricarse una sesión válida en producción.
- **Cambiar la contraseña del administrador** y borrar las cuentas de demostración: `admin123` y
  `demo123` están en este repositorio, así que son públicas.
- **Copiar `prisma/dev.db` Y `public/uploads/`.** Las fotos no están en git a propósito (son datos
  de usuarios): respaldar solo la base deja las publicaciones con las imágenes rotas.
