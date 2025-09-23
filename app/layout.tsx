import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClientLayout } from './components/ClientLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import Script from 'next/script'
import { Footer } from './components/Footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Shillzzz',
  description: 'Show the world who has the strongest community',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col">
            <ClientLayout>{children}</ClientLayout>
            <Footer />
          </div>
        </ErrorBoundary>
      </body>
    </html>
  )
}