"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      router.push("/"); // ← 登入成功 → 排行榜
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!username) return setError("請輸入玩家名稱");

    setLoading(true);
    setError(null);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signupError) throw signupError;

      await supabase
        .from("user_profiles")
        .insert({ id: data.user.id, username });

      alert("註冊成功！請登入");
      setIsLogin(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      {/* 3D 背景光暈 */}
      <div style={glow1}></div>
      <div style={glow2}></div>

      <div style={glassCard}>
        <h2 style={title}>{isLogin ? "登入遊戲" : "創建帳號"}</h2>

        <form onSubmit={isLogin ? handleLogin : handleSignUp}>
          {!isLogin && (
            <input
              style={input}
              placeholder="玩家名稱"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}

          <input
            style={input}
            type="email"
            placeholder="Email 信箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={input}
            type="password"
            placeholder="密碼（至少 6 位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button style={button} disabled={loading}>
            {loading ? "處理中..." : isLogin ? "登入" : "註冊"}
          </button>
        </form>

        {error && <p style={errorText}>{error}</p>}

        <button style={switchButton} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "沒有帳號？點我註冊" : "已有帳號？點我登入"}
        </button>
      </div>

      {/* 動畫 */}
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

/* ==== 🎨 3D Frosted Glass Styles ==== */

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #fafafa, #e6ebf4)",
  position: "relative",
  overflow: "hidden",
};

/* --- 背景光暈效果（霧玻璃設計精髓） --- */

const glow1 = {
  position: "absolute",
  width: "380px",
  height: "380px",
  borderRadius: "50%",
  background: "rgba(255, 153, 255, 0.4)",
  filter: "blur(120px)",
  top: "-60px",
  left: "-40px",
};

const glow2 = {
  position: "absolute",
  width: "420px",
  height: "420px",
  borderRadius: "50%",
  background: "rgba(120, 180, 255, 0.35)",
  filter: "blur(130px)",
  bottom: "-80px",
  right: "-60px",
};

/* --- 3D 霧面玻璃卡片 --- */

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
  animation: "floatCard 6s ease-in-out infinite",
};

const title = {
  textAlign: "center",
  fontSize: "28px",
  fontWeight: "700",
  marginBottom: "25px",
  color: "#333",
};

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
};

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
};

const switchButton = {
  marginTop: "18px",
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.75)",
  border: "1px solid rgba(0,0,0,0.12)",
  cursor: "pointer",
  color: "#333",
};

const errorText = {
  color: "#d9534f",
  textAlign: "center",
  marginTop: "10px",
};
