// app/page.tsx

// [修正路徑] lib 在 app 外面，所以用 '../lib'
import { supabase } from '../lib/supabaseClient' 
// [修正路徑] components 在 app 裡面，所以用 './components'
import LeaderboardTabs from './components/LeaderboardTabs' 
// [修正路徑] lib/types 也在 app 外面
import type { GameSettings } from '../lib/types' 

// ----------------------------------------------------
// (以下程式碼不變，但為了保險起見，請全部複製貼上)
// ----------------------------------------------------

// 這是 Server Component，可以直接抓資料

// 抓取設定
async function getGameSettings(): Promise<GameSettings | null> {
  const { data, error } = await supabase
    .from('game_settings')
    .select('current_week')
    .single()
  if (error) {
    console.error('抓取設定失敗:', error)
    return null
  }
  return data as GameSettings
}

// 抓取本週排行
async function getWeeklyData(currentWeek: number) {
  const { data, error } = await supabase
    .from('user_lineups') 
    .select(`
      id,
      total_weekly_score,
      user_profiles ( username ) 
    `) 
    .eq('week_number', currentWeek)
    .order('total_weekly_score', { ascending: false }) 
    .limit(100) 

  if (error) {
    console.error('抓取本週排行失敗:', error.message)
  }
  return data || []
}

// 抓取賽季排行
async function getSeasonData() {
  const { data, error } = await supabase
    .from('user_profiles') 
    .select(`
      id,
      username,
      total_season_score
    `)
    .order('total_season_score', { ascending: false }) 
    .limit(100)

  if (error) console.error('抓取賽季排行失敗:', error)
  return data || []
}


// 首頁 (Page)
export default async function Home() {
  // 1. 抓取資料
  const settings = await getGameSettings()
  const currentWeek = settings?.current_week || 1 
  
  const weeklyData = await getWeeklyData(currentWeek)
  const seasonData = await getSeasonData()

  // 2. 將資料傳遞給 Client Component
  return (
    <LeaderboardTabs 
      weeklyData={weeklyData as any} 
      seasonData={seasonData as any} 
      currentWeek={currentWeek} 
    />
  )
}

// [重要] 我們需要動態渲染來確保資料是最新
export const revalidate = 0