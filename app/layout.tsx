import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import "./fonts.css"

export const metadata: Metadata = {
  title: "Padel Scoring System",
  description: "Professional padel scoring system with multiple game modes",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="inter-tabular">{children}</body>
    </html>
  )
}
