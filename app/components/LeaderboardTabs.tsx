// components/LeaderboardTabs.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CSSProperties } from "react";
import type { Player, GameSettings } from "../../lib/types";

// ---------------------- 型別 ----------------------
interface WeeklyRankData {
  id: number;
  total_weekly_score: number;
  user_profiles: {
    username: string;
  } | null;
}

interface SeasonRankData {
  id: string;
  username: string;
  total_season_score: number;
}

interface LeaderboardProps {
  weeklyData: WeeklyRankData[];
  seasonData: SeasonRankData[];
  currentWeek: number;
}

// ---------------------- 樣式 ----------------------
const styles: Record<string, CSSProperties> = {
  container: { maxWidth: "700px", margin: "20px auto", padding: "20px" },

  // 旧 tab 還留著，可刪可留
  tabs: { display: "flex", marginBottom: "20px" },
  tab: { padding: "10px 20px", cursor: "pointer", borderBottom: "2px solid transparent" },
  activeTab: { borderBottom: "2px solid #0070f3", fontWeight: "bold" },

  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    borderBottom: "1px solid #ccc",
    padding: "10px",
    textAlign: "left",
    backgroundColor: "#f4f4f4",
  },
  td: { borderBottom: "1px solid #eee", padding: "10px", textAlign: "left" },

  // 新膠囊 Tabs
  tabsContainer: {
    display: "flex",
    background: "#f3f4f6",
    borderRadius: "999px",
    padding: "4px",
    width: "fit-content",
    marginBottom: "20px",
  },

  tabButton: {
    padding: "10px 20px",
    borderRadius: "999px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.95rem",
    transition: "0.2s",
    userSelect: "none",
  },

  activeTabButton: {
    background: "#0070f3",
    color: "white",
    boxShadow: "0 4px 12px rgba(0, 112, 243, 0.3)",
  },
};

// ---------------------- RankTable（立體版） ----------------------
function RankTable({
  data,
}: {
  data: { rank: number; name: string; score: number }[];
}) {
  if (!data || data.length === 0) {
    return <p>尚無資料。（請等待 Phase 4 結算引擎）</p>;
  }

  const maxScore = Math.max(...data.map((d) => d.score), 1);
  const medalEmoji: Record<number, string> = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
  };

  return (
    <div style={{ width: "100%" }}>
      
      {/* ----------- 表頭卡片（新） ------------ */}
      <div
        style={{
          background: "#fafafa",
          borderRadius: "14px",
          padding: "12px 16px",
          marginBottom: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          display: "grid",
          gridTemplateColumns: "55px 1fr 70px",
          fontWeight: 700,
          color: "#222",
          fontSize: "0.95rem",
        }}
      >
        <div style={{ textAlign: "left" }}>排名</div>
        <div style={{ textAlign: "left"}}>玩家名稱</div>
        <div style={{ textAlign: "right"}}>分數</div>
      </div>

      {/* ----------- 內容表格（保持 table 格式） ------------ */}
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "0 2px",
        }}
      >
        <tbody>
          {data.map((row, i) => {
            const isTop3 = row.rank <= 3;

            const baseCell: React.CSSProperties = {
              ...styles.td,
              borderBottom: "none",
              background: "transparent",
            };

            return (
              <motion.tr
                key={row.rank}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                style={{
                  background: "white",
                  boxShadow: isTop3
                    ? "0 3px 12px rgba(255, 200, 0, 0.35)"
                    : "0 2px 6px rgba(0, 0, 0, 0.08)",
                  borderRadius: 16,
                  overflow: "hidden",
                  height: "60px",
                }}
              >
                {/* 排名 / 獎牌 */}
                <td
                  style={{
                    ...baseCell,
                    width: 55,
                    fontSize: "1.4rem",
                    textAlign: "center",
                    paddingLeft: 0,
                    borderTopLeftRadius: 16,
                    borderBottomLeftRadius: 16,
                  }}
                >
                  {isTop3 ? medalEmoji[row.rank] : row.rank}
                </td>

                {/* 玩家 + 進度條 */}
                <td style={{ ...baseCell, fontWeight: 700 }}>
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      color: "#222",
                      textShadow: "0 1px 2px rgba(0,0,0,0.08)",
                      marginBottom: 4,
                    }}
                  >
                    {row.name}
                  </div>

                  <div
                    style={{
                      height: 5,
                      background: "#e5e7eb",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(row.score / maxScore) * 100}%`,
                      }}
                      transition={{ duration: 0.4 }}
                      style={{
                        height: 5,
                        background: isTop3 ? "#f59e0b" : "#3b82f6",
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </td>

                {/* 分數 */}
                <td
                  style={{
                    ...baseCell,
                    width: 70,
                    fontWeight: 900,
                    fontSize: "1.1rem",
                    color: "#111",
                    textShadow: "0 1px 2px rgba(0,0,0,0.15)",
                    textAlign: "right",
                    paddingRight: 20,
                    borderTopRightRadius: 16,
                    borderBottomRightRadius: 16,
                  }}
                >
                  {row.score}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------- 主元件 ----------------------
export default function LeaderboardTabs({
  weeklyData,
  seasonData,
  currentWeek,
}: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<"week" | "season">("week");

  const formattedWeeklyData = weeklyData.map((row, index) => ({
    rank: index + 1,
    name: row.user_profiles?.username || "未知玩家",
    score: row.total_weekly_score,
  }));

  const formattedSeasonData = seasonData.map((row, index) => ({
    rank: index + 1,
    name: row.username || "未知玩家",
    score: row.total_season_score,
  }));

  return (
    <div style={styles.container}>
      <h1>PLG 夢幻籃球</h1>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <div
          style={
            activeTab === "week"
              ? { ...styles.tabButton, ...styles.activeTabButton }
              : styles.tabButton
          }
          onClick={() => setActiveTab("week")}
        >
          本週戰神榜 (Week {currentWeek})
        </div>

        <div
          style={
            activeTab === "season"
              ? { ...styles.tabButton, ...styles.activeTabButton }
              : styles.tabButton
          }
          onClick={() => setActiveTab("season")}
        >
          賽季總排行榜
        </div>
      </div>

      {/* 內容動畫切換 */}
      <AnimatePresence mode="wait">
        {activeTab === "week" && (
          <motion.div
            key="week"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            <RankTable data={formattedWeeklyData} />
          </motion.div>
        )}

        {activeTab === "season" && (
          <motion.div
            key="season"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <RankTable data={formattedSeasonData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
