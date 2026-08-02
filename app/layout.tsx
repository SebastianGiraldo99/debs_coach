import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

export const metadata: Metadata = {
  title: "Coach Financiero",
  description: "Tu coach financiero con IA: sabe qué hacer con tu dinero hoy.",
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#fbf9f6",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} bg-paper`}>
      <body className="bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  )
}
