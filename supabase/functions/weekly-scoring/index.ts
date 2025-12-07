/// <reference lib="deno.ns" />

import { createClient } from '@supabase/supabase-js'

interface GameStat {
  player_id: number;
  [key: string]: number | string | boolean | null;
}

interface GameSettings {
  current_week: number;
  weighted_formula: { [key: string]: number };
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (_req: Request) => {

  try {
    console.log(`--- [${new Date().toISOString()}] 結算引擎啟動 ---`);

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('game_settings')
      .select('current_week, weighted_formula')
      .single(); 

    if (settingsError) throw new Error(`讀取 game_settings 失敗: ${settingsError.message}`);
    
    const { current_week, weighted_formula } = settings as GameSettings;
    console.log(`正在結算 Week: ${current_week}`);
    if (!weighted_formula) throw new Error('加權公式 (weighted_formula) 是空的！');

    // [修改] 記得要 select captain_id
    const { data: lineups, error: lineupsError } = await supabaseAdmin
      .from('user_lineups')
      .select('id, user_id, selected_players, captain_id')
      .eq('week_number', current_week);

    if (lineupsError) throw new Error(`抓取 user_lineups 失敗: ${lineupsError.message}`);
    if (!lineups || lineups.length === 0) {
      return new Response(JSON.stringify({ message: `Week ${current_week} 沒有任何玩家陣容，無需結算。` }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`抓取到 ${lineups.length} 支隊伍準備結算...`);
    
    const { data: allStats, error: statsError } = await supabaseAdmin
      .from('game_stats')
      .select('*'); 

    if (statsError) throw new Error(`抓取 game_stats 失敗: ${statsError.message}`);

    const typedAllStats = allStats as GameStat[];

    let updates = 0;
    for (const lineup of lineups) {
      const playerIds = lineup.selected_players as number[]; 
      const captainId = lineup.captain_id; // [新增] 取得隊長 ID
      
      let totalWeeklyScore = 0;

      const lineupPlayerStats = typedAllStats.filter(stat => playerIds.includes(stat.player_id));
      
      for (const game of lineupPlayerStats) { 
        let gameScore = 0;
        for (const key in weighted_formula) { 
          if (game[key] && typeof game[key] === 'number') { 
            gameScore += (game[key] as number) * weighted_formula[key];
          }
        }
        
        // [新增] 隊長加成 (x1.2)
        if (captainId && game.player_id === captainId) {
            gameScore = gameScore * 1.2;
        }

        totalWeeklyScore += gameScore;
      }
      
      totalWeeklyScore = Math.round(totalWeeklyScore);

      await supabaseAdmin
        .from('user_lineups')
        .update({ total_weekly_score: totalWeeklyScore })
        .eq('id', lineup.id);

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