// Iconos de línea, dibujados a mano para no arrastrar una librería entera.
// Todos comparten el mismo trazo para que el menú se vea homogéneo.

export type NombreIcono =
  | 'panel'
  | 'busco'
  | 'ofrezco'
  | 'match'
  | 'oferta'
  | 'trabajo'
  | 'creditos'
  | 'perfil'
  | 'usuarios'
  | 'catalogo'
  | 'config'
  | 'paquete'
  | 'movimiento'
  | 'estrella'
  | 'alerta'
  | 'campana'
  | 'salir'
  | 'buscar'
  | 'mas'
  | 'foto'
  | 'candado'
  | 'ubicacion'
  | 'reloj'
  | 'grafico'
  | 'chevron'

const RUTAS: Record<NombreIcono, React.ReactNode> = {
  panel: <path d="M4 5h6v6H4zM14 5h6v4h-6zM14 13h6v6h-6zM4 15h6v4H4z" />,
  busco: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.2-4.2" />,
  ofrezco: <path d="M14.7 6.3a4 4 0 0 0 5 5L15 16l-3 5-3-3 5-3 4.7-4.7M9 9 4 4l1-1 5 5" />,
  match: (
    <>
      <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />
    </>
  ),
  oferta: <path d="M4 6h16M4 12h10M4 18h7M17 15l3 3 3-3" />,
  trabajo: <path d="M4 8h16v11H4zM9 8V6a3 3 0 0 1 6 0v2M4 13h16" />,
  creditos: <path d="M3 7h18v11H3zM3 11h18M7 15h3" />,
  perfil: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0" />,
  usuarios: <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 19a6.5 6.5 0 0 1 13 0M17 11.5a3 3 0 1 0 0-6M18 19a5.5 5.5 0 0 0-2-4.3" />,
  catalogo: <path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM13 14h7v5h-7z" />,
  config: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />,
  paquete: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9" />,
  movimiento: <path d="M7 17V7M7 7 4 10M7 7l3 3M17 7v10M17 17l3-3M17 17l-3-3" />,
  estrella: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.4l6.1-.9z" />,
  alerta: <path d="M12 9v4M12 17h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />,
  campana: <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />,
  salir: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  buscar: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.2-4.2" />,
  mas: <path d="M12 5v14M5 12h14" />,
  foto: <path d="M3 7h4l2-2h6l2 2h4v12H3zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />,
  candado: <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />,
  ubicacion: <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />,
  reloj: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" />,
  grafico: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  chevron: <path d="m9 6 6 6-6 6" />,
}

export function Icono({
  nombre,
  className = 'h-5 w-5',
}: {
  nombre: NombreIcono
  className?: string
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {RUTAS[nombre]}
    </svg>
  )
}
