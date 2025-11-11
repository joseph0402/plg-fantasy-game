// components/Navbar.tsx

"use client" // [重要] 偵測 auth 狀態需要 'use client'

import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient' // 你的路徑是正確的
import { useRouter } from 'next/navigation' 
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
const styles: { [key: string]: React.CSSProperties } = {
  nav: { display: 'flex', justifyContent: 'space-between', padding: '10px 40px', background: '#f9f9f9', borderBottom: '1px solid #ddd' },
  links: { display: 'flex', gap: '30px', alignItems: 'center' },
  link: { textDecoration: 'none', color: '#0070f3', fontWeight: 'bold', fontSize: '18px' },
  user: { display: 'flex', gap: '15px', alignItems: 'center', fontSize: '14px' },
  logout: { cursor: 'pointer', color: 'red', border: '1px solid red', padding: '5px 8px', borderRadius: '4px' }
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true) 
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false) 
    }
    fetchUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        if(event === 'SIGNED_OUT') {
          router.push('/auth') 
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe() 
    }
  }, [router])

  const handleLogout = async () => {
   await supabase.auth.signOut()
  }


  if (loading) {
    return (
      <nav style={styles.nav}>
        <div style={styles.links}>
          <Link href="/" style={styles.link}>排行榜</Link>
          <Link href="/play" style={styles.link}>我的陣容</Link>
        </div>
        <div style={styles.user}>
          <span>讀取中...</span>
        </div>
      </nav>
    )
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.links}>
        <Link href="/" style={styles.link}>排行榜</Link>
        <Link href="/play" style={styles.link}>我的陣容</Link>
      </div>
      <div style={styles.user}>
        {user ? (
          <>
            <span>{user.email}</span>

              {/* [新增] 這就是我們加上去的連結 */}
              <Link href="/account" style={{...styles.link, fontSize: '14px', color: '#555'}}>
                帳號設定
              </Link>

            <span style={styles.logout} onClick={handleLogout}>登出</span>
          </>
        ) : (
          <Link href="/auth" style={{...styles.link, fontSize: '16px'}}>登入/註冊</Link>
        )}
      </div>
    </nav>
  )
}