// components/LeaderboardTabs.tsx

"use client" // [重要] 因為我們用了 useState

import { useState } from 'react'
import type { Player, GameSettings } from '../../lib/types' // 雖然沒直接用，但TS會需要

// [新增] 我們需要定義傳入的 props 型別
// 這是 Supabase join 查詢後的回傳樣貌
interface WeeklyRankData {
  id: number;
  total_weekly_score: number;
  user_profiles: { // 這是我們 join 來的 user_profiles 表
    username: string;
  } | null; // user_profiles 可能是 null
}

interface SeasonRankData {
  id: string; // 這是 user_profiles 的 id (uuid)
  username: string;
  total_season_score: number;
}

interface LeaderboardProps {
  weeklyData: WeeklyRankData[];
  seasonData: SeasonRankData[];
  currentWeek: number;
}

// ----------------------------------------------------
// 樣式 (不變)
const styles: { [key: string]: React.CSSProperties } = {
  container: { maxWidth: '700px', margin: '20px auto', padding: '20px' },
  tabs: { display: 'flex', marginBottom: '20px' },
  tab: { padding: '10px 20px', cursor: 'pointer', borderBottom: '2px solid transparent' },
  activeTab: { borderBottom: '2px solid #0070f3', fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { borderBottom: '1px solid #ccc', padding: '10px', textAlign: 'left', backgroundColor: '#f4f4f4' },
  td: { borderBottom: '1px solid #eee', padding: '10px', textAlign: 'left' }
}

// ----------------------------------------------------
// 排行榜表格組件 (我們把它放在同一個檔案)
// [修改] 我們讓 RankTable 更通用
function RankTable({ data }: { data: { rank: number, name: string, score: number }[] }) {
  if (!data || data.length === 0) {
    return <p>尚無資料。 (請等待 Phase 4 的結算引擎執行)</p>
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>排名</th>
          <th style={styles.th}>玩家名稱</th>
          <th style={styles.th}>分數</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.rank}>
            <td style={styles.td}>{row.rank}</td>
            <td style={styles.td}>{row.name}</td>
            <td style={styles.td}>{row.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ----------------------------------------------------
// 這是主要的 Client Component
export default function LeaderboardTabs({ weeklyData, seasonData, currentWeek }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState('week') // 'week' or 'season'

  // [新增] 我們在 Client 端轉換資料格式，使其符合 RankTable
  const formattedWeeklyData = weeklyData.map((row, index) => ({
    rank: index + 1,
    name: row.user_profiles?.username || '未知玩家', // 安全地取得 username
    score: row.total_weekly_score
  }));

  const formattedSeasonData = seasonData.map((row, index) => ({
    rank: index + 1,
    name: row.username || '未知玩家',
    score: row.total_season_score
  }));

  return (
    <div style={styles.container}>
      <h1>PLG 夢幻籃球</h1>
      
      {/* Tab 切換 */}
      <div style={styles.tabs}>
        <div 
          style={activeTab === 'week' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('week')}
        >
          本週戰神榜 (Week {currentWeek})
        </div>
        <div 
          style={activeTab === 'season' ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab('season')}
        >
          賽季總排行榜
        </div>
      </div>

      {/* 內容 */}
      <div>
        {activeTab === 'week' && (
          <RankTable data={formattedWeeklyData} />
        )}
        {activeTab === 'season' && (
          <RankTable data={formattedSeasonData} />
        )}
      </div>
    </div>
  )
}