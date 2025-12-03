// components/LineupManager.tsx

"use client" // [重要] 標記為 Client Component

import { useState, useEffect, useMemo } from 'react'
import './LineupManager.css' // 🎯 在這裡導入 CSS
import { supabase } from '../../lib/supabaseClient' 
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js' 
import type { Player, GameSettings } from '../../lib/types' 

// [新增] 定義這個組件接收的 props 型別
interface LineupManagerProps {
  initialPlayers: Player[];
  gameSettings: GameSettings;
}

// ----------------------------------------------------
// 🎯 刪除行內樣式定義 (不再需要)
// const styles: { [key: string]: React.CSSProperties } = { ... }; 

// 陣容規則 (不變)
const LINEUP_RULES: { [key: string]: number } = { 'G': 2, 'F': 2, 'C': 1 };
const TOTAL_PLAYERS = 5;

// [修改] 套用我們定義的 Props 型別
export default function LineupManager({ initialPlayers, gameSettings }: LineupManagerProps) {
  
  // 1. State 定義 (不變)
  const [user, setUser] = useState<User | null>(null)
  const [lineup, setLineup] = useState<Player[]>([]) 
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  // 2. 驗證使用者身份 & 載入陣容 (不變)
  useEffect(() => {
    // ... (邏輯不變)
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        await fetchUserLineup(session.user.id)
      } else {
        router.push('/auth') 
      }
      setLoading(false)
    }
    fetchUser()
  }, [router, gameSettings.current_week, initialPlayers]);

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

  // 3. 計算薪資和位置 (不變)
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

  // 4. 新增球員到陣容 (不變)
  const addPlayer = (player: Player) => { 
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

  // 5. 從陣容移除球員 (不變)
  const removePlayer = (playerToRemove: Player) => { 
    setLineup(lineup.filter(p => p.id !== playerToRemove.id))
  }

  // 6. 提交陣容到 Supabase (不變)
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
      router.refresh()

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

  // 8. 渲染 JSX 
  if (loading) return <div style={{textAlign: 'center', marginTop: 50}}>載入玩家資料中...</div>

  return (
    // 🎯 套用 .container 類名
    <div className="container"> 
      
      {/* 頂部標題與薪資區塊 */}
      {/* 🎯 套用 .header 和 .salaryInfo 類名 */}
      <header className="header">
        <h1 className="title">🏀 設定你的陣容 (Week {gameSettings.current_week})</h1>
        <div className="salaryInfo">
          {/* 🎯 套用 .salaryText 類名 */}
          <p className="salaryText" style={{ color: salaryRemaining < 0 ? '#dc3545' : '#28a745' }}> 
            剩餘薪資: ${salaryRemaining.toLocaleString()}
          </p>
          <p className="salaryText">
            總薪資: ${currentSalary.toLocaleString()} / ${gameSettings.salary_cap.toLocaleString()}
          </p>
        </div>
      </header>

      {/* 我的陣容 */}
      {/* 🎯 套用 .section 類名 */}
      <section className="section"> 
        {/* 🎯 套用 .sectionTitle 類名 */}
        <h2 className="sectionTitle">✅ 我的陣容 ({lineup.length}/{TOTAL_PLAYERS})</h2>
        <p>
          G: **{positionCounts['G']}**/{LINEUP_RULES['G']} | 
          F: **{positionCounts['F']}**/{LINEUP_RULES['F']} | 
          C: **{positionCounts['C']}**/{LINEUP_RULES['C']}
        </p>
        {lineup.length === 0 && <p>你的陣容是空的。</p>}
        
        {/* 🎯 套用 .playerList 類名 */}
        <div className="playerList">
          {lineup.map(p => (
            // 🎯 套用 .playerRow 類名
            <div key={p.id} className="playerRow">
              {/* 🎯 套用 .playerInfo, .positionBadge, .playerName, .playerTeam 類名 */}
              <div className="playerInfo">
                <span className="positionBadge">{p.position}</span>
                <span className="playerName">{p.name}</span>
                <span className="playerTeam">({p.team})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {/* 🎯 套用 .playerSalary 類名 */}
                <span className="playerSalary">${p.salary.toLocaleString()}</span>
                {/* 🎯 套用 .button 和 .removeButton 類名 */}
                <button className="button removeButton" onClick={() => removePlayer(p)}>移除</button>
              </div>
            </div>
          ))}
        </div>
        
      </section>
      
      {/* 提交按鈕 */}
      {/* 🎯 套用 .submitButton 類名 */}
      <button 
        className="submitButton" 
        onClick={handleSubmitLineup}
        disabled={submitting || lineup.length !== TOTAL_PLAYERS || salaryRemaining < 0}
      >
        {submitting ? '儲存中...' : '儲存本週陣容'}
      </button>

      {/* 球員池 */}
      {/* 🎯 套用 .section 類名 */}
      <section className="section"> 
        {/* 🎯 套用 .sectionTitle 類名 */}
        <h2 className="sectionTitle">🔍 球員池 (點擊新增)</h2>
        
        {/* 🎯 套用 .playerList 類名 */}
        <div className="playerList">
          {availablePlayers.map(p => (
            // 🎯 套用 .playerRow 類名
            <div key={p.id} className="playerRow">
              {/* 🎯 套用 .playerInfo, .positionBadge, .playerName, .playerTeam 類名 */}
              <div className="playerInfo">
                <span className="positionBadge">{p.position}</span>
                <span className="playerName">{p.name}</span>
                <span className="playerTeam">({p.team})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {/* 🎯 套用 .playerSalary 類名 */}
                <span className="playerSalary">${p.salary.toLocaleString()}</span>
                {/* 🎯 套用 .button 和 .addButton 類名 */}
                <button className="button addButton" onClick={() => addPlayer(p)}>+</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}