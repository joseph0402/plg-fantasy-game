"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const router = useRouter();

  /* ===== 取得玩家資料 ===== */
  const fetchProfile = useCallback(async (currentUser: User) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("id", currentUser.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      setUsername(data?.username ?? "");
    } catch (err) {
      console.error("Profile 載入失敗:", (err as Error).message);
      setMessage({ type: "error", text: "無法載入玩家資料。" });
    } finally {
      setLoading(false);
    }
  }, []);

  /* ===== 檢查使用者登入狀態 ===== */
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/auth");
      setUser(session.user);
      await fetchProfile(session.user);
    };
    checkUser();
  }, [router, fetchProfile]);

  /* ===== 更新玩家名稱 ===== */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ username })
        .eq("id", user.id);

      if (error) throw error;

      setMessage({ type: "success", text: "玩家名稱更新成功！" });
      router.refresh();

      setTimeout(() => router.push("/"), 1800);
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      {/* 背景光暈 */}
      <div style={glow1}></div>
      <div style={glow2}></div>

      {/* 玻璃卡片 */}
      <div style={glassCard}>
        <h2 style={title}>帳號設定</h2>

        <form onSubmit={handleUpdateProfile}>
          <label style={label}>Email (不可修改)</label>
          <input
            style={{ ...input, background: "rgba(240,240,240,0.9)" }}
            value={user?.email || ""}
            disabled
          />

          <label style={label}>玩家名稱</label>
          <input
            style={input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="請輸入你的玩家名稱"
            disabled={loading}
          />

          <button style={button} disabled={loading}>
            {loading ? "儲存中..." : "儲存變更"}
          </button>
        </form>

        {message && (
          <p style={message.type === "success" ? successText : errorText}>
            {message.text}
          </p>
        )}
      </div>

      <style>{`
        @keyframes floatCard {
          0% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ===== 🎨 Frosted Glass UI Styles (與 auth 一致) ===== */
/* ===== 🎨 Frosted Glass UI Styles (TypeScript-safe version) ===== */

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #fafafa, #e6ebf4)",
  position: "relative",
  overflow: "hidden",
} as const;

const glow1 = {
  position: "absolute",
  width: "380px",
  height: "380px",
  borderRadius: "50%",
  background: "rgba(255, 153, 255, 0.4)",
  filter: "blur(120px)",
  top: "-60px",
  left: "-40px",
} as const;

const glow2 = {
  position: "absolute",
  width: "420px",
  height: "420px",
  borderRadius: "50%",
  background: "rgba(120, 180, 255, 0.35)",
  filter: "blur(130px)",
  bottom: "-80px",
  right: "-60px",
} as const;

const glassCard = {
  width: "100%",
  maxWidth: "420px",
  padding: "40px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.8)",
  boxShadow:
    "0 8px 25px rgba(0,0,0,0.12), 0 15px 35px rgba(0,0,0,0.08), inset 0 0 25px rgba(255,255,255,0.2)",
  animation: "floatCard 6s ease-in-out infinite" as any,
} as const;

const title = {
  textAlign: "center",
  fontSize: "28px",
  fontWeight: "700",
  marginBottom: "25px",
  color: "#333",
} as const;

const label = {
  fontSize: "15px",
  fontWeight: "600",
  marginBottom: "6px",
  display: "block",
  color: "#333",
} as const;

const input = {
  width: "100%",
  padding: "14px",
  margin: "10px 0 18px",
  borderRadius: "14px",
  border: "1px solid rgba(0,0,0,0.12)",
  background: "rgba(255,255,255,0.9)",
  fontSize: "16px",
  outline: "none",
  color: "#333",
  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.08)",
} as const;

const button = {
  width: "100%",
  padding: "14px",
  borderRadius: "14px",
  border: "none",
  background:
    "linear-gradient(135deg, rgb(90,140,255), rgb(120,100,255))",
  color: "white",
  fontWeight: "700",
  fontSize: "17px",
  cursor: "pointer",
  transition: "0.25s",
  marginTop: "10px",
  boxShadow: "0 6px 16px rgba(120,140,255,0.35)",
} as const;

const successText = {
  color: "#2f7a32",
  textAlign: "center",
  marginTop: "12px",
  fontWeight: "600",
} as const;

const errorText = {
  color: "#d9534f",
  textAlign: "center",
  marginTop: "12px",
  fontWeight: "600",
} as const;
