/**
 * Prueba de extremo a extremo del flujo principal de ConectaIA.
 *
 * Recorre el caso completo del PDR §45 contra la app corriendo, con sesiones
 * reales de NextAuth, y comprueba las reglas de negocio que no se pueden
 * verificar leyendo el código: quién paga el crédito, quién NO paga, cuándo se
 * desbloquea el contacto y qué se bloquea.
 *
 * Requiere la app corriendo (`npm run dev`) y la base en su estado inicial.
 * La forma corta, que reinicia y prueba de una vez:
 *
 *   npm run probar
 *
 * Los identificadores NO se escriben a mano: se leen de la base al empezar.
 * Tras un reinicio, SQLite no reutiliza los autoincrementos, así que cualquier
 * `id: 1` escrito en el guion dejaría de existir en la segunda pasada.
 */

import { PrismaClient } from '../app/generated/prisma/index.js'

const BASE = process.env.BASE ?? 'http://localhost:3003'
const prisma = new PrismaClient()

let fallos = 0
let pasos = 0

function ok(cond, texto, extra = '') {
  pasos++
  if (cond) {
    console.log(`  ✓ ${texto}`)
  } else {
    fallos++
    console.log(`  ✗ ${texto}${extra ? ` — ${extra}` : ''}`)
  }
}

// --- Sesión con su propio tarro de cookies ---------------------------------
function crearSesion() {
  const cookies = new Map()

  const guardar = (res) => {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [par] = c.split(';')
      const i = par.indexOf('=')
      cookies.set(par.slice(0, i), par.slice(i + 1))
    }
  }

  const cabecera = () =>
    [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')

  async function pedir(ruta, opciones = {}) {
    const res = await fetch(`${BASE}${ruta}`, {
      ...opciones,
      redirect: 'manual',
      headers: { ...(opciones.headers ?? {}), cookie: cabecera() },
    })
    guardar(res)
    return res
  }

  async function json(ruta, opciones = {}) {
    const res = await pedir(ruta, opciones)
    const cuerpo = await res.text()
    let datos = {}
    try {
      datos = JSON.parse(cuerpo)
    } catch {
      datos = { _texto: cuerpo.slice(0, 200) }
    }
    return { estado: res.status, datos }
  }

  async function entrar(email, password) {
    const csrfRes = await pedir('/api/auth/csrf')
    const { csrfToken } = await csrfRes.json()

    const res = await pedir('/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, password, csrfToken, callbackUrl: `${BASE}/` }),
    })

    const sesion = await (await pedir('/api/auth/session')).json()
    return { entro: !!sesion?.user, usuario: sesion?.user, estado: res.status }
  }

  return { pedir, json, entrar }
}

// --- Utilidades ------------------------------------------------------------
const form = (obj) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null) f.append(k, String(v))
  return f
}

const jsonBody = (obj) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
})

async function main() {
  console.log(`\nProbando ConectaIA en ${BASE}\n`)

  // --- Identificadores reales de la base sembrada --------------------------
  const [pintura, gasfiteria, carlosBd, mariaBd] = await Promise.all([
    prisma.categoria.findUnique({
      where: { nombre: 'Pintura' },
      include: { subcategorias: { orderBy: { id: 'asc' } } },
    }),
    prisma.categoria.findUnique({ where: { nombre: 'Gasfitería' } }),
    prisma.usuario.findUnique({
      where: { email: 'carlos@conectaia.com' },
      include: { servicios: true },
    }),
    prisma.usuario.findUnique({ where: { email: 'maria@conectaia.com' } }),
  ])

  const servicioCarlos = carlosBd.servicios[0]
  const interiores = pintura.subcategorias.find((s) => s.nombre === 'Pintura de interiores')
  const exteriores = pintura.subcategorias.find((s) => s.nombre === 'Pintura de exteriores')

  const necesidadDemo = await prisma.necesidad.findFirst({ where: { usuarioId: mariaBd.id } })

  // =========================================================================
  console.log('1. Autenticación')
  const maria = crearSesion()
  const carlos = crearSesion()

  const rMaria = await maria.entrar('maria@conectaia.com', 'demo123')
  ok(rMaria.entro, 'María entra con sus credenciales', JSON.stringify(rMaria))

  const rCarlos = await carlos.entrar('carlos@conectaia.com', 'demo123')
  ok(rCarlos.entro, 'Carlos entra con sus credenciales', JSON.stringify(rCarlos))

  const anon = crearSesion()
  const malas = await anon.entrar('maria@conectaia.com', 'contrasena-incorrecta')
  ok(!malas.entro, 'Una contraseña incorrecta NO abre sesión')

  // El administrador entra desde el principio porque hace falta para casi todo:
  // desde que existe la moderación previa, NADA se publica sin que él lo
  // apruebe. Publicar deja el aviso en `en_revision`.
  const admin = crearSesion()
  const rAdmin = await admin.entrar('admin@conectaia.com', 'admin123')
  ok(rAdmin.entro, 'El administrador entra')

  /** Aprueba una publicación como lo haría el admin desde su cola. */
  const aprobar = (tipo, id) =>
    admin.json(`/api/admin/aprobaciones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, accion: 'aprobar' }),
    })

  // =========================================================================
  console.log('\n2. Antievasión (PDR §24)')
  const conTelefono = await maria.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Arreglar caño de la cocina',
      descripcion: 'Se necesita cambiar el caño de la cocina. Llámame al 987654321 para coordinar.',
      categoriaId: gasfiteria.id,
      ciudad: 'Cajamarca',
      precioOfrecido: 80,
      publicar: '1',
    }),
  })
  ok(
    conTelefono.estado === 422 && conTelefono.datos.motivo === 'antievasion',
    'Publicar con un teléfono en la descripción queda bloqueado',
    `estado ${conTelefono.estado}`,
  )

  const conLetras = await maria.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Arreglar caño de la cocina',
      descripcion:
        'Se necesita cambiar el caño de la cocina. Mi numero es nueve ocho siete seis cinco cuatro tres dos uno.',
      categoriaId: gasfiteria.id,
      ciudad: 'Cajamarca',
      publicar: '1',
    }),
  })
  ok(conLetras.estado === 422, 'Un teléfono escrito con letras también se detecta')

  const conCorreo = await maria.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Arreglar caño de la cocina',
      descripcion: 'Se necesita cambiar el caño de la cocina. Escríbeme a maria arroba gmail punto com.',
      categoriaId: gasfiteria.id,
      ciudad: 'Cajamarca',
      publicar: '1',
    }),
  })
  ok(conCorreo.estado === 422, 'Un correo disimulado también se detecta')

  // =========================================================================
  console.log('\n3. María publica una necesidad (PDR §7)')
  const nueva = await maria.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Pintar la sala de mi casa',
      descripcion:
        'Necesito pintar la sala, unos 18 m2. Requiere lijado y resanado de algunas partes de la pared. Mismo color que tiene ahora.',
      categoriaId: pintura.id,
      subcategoriaId: interiores.id,
      ciudad: 'Cajamarca',
      distrito: 'Baños del Inca',
      precioOfrecido: 150,
      horario: 'Mañanas',
      publicar: '1',
    }),
  })
  ok(nueva.estado === 200 && nueva.datos.id, 'La necesidad se envía', JSON.stringify(nueva.datos))
  const necesidadId = nueva.datos.id

  // Moderación previa: "Publicar" NO publica, deja el aviso esperando revisión.
  ok(nueva.datos.estado === 'en_revision', 'Queda EN REVISIÓN, no publicada')

  // Ojo: React separa los nodos de texto con <!-- -->, así que "revisando tu
  // necesidad" no aparece entero en el HTML. Se busca el trozo que no se parte.
  const fichaEnRevision = await (await maria.pedir(`/necesidades/${necesidadId}`)).text()
  ok(
    fichaEnRevision.includes('Estamos revisando tu'),
    'A María se le dice que se está revisando',
  )
  ok(
    fichaEnRevision.includes('te avisaremos'),
    'Y que no tiene que hacer nada más: se publicará sola',
  )

  const escaparateAntes = await (await anon.pedir('/buscar?tipo=necesidad')).text()
  ok(
    !escaparateAntes.includes('Pintar la sala de mi casa'),
    'Mientras se revisa NO aparece en el escaparate público',
  )

  const publicarseSolo = await maria.json(`/api/necesidades/${necesidadId}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'publicada' }),
  })
  ok(
    publicarseSolo.estado === 409,
    'El dueño NO puede publicarla por su cuenta llamando a la API',
    `estado ${publicarseSolo.estado}`,
  )

  const apruebaUsuario = await carlos.json(`/api/admin/aprobaciones/${necesidadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo: 'necesidad', accion: 'aprobar' }),
  })
  ok(apruebaUsuario.estado === 403, 'Y un usuario normal tampoco puede aprobar nada')

  const colaAdmin = await (await admin.pedir('/admin/necesidades')).text()
  ok(colaAdmin.includes('Esperando aprobación'), 'Al admin le aparece la cola de aprobación')
  ok(colaAdmin.includes('Pintar la sala de mi casa'), 'Con el texto completo para poder leerlo')

  const aprobada = await aprobar('necesidad', necesidadId)
  ok(aprobada.estado === 200 && aprobada.datos.estado === 'publicada', 'El admin la aprueba')

  const aprobarDeNuevo = await aprobar('necesidad', necesidadId)
  ok(aprobarDeNuevo.estado === 409, 'Aprobar dos veces lo mismo se rechaza')

  const escaparateDespues = await (await anon.pedir('/buscar?tipo=necesidad')).text()
  ok(
    escaparateDespues.includes('Pintar la sala de mi casa'),
    'Ya aprobada, aparece en el escaparate público',
  )

  // =========================================================================
  console.log('\n3a. Los créditos de regalo los decide el administrador')

  // Es la palanca de la etapa de prueba: con más créditos de regalo, la gente
  // puede contactar sin recargar. Se comprueba que el número que pone el admin
  // es EXACTAMENTE el que recibe la cuenta nueva, y que entra como movimiento
  // —no escribiendo el saldo a mano—, o el histórico dejaría de cuadrar.
  const ponerRegalo = (n) =>
    admin.json('/api/admin/configuracion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creditos_bienvenida: String(n) }),
    })

  for (const cuantos of [7, 0]) {
    ok((await ponerRegalo(cuantos)).estado === 200, `El admin pone ${cuantos} créditos de regalo`)

    const correo = `regalo+${Date.now()}${Math.random().toString(36).slice(2, 5)}@conectaia.com`
    const alta = await crearSesion().json('/api/registro', jsonBody({
      nombres: 'Prueba',
      apellidos: 'Regalo',
      email: correo,
      password: 'demo123',
      ciudad: 'Cajamarca',
      modo: 'busco',
    }))
    const nuevo = await prisma.usuario.findUnique({
      where: { id: alta.datos.id },
      select: { creditos: true, movimientos: { select: { tipo: true, cantidad: true } } },
    })
    ok(nuevo.creditos === cuantos, `La cuenta nueva recibe exactamente ${cuantos} (${nuevo.creditos})`)
    ok(
      cuantos === 0
        ? nuevo.movimientos.length === 0
        : nuevo.movimientos.length === 1 && nuevo.movimientos[0].cantidad === cuantos,
      cuantos === 0
        ? 'Con 0 no se inventa ningún movimiento'
        : 'Y entra como movimiento, así el histórico cuadra con el saldo',
    )
    await prisma.usuario.delete({ where: { id: alta.datos.id } })
  }

  // Se deja como estaba para no alterar los pasos siguientes.
  await ponerRegalo(1)

  // =========================================================================
  console.log('\n3b. Rechazo, badges y el agujero de editar lo ya aprobado')

  const paraRechazar = await maria.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Necesito ayuda con la mudanza del sábado',
      descripcion: 'Tengo que mudar los muebles de un departamento a otro, mismo distrito.',
      categoriaId: gasfiteria.id,
      ciudad: 'Cajamarca',
      publicar: '1',
    }),
  })

  const rechazoSinMotivo = await admin.json(`/api/admin/aprobaciones/${paraRechazar.datos.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo: 'necesidad', accion: 'rechazar', motivo: 'no' }),
  })
  ok(rechazoSinMotivo.estado === 400, 'No se puede rechazar sin explicar por qué')

  const rechazo = await admin.json(`/api/admin/aprobaciones/${paraRechazar.datos.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo: 'necesidad',
      accion: 'rechazar',
      motivo: 'La categoría no corresponde: una mudanza no es gasfitería.',
    }),
  })
  ok(rechazo.estado === 200 && rechazo.datos.estado === 'rechazada', 'El admin la rechaza')

  const fichaRechazada = await (await maria.pedir(`/necesidades/${paraRechazar.datos.id}`)).text()
  ok(fichaRechazada.includes('no fue aprobada'), 'A María se le dice que no se aprobó')
  ok(fichaRechazada.includes('una mudanza no es gasfitería'), 'Y se le dice exactamente por qué')

  // El badge del menú es lo único que convierte "hay una cola" en "hay trabajo
  // pendiente": sin él, una publicación espera a que a alguien se le ocurra
  // entrar a mirar.
  const pendientesAntes = await prisma.necesidad.count({ where: { estado: 'en_revision' } })
  const enRevisionParaBadge = await maria.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Cambiar la chapa de la puerta principal',
      descripcion: 'La chapa de la puerta principal está fallando y quiero cambiarla por una nueva.',
      categoriaId: gasfiteria.id,
      ciudad: 'Cajamarca',
      publicar: '1',
    }),
  })
  ok(
    (await prisma.necesidad.count({ where: { estado: 'en_revision' } })) === pendientesAntes + 1,
    'Enviar a revisión sube el contador de pendientes del admin',
  )
  const menuConBadge = await (await admin.pedir('/admin')).text()
  ok(menuConBadge.includes('bg-rose-500'), 'El menú del admin pinta el badge de pendientes')

  // ⚠️ Sin esto la aprobación sería teatro: se publica algo inocente, se espera
  // el visto bueno y luego se edita para meter lo que la revisión impedía.
  const editada = await maria.json(`/api/necesidades/${necesidadId}`, {
    method: 'PATCH',
    body: form({
      titulo: 'Pintar la sala de mi casa',
      descripcion:
        'Necesito pintar la sala, unos 18 m2. Requiere lijado y resanado. Cambié el texto después de que me la aprobaran.',
      categoriaId: pintura.id,
      subcategoriaId: interiores.id,
      ciudad: 'Cajamarca',
      precioOfrecido: 150,
    }),
  })
  ok(
    editada.estado === 200 && editada.datos.estado === 'en_revision',
    'Editar una necesidad YA APROBADA la devuelve a revisión',
    JSON.stringify(editada.datos),
  )
  const fueraDelEscaparate = await (await anon.pedir('/buscar?tipo=necesidad')).text()
  ok(
    !fueraDelEscaparate.includes('Pintar la sala de mi casa'),
    'Y mientras se revisa de nuevo desaparece del escaparate',
  )

  await aprobar('necesidad', necesidadId)
  ok(
    (await prisma.necesidad.findUnique({ where: { id: necesidadId } })).estado === 'publicada',
    'Vuelve a publicarse cuando el admin la aprueba otra vez',
  )
  // Se limpia lo que sobra para no ensuciar los pasos siguientes.
  await prisma.necesidad.deleteMany({
    where: { id: { in: [paraRechazar.datos.id, enRevisionParaBadge.datos.id] } },
  })

  // =========================================================================
  console.log('\n4. Matching automático (PDR §17-19)')
  const oportunidades = await carlos.pedir('/oportunidades')
  ok(oportunidades.status === 200, 'Carlos abre sus oportunidades')

  const htmlOp = await (await carlos.pedir('/oportunidades')).text()
  ok(
    htmlOp.includes('Pintar la sala de mi casa'),
    'La necesidad de María aparece como oportunidad de Carlos',
  )
  const matchId = Number(htmlOp.match(/\/oportunidades\/(\d+)"/)?.[1])
  ok(Number.isInteger(matchId), 'Se puede abrir la coincidencia', `matchId=${matchId}`)

  // =========================================================================
  console.log('\n5. Reglas de postulación (PDR §11)')
  const propia = await maria.json('/api/postulaciones', jsonBody({
    necesidadId,
    precio: 100,
    comentario: 'Me postulo a mi propia necesidad, no debería poder.',
  }))
  ok(propia.estado === 403, 'Nadie puede postularse a su propia necesidad')

  const postulacion = await carlos.json('/api/postulaciones', jsonBody({
    necesidadId,
    servicioId: servicioCarlos.id,
    precio: 140,
    comentario: 'Puedo realizar el trabajo el sábado. Incluye lijado, resanado y dos manos de pintura.',
    tiempoEstimado: '5 horas',
    disponibilidad: 'Sábado por la mañana',
  }))
  ok(postulacion.estado === 200, 'Carlos se postula', JSON.stringify(postulacion.datos))

  const repetida = await carlos.json('/api/postulaciones', jsonBody({
    necesidadId,
    precio: 130,
    comentario: 'Intento postularme otra vez a la misma necesidad.',
  }))
  ok(repetida.estado === 409, 'No se puede postular dos veces al mismo trabajo')

  const conTelefonoEnOferta = await carlos.json('/api/postulaciones', jsonBody({
    necesidadId: necesidadDemo.id,
    precio: 90,
    comentario: 'Puedo hacerlo mañana, coordinemos por WhatsApp al 987333444.',
  }))
  ok(conTelefonoEnOferta.estado === 422, 'Una oferta con teléfono en el comentario queda bloqueada')

  // =========================================================================
  console.log('\n6. Los datos privados están ocultos antes de pagar (PDR §12, §23)')
  const detalleMaria = await (await maria.pedir(`/necesidades/${necesidadId}`)).text()
  ok(detalleMaria.includes('140.00'), 'María ve el precio ofertado por Carlos')
  ok(detalleMaria.includes('Carlos'), 'María ve el nombre de Carlos')
  ok(
    !detalleMaria.includes('987333444'),
    'María NO ve el celular de Carlos antes de aceptar la oferta',
  )

  const oportunidadCarlos = await (await carlos.pedir(`/oportunidades/${matchId}`)).text()
  ok(
    !oportunidadCarlos.includes('987111222'),
    'Carlos NO ve el celular de María antes de desbloquear',
  )

  // =========================================================================
  console.log('\n7. María acepta la oferta y paga el crédito (PDR §13-16)')
  const saldoAntes = await creditos(maria)
  const saldoCarlosAntes = await creditos(carlos)

  const aceptar = await maria.json(`/api/necesidades/${necesidadId}/aceptar`, jsonBody({
    postulacionId: postulacion.datos.id,
  }))
  ok(aceptar.estado === 200, 'La oferta se acepta', JSON.stringify(aceptar.datos))
  ok(aceptar.datos.creditosConsumidos === 1, 'Se consume exactamente 1 crédito')

  const saldoDespues = await creditos(maria)
  const saldoCarlosDespues = await creditos(carlos)
  ok(saldoDespues === saldoAntes - 1, `María pasa de ${saldoAntes} a ${saldoDespues} créditos`)
  ok(
    saldoCarlosDespues === saldoCarlosAntes,
    `Carlos NO paga por el mismo contacto (sigue en ${saldoCarlosDespues})`,
  )

  const trabajoId = aceptar.datos.trabajoId

  // =========================================================================
  console.log('\n8. Contacto desbloqueado para AMBOS (PDR §16)')
  const trabajoMaria = await (await maria.pedir(`/trabajos/${trabajoId}`)).text()
  ok(trabajoMaria.includes('987333444'), 'María ya ve el celular de Carlos')

  const trabajoCarlos = await (await carlos.pedir(`/trabajos/${trabajoId}`)).text()
  ok(
    trabajoCarlos.includes('987111222'),
    'Carlos ya ve el celular de María sin haber pagado nada',
  )

  // =========================================================================
  console.log('\n9. La necesidad deja de recibir ofertas (PDR §11)')
  const tarde = await carlos.json('/api/postulaciones', jsonBody({
    necesidadId,
    precio: 120,
    comentario: 'Intento postularme cuando ya se eligió a alguien.',
  }))
  ok(tarde.estado === 409, 'Ya no se aceptan postulaciones nuevas')

  // =========================================================================
  console.log('\n10. Calificación (PDR §26-27)')
  const antesDeTerminar = await maria.json('/api/calificaciones', jsonBody({
    trabajoId,
    estrellas: 5,
    comentario: 'Intento calificar antes de que termine el trabajo.',
  }))
  ok(antesDeTerminar.estado === 409, 'No se puede calificar antes de finalizar')

  const finalizar = await maria.json(`/api/trabajos/${trabajoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'finalizado' }),
  })
  ok(finalizar.estado === 200, 'El trabajo se marca como finalizado')

  const calif1 = await maria.json('/api/calificaciones', jsonBody({
    trabajoId,
    estrellas: 5,
    comentario: 'Excelente trabajo, muy prolijo y puntual.',
  }))
  ok(calif1.estado === 200, 'María califica a Carlos')

  const duplicada = await maria.json('/api/calificaciones', jsonBody({
    trabajoId,
    estrellas: 4,
    comentario: 'Intento calificar dos veces el mismo trabajo.',
  }))
  ok(duplicada.estado === 409, 'No se puede calificar dos veces el mismo trabajo')

  const calif2 = await carlos.json('/api/calificaciones', jsonBody({
    trabajoId,
    estrellas: 5,
    comentario: 'Clienta muy clara con lo que necesitaba. Todo en orden.',
  }))
  ok(calif2.estado === 200, 'Carlos califica a María (reputación bidireccional)')

  const ajeno = await anon.json('/api/calificaciones', jsonBody({ trabajoId, estrellas: 1 }))
  ok(ajeno.estado === 401, 'Alguien sin sesión no puede calificar')

  // =========================================================================
  console.log('\n11. Perfil público (PDR §25)')
  const perfil = await (await anon.pedir(`/u/${carlosBd.id}`)).text()
  ok(perfil.includes('Carlos'), 'El perfil público de Carlos se ve sin iniciar sesión')
  ok(!perfil.includes('987333444'), 'El perfil público NO muestra el celular')
  ok(!perfil.includes('carlos@conectaia.com'), 'El perfil público NO muestra el correo')

  // =========================================================================
  console.log('\n12. Permisos por rol')
  const adminDesdeUsuario = await maria.pedir('/admin')
  ok(
    adminDesdeUsuario.status === 307 || adminDesdeUsuario.status === 302,
    'Un usuario normal no entra al panel de administración',
    `estado ${adminDesdeUsuario.status}`,
  )

  const apiAdmin = await maria.json('/api/admin/creditos', jsonBody({
    usuarioId: mariaBd.id,
    cantidad: 100,
    motivo: 'Intento regalarme créditos a mí misma',
  }))
  ok(apiAdmin.estado === 403, 'Un usuario normal no puede ajustar créditos por la API')

  const panelAdmin = await admin.pedir('/admin')
  ok(panelAdmin.status === 200, 'El administrador sí ve su panel')

  // =========================================================================
  console.log('\n13. Devolución manual de créditos (PDR §32)')
  const devolucion = await admin.json('/api/admin/creditos', jsonBody({
    usuarioId: mariaBd.id,
    cantidad: 1,
    tipo: 'devolucion',
    motivo: 'Devolución de prueba del flujo automatizado',
  }))
  ok(devolucion.estado === 200, 'El admin puede devolver créditos')
  ok(devolucion.datos.saldo === saldoDespues + 1, `El saldo de María vuelve a ${devolucion.datos.saldo}`)

  const sinMotivo = await admin.json('/api/admin/creditos', jsonBody({
    usuarioId: mariaBd.id,
    cantidad: 5,
    tipo: 'ajuste',
    motivo: '',
  }))
  ok(sinMotivo.estado === 400, 'Un ajuste sin motivo se rechaza (todo debe ser auditable)')

  // =========================================================================
  // El OTRO camino al desbloqueo: quien ofrece el servicio da el primer paso.
  // Hace falta una tercera persona porque María y Carlos ya se desbloquearon
  // en el paso 7, y el cobro es por PAREJA: entre ellos ya no se cobra más.
  console.log('\n14. Caso B — quien ofrece contacta desde una oportunidad (PDR §15-B)')

  const segunda = await maria.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Pintar la fachada de la casa',
      descripcion:
        'Necesito pintar la fachada de mi casa de dos pisos. Incluye lijado previo y resanado de grietas pequeñas.',
      categoriaId: pintura.id,
      subcategoriaId: exteriores.id,
      ciudad: 'Cajamarca',
      precioOfrecido: 400,
      publicar: '1',
    }),
  })
  ok(segunda.estado === 200, 'María envía una segunda necesidad')
  await aprobar('necesidad', segunda.datos.id)

  // Rosa se registra desde cero: de paso se prueba el alta y los créditos de
  // bienvenida, que son justo lo que necesita para pagar un desbloqueo.
  const rosa = crearSesion()
  const alta = await rosa.json('/api/registro', jsonBody({
    nombres: 'Rosa',
    apellidos: 'Huamán',
    email: `rosa+${Date.now()}@conectaia.com`,
    password: 'demo123',
    celular: '987555666',
    ciudad: 'Cajamarca',
    // Entró por la puerta "Busco un servicio" de la portada: la cuenta nace ya con
    // ese lado, que es lo que el formulario de registro manda.
    modo: 'busco',
  }))
  ok(alta.estado === 200, 'Rosa crea su cuenta', JSON.stringify(alta.datos))

  const rosaBd = await prisma.usuario.findUnique({
    where: { id: alta.datos.id },
    select: { email: true, modo: true },
  })
  ok(rosaBd.modo === 'busco', 'La cuenta nace con el lado que eligió al registrarse')

  const rRosa = await rosa.entrar(rosaBd.email, 'demo123')
  ok(rRosa.entro, 'Rosa entra con su cuenta recién creada')

  // Ya eligió al registrarse, así que entrar no le pregunta nada más.
  const alPanel = await rosa.pedir('/panel')
  ok(alPanel.status === 200, 'Al entrar va directa al panel, sin ninguna pregunta', `estado ${alPanel.status} -> ${alPanel.headers.get('location')}`)

  // Pero el lado que NO eligió sigue cerrado, y no solo en el menú.
  const publicarSinModo = await rosa.json('/api/servicios', {
    method: 'POST',
    body: form({
      nombre: 'Intento publicar con el lado de la oferta apagado',
      descripcion: 'Esto no debería poder publicarse porque solo activé el lado de la demanda.',
      categoriaId: pintura.id,
      ciudad: 'Cajamarca',
      publicar: '1',
    }),
  })
  ok(
    publicarSinModo.estado === 403 && publicarSinModo.datos.motivo === 'modo',
    'Con el lado apagado no se puede publicar ni llamando a la API a mano',
    `estado ${publicarSinModo.estado}`,
  )

  // Rosa se pasa al otro lado, que es lo que hacen los dos botones del panel.
  const elegir = await rosa.json('/api/perfil/modo', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modo: 'ofrezco' }),
  })
  ok(elegir.estado === 200, 'Rosa se pasa al lado de la oferta')

  const modoInvalido = await rosa.json('/api/perfil/modo', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modo: 'inventado' }),
  })
  ok(modoInvalido.estado === 400, 'Un modo que no existe se rechaza')

  // 'ambos' ya no existe: se rechaza igual que cualquier otro invento. Si algún
  // día alguien lo reintroduce solo en la API, el menú y el panel seguirían
  // enseñando un lado y el usuario no entendería nada.
  const yaNoHayAmbos = await rosa.json('/api/perfil/modo', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modo: 'ambos' }),
  })
  ok(yaNoHayAmbos.estado === 400, 'El desaparecido modo "ambos" también se rechaza')

  const rosaInicial = await creditos(rosa)
  ok(rosaInicial === 1, `Rosa recibe su crédito de bienvenida (${rosaInicial})`)

  const servicioRosa = await rosa.json('/api/servicios', {
    method: 'POST',
    body: form({
      nombre: 'Pintura de fachadas y exteriores',
      descripcion:
        'Pinto fachadas, muros y exteriores. Trabajo con andamios propios e incluyo lijado y resanado de grietas.',
      categoriaId: pintura.id,
      subcategoriaId: exteriores.id,
      ciudad: 'Cajamarca',
      precioDesde: 350,
      disponibilidad: 'Lunes a viernes',
      publicar: '1',
    }),
  })
  ok(servicioRosa.estado === 200, 'Rosa envía su servicio')
  await aprobar('servicio', servicioRosa.datos.id)

  const htmlOpRosa = await (await rosa.pedir('/oportunidades')).text()
  ok(
    htmlOpRosa.includes('Pintar la fachada de la casa'),
    'La necesidad de María le aparece a Rosa como oportunidad',
  )
  const matchRosa = Number(htmlOpRosa.match(/\/oportunidades\/(\d+)"/)?.[1])

  const opAntes = await (await rosa.pedir(`/oportunidades/${matchRosa}`)).text()
  ok(!opAntes.includes('987111222'), 'Rosa NO ve el celular de María antes de pagar')

  const mariaAntes = await creditos(maria)

  const contactar = await rosa.json(`/api/oportunidades/${matchRosa}/contactar`, { method: 'POST' })
  ok(contactar.estado === 200, 'Rosa desbloquea el contacto', JSON.stringify(contactar.datos))
  ok(contactar.datos.creditosConsumidos === 1, 'Se consume exactamente 1 crédito')

  const rosaDespues = await creditos(rosa)
  const mariaDespues = await creditos(maria)
  ok(rosaDespues === rosaInicial - 1, `Paga Rosa, que es quien inicia: de ${rosaInicial} a ${rosaDespues}`)
  ok(mariaDespues === mariaAntes, `María NO paga por este contacto (sigue en ${mariaDespues})`)

  const opDespues = await (await rosa.pedir(`/oportunidades/${matchRosa}`)).text()
  ok(opDespues.includes('987111222'), 'Rosa ya ve el celular de María')

  const repetir = await rosa.json(`/api/oportunidades/${matchRosa}/contactar`, { method: 'POST' })
  ok(
    repetir.estado === 200 && repetir.datos.creditosConsumidos === 0,
    'Desbloquear otra vez el mismo contacto NO vuelve a cobrar',
  )

  const sinSaldo = await rosa.json(`/api/oportunidades/${matchRosa}/contactar`, { method: 'POST' })
  ok(sinSaldo.estado === 200, 'Rosa se quedó sin créditos pero ya tiene el contacto abierto')

  // El cobro es por pareja: una SEGUNDA necesidad de María no le vuelve a
  // cobrar a Carlos, que ya tiene su teléfono desde el paso 7.
  const carlosAntes = await creditos(carlos)
  const htmlOpCarlos = await (await carlos.pedir('/oportunidades')).text()
  const idsCarlos = [...htmlOpCarlos.matchAll(/\/oportunidades\/(\d+)"/g)].map((m) => Number(m[1]))
  const match2 = idsCarlos.find((id) => id !== matchId)

  if (Number.isInteger(match2)) {
    const otra = await carlos.json(`/api/oportunidades/${match2}/contactar`, { method: 'POST' })
    ok(
      otra.estado === 200 && otra.datos.creditosConsumidos === 0,
      'Otra necesidad de la MISMA persona no se vuelve a cobrar',
      JSON.stringify(otra.datos),
    )
    ok(
      (await creditos(carlos)) === carlosAntes,
      'El saldo de Carlos no se mueve por un contacto que ya tenía',
    )
  }

  // =========================================================================
  console.log('\n14b. Caso C — quien busca contacta a un profesional compatible')

  // El espejo del caso B: quien publicó la necesidad ve un servicio compatible y
  // decide dar ella el primer paso. Paga quien inicia, igual que siempre.
  //
  // Diana es nueva y no se ha cruzado nunca con Carlos: así el cobro tiene que
  // ocurrir de verdad y no lo tapa la regla del cobro por pareja.
  const diana = crearSesion()
  const altaDiana = await diana.json('/api/registro', jsonBody({
    nombres: 'Diana',
    apellidos: 'Vásquez',
    email: `diana+${Date.now()}@conectaia.com`,
    password: 'demo123',
    celular: '987444555',
    ciudad: 'Cajamarca',
    modo: 'busco',
  }))
  ok(altaDiana.estado === 200, 'Diana crea su cuenta del lado de la demanda')

  const dianaBd = await prisma.usuario.findUnique({
    where: { id: altaDiana.datos.id },
    select: { email: true },
  })
  ok((await diana.entrar(dianaBd.email, 'demo123')).entro, 'Diana entra')

  const necesidadDiana = await diana.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Pintar el frontis de mi tienda',
      descripcion:
        'Necesito pintar el frontis de mi tienda, son unos 30 metros cuadrados de pared exterior.',
      categoriaId: pintura.id,
      subcategoriaId: exteriores.id,
      ciudad: 'Cajamarca',
      precioOfrecido: 400,
      urgencia: 'esta_semana',
      publicar: '1',
    }),
  })
  ok(necesidadDiana.estado === 200, 'Diana envía su necesidad')
  await aprobar('necesidad', necesidadDiana.datos.id)

  // "Para cuándo" se elige entre opciones. La fecha exacta solo se guarda si se
  // pide una fecha exacta: si no, quedaría escondida en la base y reaparecería
  // al volver a marcar "fecha exacta".
  const guardada = await prisma.necesidad.findUnique({
    where: { id: necesidadDiana.datos.id },
    select: { urgencia: true, fechaDeseada: true },
  })
  ok(guardada.urgencia === 'esta_semana', 'Se guarda la urgencia elegida')
  ok(guardada.fechaDeseada === null, 'Sin "fecha exacta" no se guarda ninguna fecha')

  const conFechaSuelta = await diana.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Cambiar el cableado del taller',
      descripcion: 'Necesito revisar y cambiar el cableado antiguo del taller, son dos ambientes.',
      categoriaId: pintura.id,
      ciudad: 'Cajamarca',
      urgencia: 'cuanto_antes',
      // Llega una fecha aunque la urgencia no sea "fecha_fija": tiene que
      // descartarse, no colarse.
      fechaDeseada: '2030-01-01',
    }),
  })
  ok(
    (
      await prisma.necesidad.findUnique({
        where: { id: conFechaSuelta.datos.id },
        select: { fechaDeseada: true },
      })
    ).fechaDeseada === null,
    'Una fecha que llega sin corresponder se descarta',
  )

  // "Otro (especificar)": la lista de subcategorías la fija el administrador y
  // nunca lo cubre todo. Sin esta salida, quien no se ve reflejado elige la que
  // más se le parece —y ensucia el matching de esa otra— o deja el campo vacío.
  const conOtro = await diana.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Pintura epóxica para el piso del taller',
      descripcion: 'Necesito aplicar pintura epóxica en el piso del taller, unos 40 metros cuadrados.',
      categoriaId: pintura.id,
      subcategoriaOtra: 'Pintura epóxica para pisos',
      ciudad: 'Cajamarca',
    }),
  })
  const nOtro = await prisma.necesidad.findUnique({
    where: { id: conOtro.datos.id },
    select: { subcategoriaId: true, subcategoriaOtra: true, claves: true },
  })
  ok(nOtro.subcategoriaOtra === 'Pintura epóxica para pisos', 'Se guarda la subcategoría escrita a mano')
  ok(nOtro.subcategoriaId === null, 'Y NO se guarda ningún identificador: son excluyentes')
  ok(nOtro.claves.includes('epoxica'), 'El texto entra en las claves, así que el matching lo aprovecha')

  // El espejo del problema de la fecha: al pasar a una subcategoría de la lista
  // el texto libre tiene que IRSE, o se queda escondido en la base y reaparece.
  await diana.json(`/api/necesidades/${conOtro.datos.id}`, {
    method: 'PATCH',
    body: form({
      titulo: 'Pintura epóxica para el piso del taller',
      descripcion: 'Necesito aplicar pintura epóxica en el piso del taller, unos 40 metros cuadrados.',
      categoriaId: pintura.id,
      subcategoriaId: exteriores.id,
      subcategoriaOtra: '',
      ciudad: 'Cajamarca',
    }),
  })
  const nCambiada = await prisma.necesidad.findUnique({
    where: { id: conOtro.datos.id },
    select: { subcategoriaId: true, subcategoriaOtra: true },
  })
  ok(
    nCambiada.subcategoriaId === exteriores.id && nCambiada.subcategoriaOtra === null,
    'Al elegir una subcategoría de la lista, el texto de "Otro" se borra',
  )
  await prisma.necesidad.delete({ where: { id: conOtro.datos.id } })

  const urgenciaInventada = await diana.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Instalar dos puntos de luz en el patio',
      descripcion: 'Quiero instalar dos puntos de luz exteriores en el patio de atrás de la casa.',
      categoriaId: pintura.id,
      ciudad: 'Cajamarca',
      urgencia: 'para_ayer',
    }),
  })
  ok(
    urgenciaInventada.estado === 200 &&
      (
        await prisma.necesidad.findUnique({
          where: { id: urgenciaInventada.datos.id },
          select: { urgencia: true },
        })
      ).urgencia === null,
    'Una urgencia que no existe se descarta sin tumbar la publicación',
  )

  const matchDiana = await prisma.match.findFirst({
    where: { necesidadId: necesidadDiana.datos.id, servicioId: servicioCarlos.id },
  })
  ok(!!matchDiana, 'El servicio de Carlos le sale a Diana como compatible')

  // La tarjeta tiene que llevar a la ficha de la COINCIDENCIA, no a la ficha
  // pública del servicio: ahí no había ninguna acción posible.
  const listaDiana = await (await diana.pedir('/oportunidades')).text()
  ok(
    listaDiana.includes(`/oportunidades/${matchDiana.id}`),
    'La tarjeta enlaza a la coincidencia, no a la ficha pública del servicio',
  )
  ok(!listaDiana.includes(`/p/servicio/${servicioCarlos.id}`), 'Ya no lleva al callejón sin salida')

  const fichaAntes = await diana.pedir(`/oportunidades/${matchDiana.id}`)
  const htmlAntes = await fichaAntes.text()
  ok(fichaAntes.status === 200, 'Diana abre la ficha desde el lado de quien pide')
  ok(htmlAntes.includes('Por qué te lo mostramos'), 'Y ve el desglose del puntaje, como el proveedor')
  ok(!htmlAntes.includes('987333444'), 'Diana NO ve el celular de Carlos antes de pagar')
  ok(htmlAntes.includes('1 crédito'), 'El coste va escrito en el propio botón (PDR §13)')

  // La coincidencia queda contada como consultada por este lado, que antes no
  // sumaba nunca a la métrica del PDR §40.
  ok(
    (await prisma.match.findUnique({ where: { id: matchDiana.id } })).vistoAt !== null,
    'Abrirla cuenta como coincidencia consultada (PDR §40)',
  )

  const carlosAntesC = await creditos(carlos)
  const dianaAntes = await creditos(diana)
  ok(dianaAntes === 1, `Diana parte de su crédito de bienvenida (${dianaAntes})`)

  const ajena = await maria.json(`/api/oportunidades/${matchDiana.id}/contactar`, { method: 'POST' })
  ok(ajena.estado === 403, 'Un tercero no puede contactar por una coincidencia que no es suya')

  const contactarC = await diana.json(`/api/oportunidades/${matchDiana.id}/contactar`, {
    method: 'POST',
  })
  ok(contactarC.estado === 200, 'Diana desbloquea el contacto', JSON.stringify(contactarC.datos))
  ok(contactarC.datos.creditosConsumidos === 1, 'Se consume exactamente 1 crédito')

  ok((await creditos(diana)) === 0, 'Paga Diana, que es quien inicia')
  ok(
    (await creditos(carlos)) === carlosAntesC,
    `Carlos NO paga por este contacto (sigue en ${carlosAntesC})`,
  )

  const htmlDespues = await (await diana.pedir(`/oportunidades/${matchDiana.id}`)).text()
  ok(htmlDespues.includes('987333444'), 'Diana ya ve el celular de Carlos')

  // Y la contraparte ve los datos de Diana sin pagar nada: el desbloqueo abre
  // el canal en los DOS sentidos. Se mira en SU vista de la misma coincidencia
  // —él es el dueño del servicio—, no en la ficha pública de la necesidad: esa
  // no enseña contactos a nadie, haya desbloqueo o no.
  const mismaCoincidenciaCarlos = await (
    await carlos.pedir(`/oportunidades/${matchDiana.id}`)
  ).text()
  ok(
    mismaCoincidenciaCarlos.includes('987444555'),
    'Carlos ve el celular de Diana sin haber pagado nada',
  )
  const publicaDiana = await (await anon.pedir(`/p/necesidad/${necesidadDiana.datos.id}`)).text()
  ok(
    !publicaDiana.includes('987444555'),
    'Y la ficha pública sigue sin enseñar el celular a nadie más',
  )

  const repetirC = await diana.json(`/api/oportunidades/${matchDiana.id}/contactar`, {
    method: 'POST',
  })
  ok(
    repetirC.estado === 200 && repetirC.datos.creditosConsumidos === 0,
    'Volver a desbloquear el mismo contacto NO cobra otra vez',
  )

  // =========================================================================
  console.log('\n15. Recarga de créditos por Yape (PDR §29)')

  // PNG de 1x1 píxel, para que el comprobante sea un archivo de imagen real.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const fd = new FormData()
  fd.append('paqueteId', '1')
  fd.append('operacion', '00123456')
  fd.append('comprobante', new Blob([png], { type: 'image/png' }), 'comprobante.png')

  const recarga = await carlos.json('/api/recargas', { method: 'POST', body: fd })
  ok(recarga.estado === 200 && recarga.datos.id, 'Carlos registra una recarga', JSON.stringify(recarga.datos))

  const carlosSaldo = await creditos(carlos)
  const saldoTrasSolicitar = carlosSaldo
  ok(
    saldoTrasSolicitar === carlosSaldo,
    'Registrar la recarga NO acredita créditos por sí solo',
  )

  const fd2 = new FormData()
  fd2.append('paqueteId', '2')
  fd2.append('comprobante', new Blob([png], { type: 'image/png' }), 'otro.png')
  const segundaRecarga = await carlos.json('/api/recargas', { method: 'POST', body: fd2 })
  ok(segundaRecarga.estado === 409, 'No se puede tener dos recargas pendientes a la vez')

  const aprobarRecarga = await admin.json(`/api/admin/recargas/${recarga.datos.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'aprobada' }),
  })
  ok(aprobarRecarga.estado === 200, 'El admin aprueba la recarga')

  const saldoFinal = await creditos(carlos)
  ok(saldoFinal === carlosSaldo + 5, `Se acreditan los 5 créditos del paquete (${saldoFinal})`)

  const reaprobar = await admin.json(`/api/admin/recargas/${recarga.datos.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'aprobada' }),
  })
  ok(reaprobar.estado === 409, 'Una recarga ya resuelta no se puede volver a aprobar')

  // =========================================================================
  console.log('\n16. Estados de un servicio (PDR §9, §36)')
  const pausar = await carlos.json(`/api/servicios/${servicioCarlos.id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'pausado' }),
  })
  ok(pausar.estado === 200, 'Carlos pausa su servicio')

  const opPausado = await (await carlos.pedir('/oportunidades')).text()
  ok(
    !opPausado.includes('Pintar la sala de mi casa'),
    'Un servicio pausado deja de recibir oportunidades',
  )

  const reactivar = await carlos.json(`/api/servicios/${servicioCarlos.id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'publicado' }),
  })
  ok(reactivar.estado === 200, 'Carlos reactiva su servicio')

  const invalido = await carlos.json(`/api/servicios/${servicioCarlos.id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'inventado' }),
  })
  ok(invalido.estado === 409, 'Un estado que no existe se rechaza')

  const ajeno2 = await maria.json(`/api/servicios/${servicioCarlos.id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'desactivado' }),
  })
  ok(ajeno2.estado === 404, 'Nadie puede cambiar el estado del servicio de otro')

  // =========================================================================
  // Rosa se quedó en 0 créditos en el paso 14: es el momento de comprobar qué
  // pasa cuando alguien quiere aceptar una oferta y no le alcanza.
  console.log('\n16b. Desbloquear y DESPUÉS aceptar la oferta: se paga UNA sola vez')

  // El recorrido completo del caso real: quien busca desbloquea a un
  // profesional compatible, el profesional se entera y le manda una propuesta,
  // y quien busca la acepta. Lo que se vigila aquí es que ese segundo paso NO
  // vuelva a cobrar y que la interfaz no diga lo contrario — si el botón pide
  // un crédito que ya se pagó, la gente cierra el trato por fuera.
  const diego = crearSesion()
  const altaDiego = await diego.json('/api/registro', jsonBody({
    nombres: 'Diego',
    apellidos: 'Salazar',
    email: `diego+${Date.now()}@conectaia.com`,
    password: 'demo123',
    celular: '987666777',
    ciudad: 'Cajamarca',
    modo: 'busco',
  }))
  const diegoBd = await prisma.usuario.findUnique({
    where: { id: altaDiego.datos.id },
    select: { email: true },
  })
  await diego.entrar(diegoBd.email, 'demo123')

  const necDiego = await diego.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Pintar el dormitorio principal',
      descripcion: 'Quiero pintar el dormitorio principal, unos 15 metros cuadrados, con lijado.',
      categoriaId: pintura.id,
      subcategoriaId: interiores.id,
      ciudad: 'Cajamarca',
      precioOfrecido: 200,
      urgencia: 'flexible',
      publicar: '1',
    }),
  })
  await aprobar('necesidad', necDiego.datos.id)

  const matchDiego = await prisma.match.findFirst({
    where: { necesidadId: necDiego.datos.id, servicioId: servicioCarlos.id },
  })
  ok(!!matchDiego, 'A Diego le sale Carlos como servicio compatible')

  // 1) Desbloquea. Paga 1 y se queda a cero: es el caso peligroso.
  const pago1 = await diego.json(`/api/oportunidades/${matchDiego.id}/contactar`, { method: 'POST' })
  ok(pago1.datos.creditosConsumidos === 1, 'Diego paga 1 crédito por abrir el contacto')
  ok((await creditos(diego)) === 0, 'Y se queda sin créditos')

  // 2) Carlos se entera y manda su propuesta. Gratis para él.
  const propuesta = await carlos.json('/api/postulaciones', jsonBody({
    necesidadId: necDiego.datos.id,
    servicioId: servicioCarlos.id,
    precio: 180,
    comentario: 'Puedo hacerlo el jueves. Incluye lijado, resanado y dos manos de pintura.',
  }))
  ok(propuesta.estado === 200, 'Carlos le envía una propuesta sin pagar nada')

  // 3) La ficha tiene que decir la VERDAD: sin coste, y sin el aviso de recarga.
  const fichaDiego = await (await diego.pedir(`/necesidades/${necDiego.datos.id}`)).text()
  ok(fichaDiego.includes('sin coste'), 'El botón de aceptar dice que no cuesta nada')
  ok(
    !fichaDiego.includes('Necesitas 1 para aceptar'),
    'Y no aparece el aviso de recargar, porque no hace falta recargar',
  )

  // 4) Aceptar con CERO créditos tiene que funcionar. Antes el botón se
  //    bloqueaba mirando solo el saldo, y aquí se perdía el trabajo.
  const aceptaSinSaldo = await diego.json(`/api/necesidades/${necDiego.datos.id}/aceptar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postulacionId: propuesta.datos.id }),
  })
  ok(
    aceptaSinSaldo.estado === 200,
    'Con 0 créditos PUEDE aceptar, porque ya pagó por ese contacto',
    JSON.stringify(aceptaSinSaldo.datos),
  )
  ok(aceptaSinSaldo.datos.creditosConsumidos === 0, 'No se le cobra por segunda vez')
  ok((await creditos(diego)) === 0, 'Su saldo no se mueve')

  const movsDiego = await prisma.movimientoCredito.count({
    where: { usuarioId: altaDiego.datos.id, tipo: 'consumo' },
  })
  ok(movsDiego === 1, `Un solo consumo en todo el recorrido (${movsDiego})`)
  ok(!!aceptaSinSaldo.datos.trabajoId, 'Y el trabajo queda registrado, que es lo que permite calificar')

  // 5) Doble clic. Las dos peticiones salen a la vez, las dos leen "publicada"
  //    y las dos siguen adelante: la necesidad se toma con un `updateMany`
  //    condicionado por el estado, que es atómico. Antes la segunda llegaba a
  //    crear el trabajo y chocaba contra el índice único, y el usuario veía en
  //    pantalla "Unique constraint failed on the fields: (postulacionId)".
  const necDoble = await diego.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Pintar la reja del jardín',
      descripcion: 'Quiero pintar la reja del jardín, tiene óxido en la parte de abajo.',
      categoriaId: pintura.id,
      subcategoriaId: exteriores.id,
      ciudad: 'Cajamarca',
      precioOfrecido: 150,
      publicar: '1',
    }),
  })
  await aprobar('necesidad', necDoble.datos.id)
  const propuesta2 = await carlos.json('/api/postulaciones', jsonBody({
    necesidadId: necDoble.datos.id,
    servicioId: servicioCarlos.id,
    precio: 140,
    comentario: 'Puedo el sábado por la mañana, incluye lijado del óxido y antióxido.',
  }))

  const cuerpoAceptar = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postulacionId: propuesta2.datos.id }),
  }
  const enParalelo = await Promise.all(
    [1, 2, 3].map(() => diego.json(`/api/necesidades/${necDoble.datos.id}/aceptar`, cuerpoAceptar)),
  )
  const oks = enParalelo.filter((r) => r.estado === 200)
  const choques = enParalelo.filter((r) => r.estado === 409)
  ok(oks.length === 1, `De tres pulsaciones a la vez, solo UNA acepta (${oks.length})`)
  ok(choques.length === 2, 'Las otras dos reciben un 409 con explicación, no un error de base')
  ok(
    !enParalelo.some((r) => JSON.stringify(r.datos).includes('constraint')),
    'Ningún error interno de Prisma llega al navegador',
  )
  ok(
    (await prisma.trabajo.count({ where: { necesidadId: necDoble.datos.id } })) === 1,
    'Y se crea un solo trabajo',
  )

  // Un identificador que no es número tiene que ser 404, no un error del
  // servidor: `Number('undefined')` es NaN y Prisma revienta con él.
  const trabajoRaro = await diego.pedir('/trabajos/undefined')
  ok(trabajoRaro.status === 404, `Un trabajo inexistente da 404 limpio (${trabajoRaro.status})`)

  // =========================================================================
  console.log('\n17. Sin créditos suficientes (PDR §13)')

  // Rosa está en el lado de la oferta desde el paso 10. Para publicar lo que
  // ella necesita se pasa al otro, igual que haría con los botones del panel:
  // sin eso, `vetoPorModo` le devolvería un 403 y haría bien.
  await rosa.json('/api/perfil/modo', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modo: 'busco' }),
  })

  const necesidadRosa = await rosa.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Reparar el caño del baño',
      descripcion:
        'El caño del lavatorio del baño gotea sin parar. Hay que revisarlo y cambiar lo que haga falta.',
      categoriaId: gasfiteria.id,
      ciudad: 'Cajamarca',
      precioOfrecido: 60,
      publicar: '1',
    }),
  })
  ok(necesidadRosa.estado === 200, 'Rosa envía una necesidad')
  await aprobar('necesidad', necesidadRosa.datos.id)

  const ofertaCarlos = await carlos.json('/api/postulaciones', jsonBody({
    necesidadId: necesidadRosa.datos.id,
    precio: 55,
    comentario: 'Puedo revisarlo mañana por la tarde y cambiar el empaque o el caño completo.',
  }))
  ok(ofertaCarlos.estado === 200, 'Carlos le hace una oferta a Rosa')

  ok((await creditos(rosa)) === 0, 'Rosa está en 0 créditos')

  const sinSaldoAceptar = await rosa.json(`/api/necesidades/${necesidadRosa.datos.id}/aceptar`, jsonBody({
    postulacionId: ofertaCarlos.datos.id,
  }))
  ok(
    sinSaldoAceptar.estado === 402 && sinSaldoAceptar.datos.motivo === 'sin_creditos',
    'Sin créditos no se puede aceptar la oferta, y se dice por qué',
    `estado ${sinSaldoAceptar.estado}`,
  )

  const trasElIntento = await prisma.necesidad.findUnique({
    where: { id: necesidadRosa.datos.id },
    select: { estado: true },
  })
  ok(
    trasElIntento.estado === 'publicada',
    'El intento fallido NO deja la necesidad a medias',
    `quedó en "${trasElIntento.estado}"`,
  )

  const postulacionTrasIntento = await prisma.postulacion.findUnique({
    where: { id: ofertaCarlos.datos.id },
    select: { estado: true },
  })
  ok(
    postulacionTrasIntento.estado === 'enviada',
    'La oferta sigue en juego tras el intento fallido',
    `quedó en "${postulacionTrasIntento.estado}"`,
  )

  const trabajoFantasma = await prisma.trabajo.count({
    where: { necesidadId: necesidadRosa.datos.id },
  })
  ok(trabajoFantasma === 0, 'No se creó ningún trabajo sin haber cobrado el crédito')

  // Con créditos, la misma operación sí sale adelante.
  await admin.json('/api/admin/creditos', jsonBody({
    usuarioId: alta.datos.id,
    cantidad: 1,
    tipo: 'ajuste',
    motivo: 'Créditos para la comprobación automatizada',
  }))
  const ahoraSi = await rosa.json(`/api/necesidades/${necesidadRosa.datos.id}/aceptar`, jsonBody({
    postulacionId: ofertaCarlos.datos.id,
  }))
  ok(ahoraSi.estado === 200, 'Con saldo, la misma oferta se acepta sin problema')

  // =========================================================================
  console.log('\n18. Solo se activa el lado que corresponde')

  // Se mira SOLO dentro del <nav>. El panel nombra el otro lado a propósito, en
  // la tarjeta para pasarse a él ("Pásate a «Ofrezco un servicio»"), así que
  // buscar el rótulo suelto en todo el HTML daría un falso positivo.
  const soloMenu = (html) => [...html.matchAll(/<nav[\s\S]*?<\/nav>/g)].map((m) => m[0]).join('')

  // María tiene 'busco': no debe ver nada del lado de la oferta.
  const menuMaria = soloMenu(await (await maria.pedir('/panel')).text())
  ok(menuMaria.includes('Busco un servicio'), 'María ve "Busco un servicio" en su menú')
  ok(!menuMaria.includes('Ofrezco un servicio'), 'María NO ve "Ofrezco un servicio"')
  ok(!menuMaria.includes('Mis postulaciones'), 'María NO ve "Mis postulaciones"')

  const mariaAServicios = await maria.pedir('/servicios')
  ok(
    (mariaAServicios.headers.get('location') ?? '').includes('/panel?activar=ofrezco'),
    'Escribir /servicios a mano la devuelve al panel señalando ese lado, no a un 404',
    `fue a ${mariaAServicios.headers.get('location')}`,
  )

  const mariaPublicaServicio = await maria.json('/api/servicios', {
    method: 'POST',
    body: form({
      nombre: 'Servicio que no debería poder publicar',
      descripcion: 'María tiene solo el lado de la demanda activado, esto tiene que fallar.',
      categoriaId: pintura.id,
      ciudad: 'Cajamarca',
      publicar: '1',
    }),
  })
  ok(mariaPublicaServicio.estado === 403, 'María tampoco puede publicar un servicio por la API')

  // Carlos tiene 'ofrezco': el espejo exacto.
  const menuCarlos = soloMenu(await (await carlos.pedir('/panel')).text())
  ok(menuCarlos.includes('Ofrezco un servicio'), 'Carlos ve "Ofrezco un servicio" en su menú')
  ok(!menuCarlos.includes('Busco un servicio'), 'Carlos NO ve "Busco un servicio"')

  const carlosANecesidades = await carlos.pedir('/necesidades')
  ok(
    (carlosANecesidades.headers.get('location') ?? '').includes('/panel?activar=busco'),
    'A Carlos, /necesidades lo devuelve al panel señalando ese lado',
    `fue a ${carlosANecesidades.headers.get('location')}`,
  )

  const carlosPublicaNecesidad = await carlos.json('/api/necesidades', {
    method: 'POST',
    body: form({
      titulo: 'Necesidad que no debería poder publicar',
      descripcion: 'Carlos tiene solo el lado de la oferta activado, esto tiene que fallar.',
      categoriaId: pintura.id,
      ciudad: 'Cajamarca',
      publicar: '1',
    }),
  })
  ok(carlosPublicaNecesidad.estado === 403, 'Carlos tampoco puede publicar una necesidad por la API')

  // El panel enseña SIEMPRE los dos botones, esté en el lado que esté: son el
  // mando para cambiar, no un aviso que aparece cuando falta algo.
  const panelMaria = await (await maria.pedir('/panel')).text()
  ok(panelMaria.includes('Busco un servicio'), 'El panel ofrece el botón de "busco"')
  ok(panelMaria.includes('Ofrezco un servicio'), 'El panel ofrece también el del otro lado')

  // Y pasarse al otro lado no borra nada de lo que ya tenía.
  const necesidadesAntes = await prisma.necesidad.count({ where: { usuarioId: mariaBd.id } })
  await maria.json('/api/perfil/modo', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modo: 'ofrezco' }),
  })
  const menuOtroLado = soloMenu(await (await maria.pedir('/panel')).text())
  ok(menuOtroLado.includes('Ofrezco un servicio'), 'Al cambiar de lado el menú es el del lado nuevo')
  ok(!menuOtroLado.includes('Busco un servicio'), 'Y deja de enseñar el del lado anterior')
  ok(
    (await prisma.necesidad.count({ where: { usuarioId: mariaBd.id } })) === necesidadesAntes,
    'Cambiar de lado NO borra las publicaciones que ya existían',
  )

  await maria.json('/api/perfil/modo', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modo: 'busco' }),
  })
  ok(
    (await prisma.necesidad.count({ where: { usuarioId: mariaBd.id } })) === necesidadesAntes,
    'Y volver al lado de siempre tampoco borra nada',
  )

  // =========================================================================
  console.log(`\n${'─'.repeat(50)}`)
  if (fallos === 0) {
    console.log(`✅ ${pasos} comprobaciones, todas correctas.`)
  } else {
    console.log(`❌ ${fallos} de ${pasos} comprobaciones fallaron.`)
    process.exit(1)
  }
}

// Lee el saldo de créditos desde la pantalla de créditos.
async function creditos(sesion) {
  const html = await (await sesion.pedir('/creditos')).text()
  const m = html.match(/Saldo disponible<\/p><p[^>]*>(\d+)</)
  return m ? Number(m[1]) : NaN
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
