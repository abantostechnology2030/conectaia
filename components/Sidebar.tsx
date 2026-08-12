'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Icono, type NombreIcono } from './Icono'
import { LogoConNombre, LogoCompleto } from './Logo'
import { Avatar } from './Avatar'

export type Enlace = {
  href: string
  label: string
  icono: NombreIcono
  color: string
  /** Contador rojo a la derecha: cosas esperando a que alguien las atienda. */
  pendientes?: number
}

export default function Sidebar({
  enlaces,
  nombre,
  rol,
  foto,
  creditos,
  sinLeer,
  onSignOut,
}: {
  enlaces: Enlace[]
  nombre: string
  rol: string
  foto?: string | null
  /** Saldo de créditos. `null` en el admin, que no gasta. */
  creditos?: number | null
  sinLeer?: number
  onSignOut: () => Promise<void>
}) {
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)

  const activo = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))

  const contenido = (
    <div className="flex h-full flex-col">
      {/* El menú lateral sale en TODAS las pantallas de la aplicación, así que
          es el sitio donde el logotipo completo tiene que estar. Se usa la
          versión ligera (200 px de alto de origen), que a 120 se ve nítida. */}
      <div className="px-4 py-5">
        <LogoCompleto alto={120} compacto href={rol === 'Administrador' ? '/admin' : '/panel'} />
      </div>

      {/* El saldo va arriba del todo y siempre visible: es la moneda de la
          plataforma y el usuario tiene que saber si le alcanza ANTES de
          abrir una oferta, no al pulsar "aceptar". */}
      {creditos !== null && creditos !== undefined && (
        <Link
          href="/creditos"
          onClick={() => setAbierto(false)}
          className="mx-3 mb-3 flex items-center justify-between rounded-xl border border-marca-200 bg-white px-3 py-2.5 transition hover:border-marca-300 hover:shadow-sm"
        >
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Icono nombre="creditos" className="h-4 w-4 text-marca-500" />
            Créditos
          </span>
          <span className="text-lg font-extrabold text-marca-700">{creditos}</span>
        </Link>
      )}

      {/* Cada opción tiene fondo propio, y más oscuro que el panel: antes eran
          transparentes y solo se distinguían al pasar el ratón, así que la
          lista se leía como un bloque de texto en vez de como botones.
          El activo va en el azul del logotipo, que no deja lugar a dudas. */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {enlaces.map((e) => {
          const esActivo = activo(e.href)
          return (
            <Link
              key={e.href}
              href={e.href}
              onClick={() => setAbierto(false)}
              aria-current={esActivo ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                esActivo
                  ? 'bg-marino-700 text-white shadow-sm'
                  : 'bg-marino-100/70 text-marino-900 hover:bg-marino-200'
              }`}
            >
              <span className={esActivo ? 'text-white' : e.color}>
                <Icono nombre={e.icono} />
              </span>
              <span className="min-w-0 flex-1 truncate">{e.label}</span>
              {!!e.pendientes && e.pendientes > 0 && (
                <span
                  className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-xs font-bold ${
                    esActivo ? 'bg-white text-marino-800' : 'bg-rose-500 text-white'
                  }`}
                >
                  {e.pendientes > 99 ? '99+' : e.pendientes}
                </span>
              )}
            </Link>
          )
        })}

        <Link
          href="/notificaciones"
          onClick={() => setAbierto(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            activo('/notificaciones')
              ? 'bg-marino-700 text-white shadow-sm'
              : 'bg-marino-100/70 text-marino-900 hover:bg-marino-200'
          }`}
        >
          <span className={activo('/notificaciones') ? 'text-white' : 'text-durazno-500'}>
            <Icono nombre="campana" />
          </span>
          <span className="min-w-0 flex-1 truncate">Notificaciones</span>
          {!!sinLeer && sinLeer > 0 && (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
              {sinLeer > 99 ? '99+' : sinLeer}
            </span>
          )}
        </Link>
      </nav>

      <div className="space-y-2 border-t border-slate-200 p-4">
        <div className="flex items-center gap-3 px-1">
          <Avatar src={foto} nombre={nombre} tam={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-700">{nombre}</p>
            <p className="text-xs font-semibold text-marca-500">{rol}</p>
          </div>
        </div>
        <form action={onSignOut}>
          <button type="submit" className="btn w-full bg-slate-800 text-white hover:bg-slate-900">
            <Icono nombre="salir" className="h-4 w-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Barra superior en móvil */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <LogoConNombre alto={30} href={rol === 'Administrador' ? '/admin' : '/panel'} />
        <div className="flex items-center gap-3">
          {creditos !== null && creditos !== undefined && (
            <Link
              href="/creditos"
              className="flex items-center gap-1.5 rounded-lg bg-marca-50 px-2.5 py-1.5 text-sm font-extrabold text-marca-700"
            >
              <Icono nombre="creditos" className="h-4 w-4" />
              {creditos}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-label="Abrir menú"
            className="rounded-lg border border-slate-300 p-2 text-slate-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cajón en móvil */}
      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setAbierto(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-marino-50">{contenido}</aside>
        </div>
      )}

      {/* Fijo en escritorio */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-marino-200 bg-marino-50 lg:block">
        {contenido}
      </aside>
    </>
  )
}
