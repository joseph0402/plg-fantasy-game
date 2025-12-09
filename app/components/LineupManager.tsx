"use client";

import { useState, useEffect, useMemo } from "react";
import "./LineupManager.css"; 
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
// 假設 GameSettings 在 lib/types 裡
import type { GameSettings } from "../../lib/types";

// ⭐ 修改：在這裡補充 Player 的定義，確保 TypeScript 知道有 foreigner 欄位
// 如果你的 lib/types.ts 已經改好了，這裡可以不用重複定義，直接 import
interface Player {
  id: number;
  name: string;
  team: string;
  position: "G" | "F" | "C"; // 確保位置型別正確
  salary: number;
  image_url?: string;
  // ⭐ 新增：洋將欄位 (請確認你的 Supabase 回傳的是小寫 foreigner 還是大寫 FOREIGNER)
  foreigner?: boolean; 
  // 其他統計數據欄位...
  PTS?: number;
  REB?: number;
  AST?: number;
  STL?: number;
  BLK?: number;
  TURNOVER?: number;
  THREE_made?: number;
}

interface LineupManagerProps {
  initialPlayers: Player[];
  gameSettings: GameSettings;
}

const LINEUP_RULES = { G: 2, F: 2, C: 1 };
const TOTAL_PLAYERS = 5;
const MAX_FOREIGNERS = 2; // ⭐ 新增：最大洋將數量

export default function LineupManager({ initialPlayers, gameSettings }: LineupManagerProps) {
  
  const [user, setUser] = useState<User | null>(null);
  const [lineup, setLineup] = useState<Player[]>([]);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);

  const [captainId, setCaptainId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [filterPosition, setFilterPosition] = useState("ALL");
  const [filterTeam, setFilterTeam] = useState("ALL");

  const router = useRouter();

  useEffect(() => {
    setPlayers(initialPlayers);
  }, [initialPlayers]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchUserLineup(session.user.id);
      } else {
        router.push("/auth");
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const fetchUserLineup = async (userId: string) => {
    const { data } = await supabase
      .from("user_lineups")
      .select("*")
      .eq("user_id", userId)
      .eq("week_number", gameSettings.current_week)
      .single();

    if (data) {
      setLineup(initialPlayers.filter(p => data.selected_players.includes(p.id)));
      setCaptainId(data.captain_id ?? null);
    }
  };

  // ⭐ 計算薪資、位置數量，以及【洋將數量】
  const { currentSalary, salaryRemaining, positionCounts, foreignerCount } = useMemo(() => {
    const salary = lineup.reduce((sum, p) => sum + p.salary, 0);
    const counts = { G: 0, F: 0, C: 0 };
    
    // ⭐ 計算洋將數
    let fCount = 0;

    lineup.forEach(p => {
      counts[p.position]++;
      // 假設資料庫欄位是 foreigner (true)
      // 如果你的欄位是大寫 FOREIGNER，請改成 p.FOREIGNER
      if (p.foreigner) {
        fCount++;
      }
    });

    return {
      currentSalary: salary,
      salaryRemaining: gameSettings.salary_cap - salary,
      positionCounts: counts,
      foreignerCount: fCount // 回傳洋將數
    };
  }, [lineup, gameSettings.salary_cap]);


  // 新增球員 (加入洋將檢查)
  const addPlayer = (p: Player) => {
    if (lineup.length >= TOTAL_PLAYERS) return alert("陣容已滿 (5人)");
    if (lineup.find(pl => pl.id === p.id)) return alert("球員已在陣容中");
    if (positionCounts[p.position] >= LINEUP_RULES[p.position]) return alert(`位置 ${p.position} 已滿`);
    if (salaryRemaining < p.salary) return alert("薪資不足");

    // ⭐ 新增：檢查洋將限制
    if (p.foreigner && foreignerCount >= MAX_FOREIGNERS) {
      return alert(`洋將名額已滿 (${MAX_FOREIGNERS}名)！無法再選擇洋將。`);
    }

    setLineup([...lineup, p]);
  };

  const removePlayer = (p: Player) => {
    setLineup(lineup.filter(pl => pl.id !== p.id));
    if (captainId === p.id) setCaptainId(null);
  };

  const toggleCaptain = (playerId: number) =>
    setCaptainId(prev => (prev === playerId ? null : playerId));

  const handleSubmitLineup = async () => {
    if (lineup.length !== TOTAL_PLAYERS) return alert(`需要 5 名球員`);
    if (!captainId) return alert("請選擇隊長（★）");

    // 雙重檢查 (非必要但安全)
    if (foreignerCount > MAX_FOREIGNERS) return alert("洋將數量超過限制");

    setSubmitting(true);
    const { error } = await supabase
      .from("user_lineups")
      .upsert({
        user_id: user?.id,
        week_number: gameSettings.current_week,
        selected_players: lineup.map(p => p.id),
        captain_id: captainId
      }, { onConflict: "user_id, week_number" });

    setSubmitting(false);

    if (error) return alert("儲存失敗");

    alert("成功儲存");
    router.push("/");
  };


  const availablePlayers = useMemo(() => {
    const selectedIds = new Set(lineup.map(p => p.id));
    return players.filter(p =>
      !selectedIds.has(p.id) &&
      (filterPosition === "ALL" || p.position === filterPosition) &&
      (filterTeam === "ALL" || p.team === filterTeam)
    );
  }, [players, lineup, filterPosition, filterTeam]);


  if (loading) return <div>載入中...</div>;

  return (
    <>
      <div className="salaryBox">
        剩餘薪資：${salaryRemaining.toLocaleString()}
      </div>
  
      <div className="container">
        {/* ===== 我的陣容 ===== */}
        <section className="section">
          <h2 className="sectionTitle">
            我的陣容 ({lineup.length}/5)
            <span style={{ fontSize: "0.9rem", marginLeft: 16, marginRight: 16, color: "#777" }}>
              （點 ★ 設定隊長 x1.2）
            </span>
          </h2>

          {/* ⭐ 顯示洋將數量統計 */}
          <div style={{ marginBottom: 10, fontSize: "0.95rem", color: "#444" }}>
            G: {positionCounts['G']}/{LINEUP_RULES['G']} ｜ 
            F: {positionCounts['F']}/{LINEUP_RULES['F']} ｜ 
            C: {positionCounts['C']}/{LINEUP_RULES['C']} ｜ 
            <span style={{ 
              fontWeight: "bold", 
              color: foreignerCount > MAX_FOREIGNERS ? "red" : "#0070f3",
              marginLeft: 8 
            }}>
              洋將: {foreignerCount}/{MAX_FOREIGNERS}
            </span>
          </div>
  
          <div className="playerList">
            {lineup.map(p => (
              <div
                key={p.id}
                className="playerRow"
                style={{
                  borderLeft: captainId === p.id ? "5px solid gold" : "5px solid #0070f3",
                  backgroundColor: captainId === p.id ? "#fff7d1" : ""
                }}
              >
                <div className="playerInfo">
                  {p.image_url && <img src={p.image_url} className="playerPhoto" />}
                  <span className="positionBadge">{p.position}</span>
  
                  <div className="playerText">
                    <span className="playerName">
                      {p.name}
                      
                      {/* ⭐ 顯示洋將標籤 */}
                      {p.foreigner && (
                        <span style={{ 
                          fontSize: "0.7rem", 
                          backgroundColor: "#666", 
                          color: "#fff", 
                          padding: "2px 4px", 
                          borderRadius: 4, 
                          marginLeft: 6,
                          verticalAlign: "middle"
                        }}>
                          洋
                        </span>
                      )}

                      <span
                        className="captainStar"
                        onClick={() => toggleCaptain(p.id)}
                        style={{
                          color: captainId === p.id ? "gold" : "#ccc",
                          marginLeft: 8,
                          cursor: "pointer"
                        }}
                      >
                        ★
                      </span>
                    </span>
  
                    <span className="playerTeam">({p.team})</span>
  
                    <div className="playerStats">
                      PTS {p.PTS} ｜ REB {p.REB} ｜ AST {p.AST} ｜ STL {p.STL} ｜ BLK {p.BLK} ｜ TOV {p.TURNOVER} ｜ 3PM {p.THREE_made}
                    </div>
                  </div>
                </div>
  
                <div className="playerActions">
                  <span className="playerSalary">${p.salary.toLocaleString()}</span>
                  <button className="button removeButton" onClick={() => removePlayer(p)}>移除</button>
                </div>
  
              </div>
            ))}
          </div>
        </section>
  
        {/* ===== 提交 ===== */}
        <button
          className="submitButton"
          // ⭐ 增加條件：洋將數量不能超過
          disabled={!captainId || lineup.length !== 5 || foreignerCount > MAX_FOREIGNERS}
          onClick={handleSubmitLineup}
          style={{ opacity: (!captainId || lineup.length !== 5 || foreignerCount > MAX_FOREIGNERS) ? 0.5 : 1 }}
        >
          {!captainId ? "請選擇隊長" : "儲存本週陣容"}
        </button>
  
        {/* ===== 球員池 ===== */}
        <section className="section">
          <h2 className="sectionTitle">球員池</h2>
  
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <select value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)} className="filterSelect">
              <option value="ALL">所有位置</option>
              <option value="G">G</option>
              <option value="F">F</option>
              <option value="C">C</option>
            </select>
  
            <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className="filterSelect">
              <option value="ALL">所有球隊</option>
              {Array.from(new Set(players.map(p => p.team))).map(team => (
                <option key={team}>{team}</option>
              ))}
            </select>
          </div>
  
          <div className="playerList">
            {availablePlayers.map(p => (
              <div key={p.id} className="playerRow">
                <div className="playerInfo">
                  {p.image_url && <img src={p.image_url} className="playerPhoto" />}
                  <span className="positionBadge">{p.position}</span>
  
                  <div className="playerText">
                    <span className="playerName">
                      {p.name}
                      {/* ⭐ 球員池也顯示洋將標籤 */}
                      {p.foreigner && (
                        <span style={{ 
                          fontSize: "0.7rem", 
                          backgroundColor: "#666", 
                          color: "#fff", 
                          padding: "2px 4px", 
                          borderRadius: 4, 
                          marginLeft: 6,
                          verticalAlign: "middle"
                        }}>
                          洋
                        </span>
                      )}
                    </span>
                    <span className="playerTeam">({p.team})</span>
                    <div className="playerStats">
                      PTS {p.PTS} ｜ REB {p.REB} ｜ AST {p.AST} ｜ STL {p.STL} ｜ BLK {p.BLK} ｜ TOV {p.TURNOVER} ｜ 3PM {p.THREE_made}
                    </div>
                  </div>
                </div>
  
                <div>
                  <span className="playerSalary">${p.salary.toLocaleString()}</span>
                  <button className="button addButton" onClick={() => addPlayer(p)}>+</button>
                </div>
              </div>
            ))}
          </div>
  
        </section>
      </div>
    </>
  );
}