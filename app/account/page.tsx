// app/account/page.tsx

"use client" // [重要] 這是互動頁面

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient' // 檢查路徑
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

// 簡單樣式
const styles: { [key: string]: React.CSSProperties } = {
  container: { maxWidth: '500px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' },
  input: { width: '100%', padding: '10px', margin: '10px 0', boxSizing: 'border-box', fontSize: '16px' },
  button: { width: '100%', padding: '12px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  message: { marginTop: '15px', padding: '10px', borderRadius: '4px' },
  success: { backgroundColor: '#d4edda', color: '#155724' },
  error: { backgroundColor: '#f8d7da', color: '#721c24' }
}

export default function Account() {
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const router = useRouter()

  // [關鍵] 1. 載入使用者資料
  const fetchProfile = useCallback(async (currentUser: User) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', currentUser.id)
        .single() // 抓取單一筆資料

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error
      }
      
      if (data) {
        setUsername(data.username || '') // 如果 username 是 null，就設為空字串
      }
    } catch (error) {
      console.error("抓取 Profile 失敗:", (error as Error).message)
      setMessage({ type: 'error', text: '無法載入玩家資料。' })
    } finally {
      setLoading(false)
    }
  }, []) // 使用 useCallback

  // 2. 檢查登入狀態
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        await fetchProfile(session.user) // 取得 user 後，立刻去抓 profile
      } else {
        router.push('/auth') // 沒有登入，導回登入頁
      }
    }
    fetchUser()
  }, [router, fetchProfile]) // 依賴 fetchProfile

  // [關鍵] 3. 處理表單提交
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage(null)

    try {
      // [檢查 RLS] 這會觸發 user_profiles 的 UPDATE 策略
      // (auth.uid() = id)
      const { error } = await supabase
        .from('user_profiles')
        .update({ username: username }) // 更新 username
        .eq('id', user.id) // 只更新你自己的

      if (error) throw error
      setMessage({ type: 'success', text: '玩家名稱更新成功！' })
      // [新增這兩行]
      // 1. 強制清除客戶端的「快取」，讓 Next.js 知道下次要重抓
      router.refresh()
      // 2. (可選) 兩秒後自動跳轉回首頁
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (error) {
      console.error("更新 Profile 失敗:", (error as Error).message)
      setMessage({ type: 'error', text: `更新失敗: ${(error as Error).message}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h2>帳號設定</h2>
      <p>在這裡設定你獨一無二的玩家名稱。</p>
      <form onSubmit={handleUpdateProfile}>
        <div>
          <label htmlFor="email">Email (無法修改)</label>
          <input 
            style={{...styles.input, backgroundColor: '#eee'}}
            id="email" 
            type="text" 
            value={user?.email || ''} 
            disabled 
          />
        </div>
        <div>
          <label htmlFor="username">玩家名稱</label>
          <input
            style={styles.input}
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="請輸入你的玩家名稱"
            disabled={loading}
          />
        </div>
        <button 
          style={styles.button} 
          type="submit" 
          disabled={loading}
        >
          {loading ? '儲存中...' : '儲存變更'}
        </button>
      </form>
      
      {message && (
        <div style={{...styles.message, ...(message.type === 'success' ? styles.success : styles.error)}}>
          {message.text}
        </div>
      )}
    </div>
  )
}