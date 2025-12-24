import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Choice FX - The Smartest Choice in FX',
  description: 'FX Trading Platform for foreign exchange operations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="dark">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
