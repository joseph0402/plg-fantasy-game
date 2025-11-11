// components/LineupManager.tsx

"use client" // [重要] 標記為 Client Component

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient' // [修正] 路徑是 '../'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js' 
import type { Player, GameSettings } from '../../lib/types' // [修正] 從共享檔案匯入

// [新增] 定義這個組件接收的 props 型別
interface LineupManagerProps {
  initialPlayers: Player[];
  gameSettings: GameSettings;
}

// ----------------------------------------------------
// 樣式 (不變)
const styles: { [key: string]: React.CSSProperties } = {
  container: { maxWidth: '800px', margin: '20px auto', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  salary: { fontSize: '1.2em', fontWeight: 'bold' },
  lineup: { border: '1px solid #0070f3', padding: '10px', margin: '20px 0', borderRadius: '8px' },
  playerPool: { border: '1px solid #ccc', padding: '10px', borderRadius: '8px' },
  playerRow: { display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #eee' },
  button: { padding: '5px 10px', cursor: 'pointer', borderRadius: '4px', border: 'none' },
  submitButton: { width: '100%', padding: '15px', fontSize: '1.2em', backgroundColor: 'green', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' }
};

// 陣容規則 (不變)
const LINEUP_RULES: { [key: string]: number } = { 'G': 2, 'F': 2, 'C': 1 };
const TOTAL_PLAYERS = 5;

// [修改] 套用我們定義的 Props 型別
export default function LineupManager({ initialPlayers, gameSettings }: LineupManagerProps) {
  
  // [修改] 為 state 加上型別
  const [user, setUser] = useState<User | null>(null)
  const [lineup, setLineup] = useState<Player[]>([]) 
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  // 1. 驗證使用者身份 (不變)
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        await fetchUserLineup(session.user.id) // 傳入 user ID
      } else {
        router.push('/auth') 
      }
      setLoading(false)
    }
    fetchUser()
  }, [router, gameSettings.current_week, initialPlayers]); // [修正] 增加依賴，確保 props 變動時重抓

  // 2. 載入使用者本週已儲存的陣容
  const fetchUserLineup = async (userId: string) => { 
    try {
      const { data, error } = await supabase
        .from('user_lineups')
        .select('*')
        .eq('user_id', userId)
        .eq('week_number', gameSettings.current_week)
        .single() 

      if (error && error.code !== 'PGRST116') throw error 

      if (data) {
        const savedPlayerIds = data.selected_players as number[]; 
        const savedLineup = initialPlayers.filter(p => savedPlayerIds.includes(p.id));
        setLineup(savedLineup);
      }
    } catch (error) {
      console.error('載入陣容錯誤:', (error as Error).message)
    }
  }

  // 3. 計算薪資和位置
  const { currentSalary, salaryRemaining, positionCounts } = useMemo(() => {
    const salary = lineup.reduce((acc, player) => acc + player.salary, 0)
    const counts: { [key: string]: number } = { 'G': 0, 'F': 0, 'C': 0 } 
    lineup.forEach(player => {
      if (counts[player.position] !== undefined) {
        counts[player.position]++
      }
    })
    return {
      currentSalary: salary,
      salaryRemaining: gameSettings.salary_cap - salary,
      positionCounts: counts,
    }
  }, [lineup, gameSettings.salary_cap])

  // 4. 新增球員到陣容
  const addPlayer = (player: Player) => { 
    // ... (邏輯不變) ...
    if (lineup.length >= TOTAL_PLAYERS) {
      alert("陣容已滿 (5人)！")
      return
    }
    if (lineup.find(p => p.id === player.id)) {
      alert("球員已在陣容中！")
      return
    }
    if (positionCounts[player.position] >= LINEUP_RULES[player.position]) {
      alert(`位置 ${player.position} 已滿 (限制 ${LINEUP_RULES[player.position]} 人)！`)
      return
    }
    if (salaryRemaining < player.salary) {
      alert("薪資空間不足！")
      return
    }
    setLineup([...lineup, player])
  }

  // 5. 從陣容移除球員
  const removePlayer = (playerToRemove: Player) => { 
    setLineup(lineup.filter(p => p.id !== playerToRemove.id))
  }

  // 6. 提交陣容到 Supabase
  const handleSubmitLineup = async () => {
    if (lineup.length !== TOTAL_PLAYERS) {
      alert(`陣容必須剛好 ${TOTAL_PLAYERS} 人！`)
      return
    }
    
    setSubmitting(true)
    try {
      if (!user) throw new Error("使用者未登入") 

      const playerIds = lineup.map(p => p.id) 
      
      const { error } = await supabase
        .from('user_lineups')
        .upsert({
          user_id: user.id,
          week_number: gameSettings.current_week,
          selected_players: playerIds,
        }, {
          onConflict: 'user_id, week_number' 
        })

      if (error) throw error
      alert('陣容儲存成功！')
      router.push('/') 
      router.refresh() // 儲存後，強制刷新首頁資料

    } catch (error) {
      console.error('儲存陣容失敗:', (error as Error).message)
      alert(`儲存失敗: ${(error as Error).message}`)
    } finally {
      setSubmitting(false)
    }
  }
  
  // 7. 過濾出還在球員池的球員 (不變)
  const availablePlayers = useMemo(() => {
    const lineupIds = lineup.map(p => p.id);
    return players.filter(p => !lineupIds.includes(p.id));
  }, [players, lineup]);

  // 8. 渲染 JSX (不變)
  if (loading) return <div style={{textAlign: 'center', marginTop: 50}}>載入玩家資料中...</div>

  // (其餘 JSX 程式碼不變，貼在這裡...)
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>設定你的陣容 (Week {gameSettings.current_week})</h2>
        <div style={styles.salary}>
          <span style={{ color: salaryRemaining < 0 ? 'red' : 'green' }}>
            剩餘薪資: ${salaryRemaining}
          </span>
          <br />
          <span>總薪資: ${currentSalary} / ${gameSettings.salary_cap}</span>
        </div>
      </div>

      {/* 我的陣容 */}
      <div style={styles.lineup}>
        <h3>我的陣容 ({lineup.length}/{TOTAL_PLAYERS})</h3>
        <p>
          G: {positionCounts['G']}/{LINEUP_RULES['G']} | 
          F: {positionCounts['F']}/{LINEUP_RULES['F']} | 
          C: {positionCounts['C']}/{LINEUP_RULES['C']}
        </p>
        {lineup.length === 0 && <p>你的陣容是空的。</p>}
        {lineup.map(p => (
          <div key={p.id} style={styles.playerRow}>
            <span>({p.position}) {p.name} ({p.team})</span>
            <span>${p.salary}</span>
            <button style={{...styles.button, backgroundColor: '#f44'}} onClick={() => removePlayer(p)}>移除</button>
          </div>
        ))}
      </div>

      {/* 提交按鈕 */}
      <button 
        style={styles.submitButton} 
        onClick={handleSubmitLineup}
        disabled={submitting || lineup.length !== TOTAL_PLAYERS || salaryRemaining < 0}
      >
        {submitting ? '儲存中...' : '儲存本週陣容'}
      </button>

      {/* 球員池 */}
      <div style={styles.playerPool}>
        <h3>球員池 (點擊新增)</h3>
        {availablePlayers.map(p => (
          <div key={p.id} style={styles.playerRow}>
            <span>({p.position}) {p.name} ({p.team})</span>
            <span>${p.salary}</span>
            <button style={{...styles.button, backgroundColor: '#4a4'}} onClick={() => addPlayer(p)}>新增</button>
          </div>
        ))}
      </div>
    </div>
  )
}