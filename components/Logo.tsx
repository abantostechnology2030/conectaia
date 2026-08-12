import Link from 'next/link'

/**
 * El logotipo de la marca, en sus dos formatos.
 *
 * Los PNG los genera `scripts/imagenes.mjs` a partir de los originales de
 * `archivos/`, ya con el fondo blanco recortado. OJO con dónde se ponen: el
 * nombre "Conecta" del logotipo completo es azul marino, así que **solo se ve
 * sobre fondos claros**. Sobre el azul de la marca desaparecería. Para
 * superficies oscuras (el pie de página) va el nombre como texto blanco.
 *
 * Se usan etiquetas <img> normales y no `next/image`: son ficheros estáticos de
 * unas decenas de kilobytes y con medidas fijas, así que el optimizador no
 * aporta nada y sí añade una petición al servidor por cada icono.
 */

/** Solo la marca (el símbolo "CA"). Para barras estrechas. */
export function Marca({ alto = 32 }: { alto?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/marca.png"
      alt=""
      height={alto}
      style={{ height: alto, width: 'auto' }}
      className="shrink-0"
    />
  )
}

/**
 * Marca + nombre escrito con texto. Es la versión compacta, para las cabeceras
 * que no llegan a 64 px de alto y donde el logotipo apilado no cabría.
 */
export function LogoConNombre({ alto = 36, href = '/' }: { alto?: number; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <Marca alto={alto} />
      <span className="text-xl font-extrabold tracking-tight text-slate-800">
        Conecta<span className="text-marca-600">IA</span>
      </span>
    </Link>
  )
}

/**
 * El logotipo completo: marca, nombre y lema. Para donde hay sitio de sobra
 * (login, registro, bienvenida) y para el menú lateral, que está en todas las
 * pantallas de la aplicación.
 */
export function LogoCompleto({
  alto = 150,
  href,
  /** El archivo ligero, para el menú. */
  compacto = false,
  /**
   * Alto por clases en vez de por `alto`, para poder encogerlo en pantallas
   * pequeñas. Hace falta donde el logotipo es grande: un alto fijo de 186 px en
   * una barra superior deja sin sitio a los botones en un móvil.
   */
  clase,
}: {
  alto?: number
  href?: string
  compacto?: boolean
  clase?: string
}) {
  const imagen = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={compacto ? '/logotipo-menu.png' : '/logotipo.png'}
      alt="ConectaIA — Conecta talento con oportunidades"
      style={clase ? undefined : { height: alto, width: 'auto' }}
      className={clase ? `w-auto ${clase}` : 'mx-auto'}
    />
  )

  return href ? (
    <Link href={href} className="block">
      {imagen}
    </Link>
  ) : (
    imagen
  )
}
