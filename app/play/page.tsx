// app/play/page.tsx

// 這是 Server Component，負責抓資料
import { supabase } from '../../lib/supabaseClient'
import LineupManager from '../components/LineupManager'
import type { Player, GameSettings } from '../../lib/types' // [修正] 從共享檔案匯入

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
    return null // 確保錯誤時回傳 null
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

  // 2. [關鍵] 處理 null 的情況
  if (!gameSettings) {
    return <div>錯誤：無法載入遊戲設定(gameSettings)。</div>
  }
  
  if (players.length === 0) {
    return <div>錯誤：無法載入球員資料(players)。(請檢查你是否已在 Supabase 手動輸入球員)</div>
  }

  // 3. 將資料作為 props 傳遞給 Client Component
  // 到了這裡，TypeScript 知道 gameSettings "絕對不是 null"
  return (
    <LineupManager 
      initialPlayers={players} 
      gameSettings={gameSettings} 
    />
  )
}

// [重要] 我們需要動態渲染來確保用戶認證
export const revalidate = 0