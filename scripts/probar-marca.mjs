/**
 * Comprueba que el logotipo y el pie de página están en todas las pantallas.
 *
 *   node scripts/probar-marca.mjs
 */
const BASE = process.env.BASE ?? 'http://localhost:3003'

function crearSesion() {
  const cookies = new Map()
  const guardar = (res) => {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [par] = c.split(';')
      const i = par.indexOf('=')
      cookies.set(par.slice(0, i), par.slice(i + 1))
    }
  }
  const cabecera = () => [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')

  async function pedir(ruta) {
    const res = await fetch(`${BASE}${ruta}`, { redirect: 'manual', headers: { cookie: cabecera() } })
    guardar(res)
    return res
  }
  async function entrar(email, password) {
    const { csrfToken } = await (await pedir('/api/auth/csrf')).json()
    const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cabecera() },
      body: new URLSearchParams({ email, password, csrfToken, callbackUrl: `${BASE}/` }),
    })
    guardar(res)
    return (await (await pedir('/api/auth/session')).json())?.user
  }
  return { pedir, entrar }
}

let fallos = 0
const ok = (cond, texto) => {
  console.log(`  ${cond ? '✓' : '✗'} ${texto}`)
  if (!cond) fallos++
}

// El texto que tiene que salir en el pie de TODAS las pantallas.
//
// ⚠️ TEMPORAL: mientras dure el concurso el pie lleva este rótulo en lugar del
// crédito de SolucionesCTEC. Al devolver `components/PieDePagina.tsx` a su
// versión de siempre (guardada en CLAUDE.md) hay que poner aquí otra vez
// 'es un producto de' y descomentar la comprobación del enlace, más abajo.
const PIE = 'CONCURSO CREA Y EMPRENDE 2026'

const publicas = ['/', '/login', '/registro', '/buscar']
const privadas = ['/panel', '/creditos', '/trabajos', '/oportunidades', '/perfil', '/notificaciones']

console.log('\nLogotipo y pie de página\n')

console.log('Pantallas públicas')
for (const r of publicas) {
  const html = await (await fetch(`${BASE}${r}`)).text()
  // En la portada la marca va DENTRO de la ilustración del héroe, que lleva el
  // logotipo dibujado. En el resto sigue siendo el archivo del logotipo.
  const tieneLogo =
    html.includes('/logotipo.png') || html.includes('/logotipo-menu.png') || html.includes('/hero.webp')
  ok(tieneLogo, `${r} — muestra la marca`)
  ok(html.includes(PIE), `${r} — lleva el pie de página`)
  // Vuelve cuando vuelva el pie de SolucionesCTEC:
  // ok(html.includes('solucionesctec.com'), `${r} — enlaza a SolucionesCTEC`)
}

console.log('\nPantallas de la aplicación')
const s = crearSesion()
const u = await s.entrar('maria@conectaia.com', 'demo123')
ok(!!u, 'Entra una cuenta de usuario')

for (const r of privadas) {
  const html = await (await s.pedir(r)).text()
  ok(html.includes('/logotipo-menu.png'), `${r} — muestra el logotipo`)
  ok(html.includes(PIE), `${r} — lleva el pie de página`)
}

console.log('\nPanel de administración')
const a = crearSesion()
ok(!!(await a.entrar('admin@conectaia.com', 'admin123')), 'Entra el administrador')
for (const r of ['/admin', '/admin/usuarios', '/admin/recargas']) {
  const html = await (await a.pedir(r)).text()
  ok(html.includes('/logotipo-menu.png'), `${r} — muestra el logotipo`)
  ok(html.includes(PIE), `${r} — lleva el pie de página`)
}

console.log('\nArchivos de marca')
// La ilustración del héroe va en webp y no en png: pesa 3.1 MB de origen, y con
// la paleta de 256 colores del resto saldría con bandas. Por eso se comprueba
// el tipo que corresponde a cada archivo, no "png" para todos.
for (const f of [
  '/logotipo.png',
  '/logotipo-menu.png',
  '/hero.webp',
  '/marca.png',
  '/icon.png',
  '/apple-icon.png',
]) {
  const res = await fetch(`${BASE}${f}`)
  const tipo = f.endsWith('.webp') ? 'webp' : 'png'
  ok(res.ok && res.headers.get('content-type')?.includes(tipo), `${f} — se sirve`)
}

console.log(fallos === 0 ? '\n✅ La marca está en todas las pantallas.' : `\n❌ ${fallos} fallo(s).`)
process.exit(fallos === 0 ? 0 : 1)
