import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { PieDePagina } from '@/components/PieDePagina'
import { Icono } from '@/components/Icono'
import { soles } from '@/lib/fechas'
import { INICIO } from '@/lib/roles'
import { puerta } from '@/lib/destino'
import { getConfig, aNumero, esSi } from '@/lib/config'

export const dynamic = 'force-dynamic'

// Portada. Hace dos cosas, en este orden: contar qué es ConectaIA y dejar
// claras las DOS puertas de entrada del PDR §46, "busco un servicio" y "ofrezco
// un servicio". Todo lo demás es secundario.
//
// **Aquí es donde se elige el lado, y es el único sitio donde se pregunta.** Las
// dos puertas llevan al MISMO login arrastrando el lado (`/login?lado=…`); el
// login y el registro no vuelven a mencionarlo. Al entrar se guarda ese lado y
// se abre su panel.
//
// Para quien ya tiene sesión, las dos puertas llevan al panel: ahí dentro el
// cambio de lado son los dos botones que el panel tiene siempre abajo.
//
// **La ilustración preside la página**, a todo el ancho de la columna, y lleva
// el logotipo dentro: sustituye al logotipo suelto que había aquí. Enseña de un
// vistazo la marca Y de qué va esto —oficios concretos, no un concepto
// abstracto—, que es lo que necesita quien llega sin saber qué es ConectaIA.
// Por eso la cabecera se queda solo con los botones.
//
// ⚠️ Todos los fondos de esta pantalla son CLAROS a propósito. El nombre
// "Conecta" del logotipo es azul marino (#032c5b), y va dentro de la
// ilustración: sobre una superficie oscura desaparecería. Si alguna sección se
// pinta en `marino-800` o parecido, la ilustración NO puede ir encima.
export default async function Portada() {
  const session = await auth()
  const haySesion = !!session?.user
  const panel = haySesion ? (INICIO[session!.user.role] ?? '/panel') : null

  // Al administrador las puertas tampoco le sirven: no participa en el
  // marketplace, y `INICIO` ya lo deja en su propio panel.
  const irBusco = puerta('busco', haySesion, panel ?? '/panel')
  const irOfrezco = puerta('ofrezco', haySesion, panel ?? '/panel')

  // El regalo de bienvenida se ANUNCIA con el número que el admin tenga puesto,
  // nunca con uno escrito a mano aquí: en `/admin/configuracion` se cambia sin
  // desplegar, y un cartel que prometa 5 cuando la configuración da 1 es una
  // promesa incumplida en la primera pantalla que ve la gente.
  const cfg = await getConfig()
  const regalo = aNumero(cfg.creditos_bienvenida, 0)
  const registroAbierto = esSi(cfg.registro_abierto)
  // Cuántos contactos salen del regalo. El costo por desbloqueo TAMBIÉN es
  // configurable, así que dividir es lo único que no miente: dar por hecho que
  // vale 1 es el mismo error que escribir el regalo a mano.
  const contactosDeRegalo = Math.floor(regalo / Math.max(1, aNumero(cfg.costo_desbloqueo, 1)))

  const [necesidades, servicios, categorias, ultimas] = await Promise.all([
    prisma.necesidad.count({ where: { estado: 'publicada' } }),
    prisma.servicio.count({ where: { estado: 'publicado' } }),
    prisma.categoria.findMany({ where: { activa: true }, orderBy: { orden: 'asc' }, take: 12 }),
    prisma.necesidad.findMany({
      where: { estado: 'publicada' },
      include: { categoria: true },
      orderBy: { publicadaAt: 'desc' },
      take: 6,
    }),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Cabecera sin logotipo: el logotipo preside la página, no la barra. */}
      <header className="border-b border-marino-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-2 px-4 py-3">
          <Link href="/buscar" className="btn-secundario hidden sm:inline-flex">
            Explorar
          </Link>
          {panel ? (
            <Link href={panel} className="btn-marino">
              Ir a mi panel
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-secundario">
                Entrar
              </Link>
              <Link href="/registro" className="btn-marino">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Presentación. El degradado sale de los dos colores del propio
            logotipo —el azul del nombre y el verde de "IA"— en sus tonos más
            claros, para que la marca se note sin tapar nada. */}
        <section className="relative overflow-hidden bg-gradient-to-b from-marino-50 via-verde-50 to-white">
          {/* Dos manchas de color muy suaves. Son decorativas: si se quitan, la
              página sigue funcionando igual. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-marino-200/40 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 top-32 h-72 w-72 rounded-full bg-verde-200/40 blur-3xl"
          />

          <div className="relative mx-auto max-w-6xl px-4 py-14 text-center sm:py-20">
            {/* La ilustración preside la portada, a todo el ancho de la
                columna. Lleva el logotipo dentro, así que sustituye al que
                había aquí suelto: enseña de un vistazo la marca Y de qué va
                esto —oficios, no un concepto abstracto—, que es justo lo que
                necesita quien llega sin saber qué es ConectaIA.

                Va enmarcada (esquinas redondeadas y borde) a propósito: su
                fondo es un blanco cálido que no coincide con el degradado de
                la sección, y sin marco se leería como un rectángulo suelto.
                Se genera en scripts/imagenes.mjs a 1536 px de ancho. */}
            <Link href="/" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero.webp"
                alt="ConectaIA — Conecta talento con oportunidades: gasfiteros, electricistas, pintores, profesores, cocineros y más"
                width={1536}
                height={1024}
                className="mx-auto w-full rounded-2xl border border-marino-100 shadow-sm"
              />
            </Link>

            <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-marino-900 sm:text-5xl">
              Conectamos lo que necesitas
              <br />
              con <span className="text-marino-600">quien sabe hacerlo</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Publica lo que necesitas y recibe ofertas. O publica lo que sabes hacer y encuentra
              oportunidades. Con una sola cuenta puedes hacer las dos cosas.
            </p>

            {/* El regalo de bienvenida, destacado y justo encima de las dos
                puertas: es donde se decide entrar, no al final de la página.

                Solo se enseña si de verdad hay regalo (`regalo > 0`) y si se
                puede crear cuenta (`registroAbierto`). Con el registro cerrado
                o el regalo en 0 sería una promesa que la aplicación no cumple.

                A quien ya tiene sesión no se le enseña: no puede volver a
                crearse una cuenta, y el regalo ya lo recibió. */}
            {!haySesion && registroAbierto && regalo > 0 && (
              <Link
                href="/registro"
                className="elevar mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border-2 border-verde-400 bg-verde-50 px-5 py-4 text-center"
              >
                <span className="text-2xl" aria-hidden="true">
                  🎁
                </span>
                <span className="text-base font-extrabold text-verde-700 sm:text-lg">
                  Crea tu cuenta y recibe {regalo} crédito{regalo === 1 ? '' : 's'} gratis
                </span>
                {contactosDeRegalo > 0 && (
                  <span className="text-sm font-semibold text-slate-600">
                    — te alcanzan para contactar a {contactosDeRegalo} profesional
                    {contactosDeRegalo === 1 ? '' : 'es'}, sin pagar nada
                  </span>
                )}
              </Link>
            )}

            {/* Las dos puertas, con el color que las acompaña en toda la app:
                cielo = lo que busco, menta = lo que ofrezco. Ese significado NO
                se toca aquí aunque el resto de la portada sea de marca. */}
            <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
              <Link
                href={irBusco}
                className="elevar group rounded-2xl border-2 border-cielo-300 bg-white p-6 text-left shadow-sm"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-cielo-100 text-2xl">
                  🔎
                </span>
                <h2 className="mt-3 text-xl font-extrabold text-cielo-700">Busco un servicio</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Publica lo que necesitas y recibe ofertas de personas que pueden hacerlo.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-cielo-700">
                  {haySesion ? 'Ir a mi panel' : 'Entrar como quien busca'}
                  <Icono nombre="chevron" className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>

              <Link
                href={irOfrezco}
                className="elevar group rounded-2xl border-2 border-menta-300 bg-white p-6 text-left shadow-sm"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-menta-100 text-2xl">
                  🛠️
                </span>
                <h2 className="mt-3 text-xl font-extrabold text-menta-700">Ofrezco un servicio</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Publica lo que sabes hacer y te avisamos cuando alguien lo necesite.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-menta-700">
                  {haySesion ? 'Ir a mi panel' : 'Entrar como quien ofrece'}
                  <Icono nombre="chevron" className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </div>

            <p className="mt-6 text-sm text-slate-500">
              <span className="font-semibold text-verde-700">🤝 ConectaIA</span> encuentra las
              coincidencias entre necesidades y servicios.
            </p>

            {(necesidades > 0 || servicios > 0) && (
              <div className="mx-auto mt-8 flex max-w-lg flex-wrap items-center justify-center gap-3">
                <span className="rounded-xl border border-marino-200 bg-white px-4 py-2 text-sm text-slate-600">
                  <strong className="text-marino-800">{necesidades}</strong> necesidad(es)
                  publicadas
                </span>
                <span className="rounded-xl border border-verde-200 bg-white px-4 py-2 text-sm text-slate-600">
                  <strong className="text-verde-700">{servicios}</strong> servicio(s) disponibles
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="border-y border-marino-100 bg-white py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-extrabold text-marino-900">Cómo funciona</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {[
                { n: '1', t: 'Publica', d: 'Cuenta lo que necesitas o lo que sabes hacer. Con fotos, tu zona y tu precio.', color: 'bg-marino-600' },
                { n: '2', t: 'Conecta', d: 'Recibe ofertas o descubre oportunidades compatibles. Tú decides con quién hablar.', color: 'bg-marino-500' },
                { n: '3', t: 'Califica', d: 'Al terminar el trabajo, ambos se califican. La reputación se construye entre los dos.', color: 'bg-verde-600' },
              ].map((p) => (
                <div key={p.n} className="rounded-2xl border border-marino-100 bg-marino-50/50 p-6 text-center">
                  <span
                    className={`mx-auto grid h-12 w-12 place-items-center rounded-full text-xl font-extrabold text-white ${p.color}`}
                  >
                    {p.n}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-marino-900">{p.t}</h3>
                  <p className="mt-1 text-sm text-slate-600">{p.d}</p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-xl border border-verde-200 bg-verde-50 px-4 py-3 text-sm text-verde-700">
              <Icono nombre="candado" className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                Los teléfonos y correos permanecen ocultos hasta que alguien decide conectar. Solo
                paga quien da el primer paso, y a partir de ahí ambos ven los datos del otro.
              </span>
            </p>
          </div>
        </section>

        {/* Categorías */}
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-center text-2xl font-extrabold text-marino-900">¿Qué necesitas hoy?</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {categorias.map((c) => (
              <Link
                key={c.id}
                href={`/buscar?categoria=${c.id}`}
                className="elevar inline-flex items-center gap-2 rounded-xl border border-marino-200 bg-white px-4 py-2.5 text-sm font-semibold text-marino-800 hover:border-marino-400"
              >
                <span aria-hidden="true">{c.icono}</span>
                {c.nombre}
              </Link>
            ))}
          </div>
        </section>

        {/* Últimas necesidades */}
        {ultimas.length > 0 && (
          <section className="border-t border-marino-100 bg-marino-50/40 py-14">
            <div className="mx-auto max-w-6xl px-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-extrabold text-marino-900">Últimas necesidades</h2>
                <Link href="/buscar" className="btn-secundario">
                  Ver todas
                </Link>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ultimas.map((n) => (
                  <Link key={n.id} href={`/p/necesidad/${n.id}`} className="tarjeta block">
                    <span className="chip bg-cielo-50 border-cielo-300 text-cielo-700">
                      {n.categoria.icono} {n.categoria.nombre}
                    </span>
                    <h3 className="mt-2 font-bold text-slate-800">{n.titulo}</h3>
                    <p className="lineas-2 mt-1 text-sm text-slate-600">{n.descripcion}</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Icono nombre="ubicacion" className="h-4 w-4" />
                        {n.ciudad}
                      </span>
                      <span className="font-extrabold text-marino-700">
                        {soles(n.precioOfrecido)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <PieDePagina />
    </div>
  )
}
