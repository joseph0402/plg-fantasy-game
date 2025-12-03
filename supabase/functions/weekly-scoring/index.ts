/// <reference lib="deno.ns" />

// supabase/functions/weekly-scoring/index.ts

import { createClient } from '@supabase/supabase-js'

// [修正 1] game_stats 資料表型別
interface GameStat {
  player_id: number;
  [key: string]: number | string | boolean | null;
}

interface GameSettings {
  current_week: number;
  weighted_formula: { [key: string]: number };
}

// [重要] 取得 Admin Client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// [修正 2] 使用 _req
Deno.serve(async (_req: Request) => {

  try {
    console.log(`--- [${new Date().toISOString()}] 結算引擎啟動 ---`);

    // --- 步驟 1: 抓取遊戲設定 ---
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('game_settings')
      .select('current_week, weighted_formula')
      .single(); 

    if (settingsError) throw new Error(`讀取 game_settings 失敗: ${settingsError.message}`);
    
    const { current_week, weighted_formula } = settings as GameSettings;
    console.log(`正在結算 Week: ${current_week}`);
    if (!weighted_formula) throw new Error('加權公式 (weighted_formula) 是空的！');

    // --- 步驟 2: 抓取 "本週" (current_week) 的所有玩家陣容 ---
    const { data: lineups, error: lineupsError } = await supabaseAdmin
      .from('user_lineups')
      .select('id, user_id, selected_players')
      .eq('week_number', current_week);

    if (lineupsError) throw new Error(`抓取 user_lineups 失敗: ${lineupsError.message}`);
    if (!lineups || lineups.length === 0) {
      return new Response(JSON.stringify({ message: `Week ${current_week} 沒有任何玩家陣容，無需結算。` }), {
        headers: { 'ContentType': 'application/json' },
        status: 200,
      });
    }

    console.log(`抓取到 ${lineups.length} 支隊伍準備結算...`);
    
    // --- 步驟 3: 抓取 "本週" 的所有球員數據 ---
    const { data: allStats, error: statsError } = await supabaseAdmin
      .from('game_stats')
      .select('*'); 

    if (statsError) throw new Error(`抓取 game_stats 失敗: ${statsError.message}`);

    const typedAllStats = allStats as GameStat[];

    // --- 步驟 4: 迴圈計算每一支隊伍 ---
    let updates = 0;
    for (const lineup of lineups) {
      const playerIds = lineup.selected_players as number[]; 
      let totalWeeklyScore = 0;

      // 4a. 找出這 5 位球員在本週的表現
      const lineupPlayerStats = typedAllStats.filter(stat => playerIds.includes(stat.player_id));
      
      // 4b. 根據加權公式 (formula) 計算分數
      for (const game of lineupPlayerStats) { 
        for (const key in weighted_formula) { 
          // [修正 3] 檢查 game[key] 必須是數字
          if (game[key] && typeof game[key] === 'number') { 
            totalWeeklyScore += game[key] * weighted_formula[key];
          }
        }
      }
      
      // [!!! 你的要求 !!!] 四捨五入到「整數」
      totalWeeklyScore = Math.round(totalWeeklyScore);

      // --- 步驟 5: 將分數寫回資料庫 ---

      // 5a. 更新 'user_lineups' 的本週分數 (現在存的是 "33" 而不是 "33.3")
      await supabaseAdmin
        .from('user_lineups')
        .update({ total_weekly_score: totalWeeklyScore })
        .eq('id', lineup.id);

      // 5b. "累加" 分數到 'user_profiles' 的賽季總分
      await supabaseAdmin
        .rpc('increment_season_score', { 
          user_id_input: lineup.user_id, 
          score_input: totalWeeklyScore 
        });
      
      updates++;
    }

    console.log(`--- 結算完成 ---`);
    console.log(`總共更新了 ${updates} 支隊伍。`);

    return new Response(JSON.stringify({ message: `成功結算 ${updates} 支隊伍。` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("結算引擎發生嚴重錯誤:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})