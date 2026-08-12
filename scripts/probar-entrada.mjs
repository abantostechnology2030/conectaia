/**
 * Comprueba el flujo de entrada completo:
 *
 *   portada (elijo lado) -> login general -> panel de ESE lado -> cambio de lado
 *
 *   node scripts/probar-entrada.mjs
 *
 * Lo que se vigila aquí son fallos que ya ocurrieron y que no dan ningún error
 * al compilar:
 *
 *   1. Preguntar el lado más de una vez. Se elige en la portada y en ningún
 *      sitio más: ni el login ni el registro lo mencionan.
 *   2. Entrar por "necesito" y acabar en el panel de ofrecer, porque la elección
 *      se perdió al pasar por el login o por el registro.
 *   3. Quedarse encerrado en un lado, sin forma visible de pasar al otro.
 */
const BASE = process.env.BASE ?? 'http://localhost:3003'

let fallos = 0
const ok = (cond, texto, extra = '') => {
  console.log(`  ${cond ? '✓' : '✗'} ${texto}${!cond && extra ? ` — ${extra}` : ''}`)
  if (!cond) fallos++
}

// React separa los nodos de texto con <!-- -->, así que un rótulo partido en
// dos trozos "no aparece" si se busca tal cual.
const limpiar = (h) => h.replaceAll('<!-- -->', '')

// El menú se mira SOLO dentro del <nav>. El panel nombra los dos lados a
// propósito, en los botones para cambiar, así que buscar el rótulo suelto en
// todo el HTML daría un falso positivo.
const soloMenu = (html) => [...html.matchAll(/<nav[\s\S]*?<\/nav>/g)].map((m) => m[0]).join('')

function sesion() {
  const c = new Map()
  const guardar = (r) => {
    for (const s of r.headers.getSetCookie?.() ?? []) {
      const [p] = s.split(';')
      const i = p.indexOf('=')
      c.set(p.slice(0, i), p.slice(i + 1))
    }
  }
  const head = () => [...c.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  const pedir = async (ruta, o = {}) => {
    const r = await fetch(`${BASE}${ruta}`, {
      ...o,
      redirect: 'manual',
      headers: { ...(o.headers ?? {}), cookie: head() },
    })
    guardar(r)
    return r
  }
  return { pedir }
}

/**
 * Reproduce lo que hace el navegador: alta (o no) + login + guardar el lado que
 * venía de la portada. Es exactamente la secuencia de LoginForm/RegistroForm.
 */
async function entrar({ lado, registrando = true }) {
  const email = `entrada+${Date.now()}${Math.random().toString(36).slice(2, 5)}@conectaia.com`
  if (registrando) {
    await fetch(`${BASE}/api/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombres: 'Prueba',
        apellidos: 'Entrada',
        email,
        password: 'demo123',
        ciudad: 'Cajamarca',
        // El registro manda el lado que venía del home, de fondo.
        ...(lado ? { modo: lado } : {}),
      }),
    })
  }
  const s = sesion()
  const { csrfToken } = await (await s.pedir('/api/auth/csrf')).json()
  await s.pedir('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password: 'demo123', csrfToken, callbackUrl: `${BASE}/` }),
  })
  return { s, email }
}

/** Lo que hace LoginForm nada más entrar: guardar el lado elegido en el home. */
const guardarLado = (s, lado) =>
  s.pedir('/api/perfil/modo', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modo: lado }),
  })

const menuDe = async (s) => {
  const r = await s.pedir('/panel')
  if (r.status !== 200) return `(redirige a ${r.headers.get('location')})`
  const h = soloMenu(limpiar(await r.text()))
  return [
    h.includes('Busco un servicio') && 'Busco',
    h.includes('Ofrezco un servicio') && 'Ofrezco',
    h.includes('Mis postulaciones') && 'Postulaciones',
  ]
    .filter(Boolean)
    .join(' · ')
}

console.log('\nFlujo de entrada\n')

console.log('1. La portada cuenta qué hace la app y ofrece las dos puertas')
const portada = limpiar(await (await fetch(`${BASE}/`)).text())
ok(portada.includes('Cómo funciona'), 'Explica cómo funciona antes de pedir nada')
ok(portada.includes('Busco un servicio'), 'Ofrece la puerta "busco"')
ok(portada.includes('Ofrezco un servicio'), 'Ofrece la puerta "ofrezco"')
ok(portada.includes('/login?lado=busco'), '"Busco un servicio" lleva al login con su lado')
ok(portada.includes('/login?lado=ofrezco'), '"Ofrezco un servicio" lleva al login con su lado')
ok(!portada.includes('/registro?intencion='), 'Ya no manda a elegir el lado en el registro')

console.log('\n2. El login es UNO solo y no pregunta el lado')
const loginBusco = limpiar(await (await fetch(`${BASE}/login?lado=busco`)).text())
const loginOfrezco = limpiar(await (await fetch(`${BASE}/login?lado=ofrezco`)).text())
ok(loginBusco.includes('Entrar a tu cuenta'), 'Las dos puertas caen en el mismo login')
ok(loginOfrezco.includes('Entrar a tu cuenta'), 'Las dos puertas caen en el mismo login')
ok(
  !loginBusco.includes('¿Qué quieres hacer en ConectaIA?'),
  'El login no vuelve a preguntar necesito/ofrezco',
)
ok(loginBusco.includes('Entrarás a'), 'Solo recuerda por qué puerta entró')
ok(loginBusco.includes('Busco un servicio'), 'Y dice cuál, sin ofrecer cambiarlo aquí')
ok(loginOfrezco.includes('Ofrezco un servicio'), 'Lo mismo por la otra puerta')

console.log('\n3. El registro tampoco pregunta, y no pierde el lado por el camino')
ok(loginBusco.includes('/registro?lado=busco'), 'Crear cuenta arrastra el lado desde el login')
const registro = limpiar(await (await fetch(`${BASE}/registro?lado=ofrezco`)).text())
ok(registro.includes('Crear tu cuenta'), 'El registro es un alta general')
ok(
  !registro.includes('¿Qué quieres hacer en ConectaIA?'),
  'No pregunta si necesita u ofrece ni nada al respecto',
)
ok(registro.includes('/login?lado=ofrezco'), 'Y el enlace de vuelta al login lo conserva')

console.log('\n4. Al entrar aparece el panel del lado elegido en el home')
for (const [lado, esperado] of [
  ['busco', 'Busco'],
  ['ofrezco', 'Ofrezco · Postulaciones'],
]) {
  const { s } = await entrar({ lado })
  await guardarLado(s, lado)

  const panel = await s.pedir('/panel')
  ok(panel.status === 200, `"${lado}" entra directo al panel`, `estado ${panel.status} -> ${panel.headers.get('location')}`)
  ok((await menuDe(s)) === esperado, `"${lado}" abre el panel de su lado: ${esperado}`, `salió "${await menuDe(s)}"`)
}

console.log('\n5. La puerta manda sobre el lado de la última vez (el fallo reportado)')
// Tiene cuenta de "ofrezco" y ahora entra por la puerta "necesito": debe salir
// el panel de necesito, no el de la sesión anterior.
const { s: vuelve } = await entrar({ lado: 'ofrezco' })
ok((await menuDe(vuelve)) === 'Ofrezco · Postulaciones', 'Parte del lado de la oferta')
await guardarLado(vuelve, 'busco')
ok(
  (await menuDe(vuelve)) === 'Busco',
  'Entrando por la otra puerta, el panel es el de necesito',
  `salió "${await menuDe(vuelve)}"`,
)

console.log('\n6. El panel tiene SIEMPRE los dos botones abajo')
for (const lado of ['busco', 'ofrezco']) {
  const { s } = await entrar({ lado })
  await guardarLado(s, lado)
  const panel = limpiar(await (await s.pedir('/panel')).text())
  ok(panel.includes('¿Qué quieres hacer ahora?'), `En "${lado}" el panel ofrece el cambio de lado`)
  ok(panel.includes('Busco un servicio'), `En "${lado}" está el botón de busco`)
  ok(panel.includes('Ofrezco un servicio'), `En "${lado}" está el botón de ofrezco`)
  ok(panel.includes('Aquí estás'), `En "${lado}" se ve cuál de los dos está activo`)
  ok(panel.includes('no borra nada'), `En "${lado}" avisa de que no se pierde nada`)

  // El botón del OTRO lado tiene que llegar PULSABLE. Los dos del selector son
  // los únicos con `aria-pressed`, así que se miran solo esos: el activo va
  // deshabilitado y el otro no. Si salieran los dos deshabilitados, el selector
  // nacería muerto y solo se arreglaría recargando la página.
  const botones = [...panel.matchAll(/<button[^>]*aria-pressed[^>]*>/g)].map((m) => m[0])
  ok(botones.length === 2, `En "${lado}" el selector pinta sus dos botones (${botones.length})`)
  // Ojo: `disabled=""` es el ATRIBUTO. Buscar "disabled" a secas da siempre
  // positivo, porque la clase de Tailwind `disabled:opacity-60` lleva la
  // palabra dentro y está en los dos botones.
  const bloqueados = botones.filter((b) => b.includes('disabled=""'))
  ok(
    bloqueados.length === 1 && bloqueados[0].includes('aria-pressed="true"'),
    `En "${lado}" solo está bloqueado el lado activo (${bloqueados.length} bloqueado/s)`,
  )
}

console.log('\n6b. El menú nombra las oportunidades según el lado')
// Es la misma pantalla leída al revés: desde la oferta son trabajos posibles;
// desde la demanda, gente que podría hacerlos. "Oportunidades" a secas no decía
// a quién se iba a encontrar uno ahí.
for (const [lado, rotulo] of [
  ['busco', 'Posibles trabajadores'],
  ['ofrezco', 'Mis oportunidades de trabajo'],
]) {
  const { s } = await entrar({ lado })
  await guardarLado(s, lado)
  const menu = soloMenu(limpiar(await (await s.pedir('/panel')).text()))
  ok(menu.includes(rotulo), `En "${lado}" el menú dice «${rotulo}»`)
  ok(!menu.includes('>Oportunidades<'), `En "${lado}" ya no dice «Oportunidades» a secas`)

  const titulo = limpiar(await (await s.pedir('/oportunidades')).text())
  ok(titulo.includes(rotulo), `Y la pantalla se titula igual que el menú`)
}

console.log('\n6c. El perfil público ofrece volver a donde se estaba')
// Se llega al perfil desde la comparación de ofertas y desde una coincidencia.
// Sin la vuelta hay que tirar del botón "atrás", y quien compara tres ofertas
// pierde el hilo tres veces.
const conVuelta = limpiar(await (await fetch(`${BASE}/u/3?volver=%2Fnecesidades%2F1`)).text())
const anclas = (h) => [...h.matchAll(/<a\s[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0])
const botonVolver = (h) => anclas(h).find((a) => a.includes('Volver'))
ok(!!botonVolver(conVuelta), 'Con un ?volver= interno aparece el botón')
ok(
  (botonVolver(conVuelta)?.match(/href="([^"]*)"/) ?? [])[1] === '/necesidades/1',
  'Y lleva exactamente a donde se estaba',
)

const sinVuelta = limpiar(await (await fetch(`${BASE}/u/3`)).text())
ok(!botonVolver(sinVuelta), 'Sin parámetro no se pinta ningún botón')

// ⚠️ Es una pantalla PÚBLICA: sin validar, `?volver=https://otro-sitio` sería
// un botón de aspecto inofensivo que se lleva al usuario fuera.
for (const [valor, que] of [
  ['https%3A%2F%2Fotro-sitio.com', 'una URL externa'],
  ['%2F%2Fotro-sitio.com', 'el truco de la doble barra'],
  ['%2F%5Cotro-sitio.com', 'la barra invertida'],
  ['javascript%3Aalert(1)', 'un esquema javascript:'],
]) {
  const h = limpiar(await (await fetch(`${BASE}/u/3?volver=${valor}`)).text())
  ok(!botonVolver(h), `${que} se descarta y no pinta botón`)
}

console.log('\n7. Se cambia de un lado al otro y se vuelve')
const { s: c } = await entrar({ lado: 'busco' })
await guardarLado(c, 'busco')
ok((await c.pedir('/necesidades/nueva')).status === 200, 'En "necesito" abre su página')

await guardarLado(c, 'ofrezco')
ok((await c.pedir('/servicios/nuevo')).status === 200, 'Cambia a "ofrezco" y abre la suya')
ok((await menuDe(c)) === 'Ofrezco · Postulaciones', 'El menú es el del lado nuevo')

await guardarLado(c, 'busco')
ok((await c.pedir('/necesidades/nueva')).status === 200, 'Y al volver, su lado sigue ahí')
ok((await menuDe(c)) === 'Busco', 'Con su menú de siempre')

console.log('\n8. Pedir una página del otro lado lleva al panel, con el mando delante')
const intento = await c.pedir('/servicios/nuevo')
ok(
  (intento.headers.get('location') ?? '').includes('/panel?activar=ofrezco'),
  'No cae en un 404: vuelve al panel señalando el lado que pidió',
  `fue a ${intento.headers.get('location')}`,
)
const conAviso = limpiar(await (await c.pedir('/panel?activar=ofrezco')).text())
ok(
  conAviso.includes('Para publicar servicios y postularte'),
  'Y explica por qué se le devolvió aquí',
)

console.log('\n9. Ya no existe el modo "ambos"')
const ambos = await c.pedir('/api/perfil/modo', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ modo: 'ambos' }),
})
ok(ambos.status === 400, 'La API rechaza "ambos" como cualquier otro invento', `estado ${ambos.status}`)
ok((await menuDe(c)) === 'Busco', 'Y el usuario se queda donde estaba')

const perfil = limpiar(await (await c.pedir('/perfil')).text())
ok(!perfil.includes('Las dos cosas'), 'El perfil tampoco ofrece tener los dos lados')

console.log('\n10. La portada, ya con sesión')
const conSesion = limpiar(await (await c.pedir('/')).text())
ok(conSesion.includes('Ir a mi panel'), 'La cabecera ofrece ir al panel, no "Crear cuenta"')
ok(!conSesion.includes('/login?lado='), 'Las puertas ya no mandan al login')

console.log(fallos === 0 ? '\n✅ El flujo de entrada es correcto.' : `\n❌ ${fallos} fallo(s).`)
process.exit(fallos === 0 ? 0 : 1)
