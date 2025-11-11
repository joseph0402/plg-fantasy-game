// app/auth/page.js

"use client" // [重要] 標記為 Client Component

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient' // 檢查路徑
import { useRouter } from 'next/navigation' // [注意] 這裡是 'next/navigation'

// 簡單的 CSS 樣式
const styles = {
  container: { maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' },
  input: { width: '100%', padding: '8px', margin: '10px 0', boxSizing: 'border-box' },
  button: { width: '100%', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', margin: '5px 0' },
}

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isLogin, setIsLogin] = useState(true) // 切換登入或註冊
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter() // 使用 'next/navigation'

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })
      if (error) throw error
      // 登入成功，導向陣容頁面
      router.push('/play') // 導向 /play
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!username) {
        setError("請輸入玩家名稱 (Username)")
        return
    }
    setLoading(true)
    setError(null)
    try {
      // 1. 註冊帳號
      // [修正] 這裡移除了多餘的 '_'
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      })
      if (authError) throw authError
      
      // 2. [重要] 在 user_profiles 建立對應的資料
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({ 
          id: authData.user.id, // 確保 ID 一致
          username: username 
        })

      if (profileError) {
        // 即使 profile 建立失敗，auth 帳號還是成功了
        // 我們只在 console 警告，但不阻擋使用者
        console.warn("註冊 Auth 成功，但建立 Profile 失敗:", profileError.message)
      }

      alert('註冊成功！請直接登入。')
      setIsLogin(true) // 切換回登入畫面

    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h2>{isLogin ? '登入' : '註冊新帳號'}</h2>
      <form onSubmit={isLogin ? handleLogin : handleSignUp}>
        {!isLogin && (
          <input
            style={styles.input}
            type="text"
            placeholder="你的玩家名稱"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="密碼 (至少 6 位數)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? '處理中...' : (isLogin ? '登入' : '註冊')}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button
        style={{...styles.button, backgroundColor: '#888'}}
        onClick={() => setIsLogin(!isLogin)}
      >
        {isLogin ? '還沒有帳號？點此註冊' : '已經有帳號？點此登入'}
      </button>
    </div>
  )
}