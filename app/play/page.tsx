// app/play/page.tsx

// 這是 Server Component，負責抓資料
import { supabase } from '../../lib/supabaseClient'
import LineupManager from '../components/LineupManager'
import GameRules from '../components/GameRules' // [新增] 引入規則組件
import type { Player, GameSettings } from '../../lib/types'

// 抓取球員 (回傳型別是 Player[])
async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('salary', { ascending: false })
  
  if (error) console.error('Error fetching players:', error)
  return (data as Player[]) || [] 
}

// 抓取設定 (回傳型別是 GameSettings | null)
async function getGameSettings(): Promise<GameSettings | null> {
  const { data, error } = await supabase
    .from('game_settings')
    .select('*')
    .single() 
  
  if (error) {
    console.error('Error fetching settings:', error)
    return null 
  }
  return (data as GameSettings) || null
}

// 這是頁面主體
export default async function PlayPage() {
  // 1. 在伺服器上同時抓取資料
  const [players, gameSettings] = await Promise.all([
    getPlayers(),
    getGameSettings()
  ])

  // 2. 處理 null 的情況
  if (!gameSettings) {
    return <div>錯誤：無法載入遊戲設定(gameSettings)。</div>
  }
  
  if (players.length === 0) {
    return <div>錯誤：無法載入球員資料(players)。</div>
  }

  // 3. 渲染頁面
  return (
    <div style={{ padding: '20px' }}> {/* [修改] 加一個外層 div 來包住兩者 */}
      
      {/* [新增] 在最上方放置遊戲說明 */}
      <GameRules />

      {/* 原本的陣容管理器 */}
      <LineupManager 
        initialPlayers={players} 
        gameSettings={gameSettings} 
      />
    </div>
  )
}

export const revalidate = 0