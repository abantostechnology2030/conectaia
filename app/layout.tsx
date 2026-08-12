import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'ConectaIA',
  description: 'Conectamos lo que necesitas con quien sabe hacerlo',
  applicationName: 'ConectaIA',
}

export const viewport: Viewport = {
  themeColor: '#4f46e5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
