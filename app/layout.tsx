// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next' 
import Navbar from './components/Navbar' // [修正路徑] components 在 app 裡面

export const metadata: Metadata = {
  title: 'PLG Fantasy Game',
  description: 'PLG 夢幻籃球',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode 
}) {
  return (
    <html lang="en">
      <body>
        <Navbar /> {/* [新增] 把 Navbar 放在這裡 */}
        <main>{children}</main> 
      </body>
    </html>
  )
}