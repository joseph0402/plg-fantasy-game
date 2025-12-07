"use client";

import { useState, useEffect, useMemo } from "react";
import "./LineupManager.css"; 
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Player, GameSettings, Position } from "../../lib/types";

interface LineupManagerProps {
  initialPlayers: Player[];
  gameSettings: GameSettings;
}

const LINEUP_RULES = { G: 2, F: 2, C: 1 };
const TOTAL_PLAYERS = 5;

export default function LineupManager({ initialPlayers, gameSettings }: LineupManagerProps) {
  
  const [user, setUser] = useState<User | null>(null);
  const [lineup, setLineup] = useState<Player[]>([]);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);

  // ⭐ 新增：隊長 ID
  const [captainId, setCaptainId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [filterPosition, setFilterPosition] = useState("ALL");
  const [filterTeam, setFilterTeam] = useState("ALL");

  const router = useRouter();

  // 初次載入 players
  useEffect(() => {
    setPlayers(initialPlayers);
  }, [initialPlayers]);


  // 讀取使用者資料
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


  // 載入資料庫中的陣容 + 隊長
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


  // 計算薪資
  const { currentSalary, salaryRemaining, positionCounts } = useMemo(() => {
    const salary = lineup.reduce((sum, p) => sum + p.salary, 0);
    const counts: Record<Position, number> = { G: 0, F: 0, C: 0 };
    lineup.forEach(p => counts[p.position]++);
    return {
      currentSalary: salary,
      salaryRemaining: gameSettings.salary_cap - salary,
      positionCounts: counts
    };
  }, [lineup, gameSettings.salary_cap]);


  // 新增球員
  const addPlayer = (p: Player) => {
    if (lineup.length >= TOTAL_PLAYERS) return alert("陣容已滿 (5人)");
    if (lineup.find(pl => pl.id === p.id)) return alert("球員已在陣容中");
    if (positionCounts[p.position] >= LINEUP_RULES[p.position]) return alert(`位置 ${p.position} 已滿`);
    if (salaryRemaining < p.salary) return alert("薪資不足");
    setLineup([...lineup, p]);
  };

  // 移除球員 + 若是隊長就取消
  const removePlayer = (p: Player) => {
    setLineup(lineup.filter(pl => pl.id !== p.id));
    if (captainId === p.id) setCaptainId(null);
  };

  // ⭐ 切換隊長
  const toggleCaptain = (playerId: number) =>
    setCaptainId(prev => (prev === playerId ? null : playerId));

  // 提交
  const handleSubmitLineup = async () => {
    if (lineup.length !== TOTAL_PLAYERS) return alert(`需要 5 名球員`);
    if (!captainId) return alert("請選擇隊長（★）");

    const { error } = await supabase
      .from("user_lineups")
      .upsert({
        user_id: user?.id,
        week_number: gameSettings.current_week,
        selected_players: lineup.map(p => p.id),
        captain_id: captainId
      }, { onConflict: "user_id, week_number" });

    if (error) return alert("儲存失敗");

    alert("成功儲存");
    router.push("/");
  };


  // 球員池過濾
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
    <div className="container">

      {/* ===== 我的陣容 ===== */}
      <section className="section">
        <h2 className="sectionTitle">
          我的陣容 ({lineup.length}/5)
          <span style={{ fontSize: "0.9rem", marginLeft: 16, marginRight: 16, color: "#777" }}>
            （點 ★ 設定隊長 x1.2）
          </span>
        </h2>

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

                {/* 左邊：球員資訊 */}
                <div className="playerInfo">

                  <img src={p.image_url} className="playerPhoto" />

                  <span className="positionBadge">{p.position}</span>

                  <div className="playerText">

                    <span className="playerName">
                      {p.name}

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

                  </div> {/* playerText */}
                </div> {/* playerInfo */}

                {/* 右邊：薪資 & 按鈕 */}
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
        disabled={!captainId || lineup.length !== 5}
        onClick={handleSubmitLineup}
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

                <img src={p.image_url} className="playerPhoto" />

                <span className="positionBadge">{p.position}</span>

                <div className="playerText">
                  <span className="playerName">{p.name}</span>
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
  );
}
