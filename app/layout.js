import './globals.css'

export const metadata = {
  title: 'IPD Budget - Institut Pasteur de Dakar',
  description: 'Comprehensive budget management application',
  icons: {
    icon: '/favicon-institut-pasteur.png',
    apple: '/favicon-institut-pasteur.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
