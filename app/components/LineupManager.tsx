"use client" // [重要] 標記為 Client Component

import { useState, useEffect, useMemo } from 'react'
// [修正] 引用正確的 CSS Module 路徑 (指向我們之前建立的 page.module.css)
import styles from './LineupManager.module.css'

import { supabase } from '../../lib/supabaseClient' 
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js' 
import type { Player, GameSettings } from '../../lib/types' 

interface LineupManagerProps {
  initialPlayers: Player[];
  gameSettings: GameSettings;
}

const LINEUP_RULES: { [key: string]: number } = { 'G': 2, 'F': 2, 'C': 1 };
const TOTAL_PLAYERS = 5;

export default function LineupManager({ initialPlayers, gameSettings }: LineupManagerProps) {
  
  const [user, setUser] = useState<User | null>(null)
  const [lineup, setLineup] = useState<Player[]>([]) 
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  // [新增 1] 隊長狀態：紀錄被選為隊長的 player_id
  const [captainId, setCaptainId] = useState<number | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  // 1. 驗證使用者身份 & 載入陣容
  useEffect(() => {
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
        
        // [新增 2] 如果資料庫有紀錄隊長，就載入它
        // 注意：如果你資料庫還沒加 captain_id 欄位，這行暫時讀不到東西是正常的
        if (data.captain_id) {
          setCaptainId(data.captain_id)
        }
      }
    } catch (error) {
      console.error('載入陣容錯誤:', (error as Error).message)
    }
  }

  // 2. 計算薪資和位置 (不變)
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

  // 3. 動作函式
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

  const removePlayer = (playerToRemove: Player) => { 
    setLineup(lineup.filter(p => p.id !== playerToRemove.id))
    // [新增 3] 如果移除的剛好是隊長，要重置隊長狀態
    if (captainId === playerToRemove.id) {
      setCaptainId(null)
    }
  }

  // [新增 4] 切換隊長的函式
  const toggleCaptain = (playerId: number) => {
    // 如果點擊已經是隊長的人 -> 取消隊長
    // 如果點擊其他人 -> 設為新隊長
    setCaptainId(prev => prev === playerId ? null : playerId)
  }

  // 4. 提交陣容
  const handleSubmitLineup = async () => {
    if (lineup.length !== TOTAL_PLAYERS) {
      alert(`陣容必須剛好 ${TOTAL_PLAYERS} 人！`)
      return
    }
    
    // [新增 5] 檢查是否選了隊長
    if (!captainId) {
      alert("請點擊球員名字旁邊的 ★，選擇一名隊長！(隊長分數 x1.2)")
      return
    }

    // [新增] 防呆：確保隊長真的在目前的陣容裡
    if (!lineup.find(p => p.id === captainId)) {
      alert("無效的隊長選擇，請重新選擇！")
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
          captain_id: captainId, // [新增 6] 將隊長 ID 存入資料庫
        }, {
          onConflict: 'user_id, week_number' 
        })

      if (error) throw error
      alert('陣容與隊長儲存成功！')
      router.push('/') 
      router.refresh()

    } catch (error) {
      console.error('儲存陣容失敗:', (error as Error).message)
      alert(`儲存失敗: ${(error as Error).message}`)
    } finally {
      setSubmitting(false)
    }
  }
  
  const availablePlayers = useMemo(() => {
    const lineupIds = lineup.map(p => p.id);
    return players.filter(p => !lineupIds.includes(p.id));
  }, [players, lineup]);

  if (loading) return <div style={{textAlign: 'center', marginTop: 50}}>載入玩家資料中...</div>

  return (
    <div className={styles.container}> 
      
      <header className={styles.header}>
        <h1 className={styles.title}>🏀 設定你的陣容 (Week {gameSettings.current_week})</h1>
        <div className={styles.salaryInfo}>
          <p className={styles.salaryText} style={{ color: salaryRemaining < 0 ? '#dc3545' : '#28a745' }}> 
            剩餘薪資: ${salaryRemaining.toLocaleString()}
          </p>
          <p className={styles.salaryText}>
            總薪資: ${currentSalary.toLocaleString()} / ${gameSettings.salary_cap.toLocaleString()}
          </p>
        </div>
      </header>

      <section className={styles.section}> 
        <h2 className={styles.sectionTitle}>
          ✅ 我的陣容 ({lineup.length}/{TOTAL_PLAYERS})
          <span style={{fontSize: '0.8rem', fontWeight: 'normal', marginLeft: '10px', color: '#666'}}>
             (請點擊 ★ 設定隊長 x1.2)
          </span>
        </h2>
        
        {lineup.length === 0 && <p>你的陣容是空的。</p>}
        
        <div className={styles.playerList}>
          {lineup.map(p => (
            <div 
              key={p.id} 
              className={styles.playerRow}
              // [新增 7] 動態樣式：如果是隊長，顯示金色邊框和背景
              style={{
                borderLeft: captainId === p.id ? '5px solid #ffc107' : '4px solid #0070f3',
                backgroundColor: captainId === p.id ? '#fff9e6' : undefined,
                transition: 'all 0.3s ease'
              }}
            >
              <div className={styles.playerInfo}>
                <span className={styles.positionBadge}>{p.position}</span>
                <span className={styles.playerName}>
                  {p.name}
                  {/* [新增 8] 隊長星星按鈕 */}
                  <span 
                    onClick={() => toggleCaptain(p.id)}
                    style={{
                      cursor: 'pointer', 
                      marginLeft: '10px', 
                      color: captainId === p.id ? '#ffc107' : '#e0e0e0', // 選中金，沒選中灰
                      fontSize: '1.2rem',
                      userSelect: 'none'
                    }}
                    title={captainId === p.id ? "取消隊長" : "設為隊長"}
                  >
                    ★
                  </span>
                  {/* 隊長文字提示 */}
                  {captainId === p.id && (
                    <span style={{fontSize: '0.8rem', color: '#d4a017', marginLeft: '5px'}}>
                      (隊長)
                    </span>
                  )}
                </span>
                <span className={styles.playerTeam}>({p.team})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={styles.playerSalary}>${p.salary.toLocaleString()}</span>
                <button className={`${styles.button} ${styles.removeButton}`} onClick={() => removePlayer(p)}>移除</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* 提交按鈕 */}
      <button 
        className={styles.submitButton} 
        onClick={handleSubmitLineup}
        // [新增 9] 沒選隊長不能提交
        disabled={submitting || lineup.length !== TOTAL_PLAYERS || salaryRemaining < 0 || !captainId}
        style={{
           opacity: (submitting || lineup.length !== TOTAL_PLAYERS || salaryRemaining < 0 || !captainId) ? 0.5 : 1
        }}
      >
        {submitting ? '儲存中...' : (!captainId && lineup.length === TOTAL_PLAYERS) ? '請選擇一位隊長' : '儲存本週陣容'}
      </button>

      {/* 球員池 */}
      <section className={styles.section}> 
        <h2 className={styles.sectionTitle}>🔍 球員池 (點擊新增)</h2>
        
        <div className={styles.playerList}>
          {availablePlayers.map(p => (
            <div key={p.id} className={styles.playerRow}>
              <div className={styles.playerInfo}>
                <span className={styles.positionBadge}>{p.position}</span>
                <span className={styles.playerName}>{p.name}</span>
                <span className={styles.playerTeam}>({p.team})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={styles.playerSalary}>${p.salary.toLocaleString()}</span>
                <button className={`${styles.button} ${styles.addButton}`} onClick={() => addPlayer(p)}>+</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}