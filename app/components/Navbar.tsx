"use client";

import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

/* === 玻璃按鈕樣式 === */
const glassBtn: React.CSSProperties = {
  padding: "6px 16px",
  borderRadius: "24px",

  background: "rgba(255, 255, 255, 0.28)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",

  border: "2px solid rgba(255,255,255,0.75)", // ⭐ 清楚玻璃外框
  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",

  fontWeight: 600,
  color: "#333",
  cursor: "pointer",
  textDecoration: "none",

  transition: "0.25s ease",
};

const glassBtnHover: React.CSSProperties = {
  background: "rgba(255,255,255,0.85)",
  transform: "translateY(-2px)",
  boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
};

interface GlassButtonProps {
  href: string;
  children: ReactNode;
}

/* === Glass Button Component === */
function GlassButton({ href, children }: GlassButtonProps) {
  const [hover, setHover] = useState(false);

  return (
    <Link
      href={href}
      style={hover ? { ...glassBtn, ...glassBtnHover } : glassBtn}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user ?? null;

      setUser(sessionUser);

      // 抓 username
      if (sessionUser) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("username")
          .eq("id", sessionUser.id)
          .single();

        setUsername(profile?.username ?? null);
      }

      setLoading(false);
    };

    loadUser();

    // 監聽登入登出事件（v2 正確寫法）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (event === "SIGNED_OUT") {
        router.push("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const displayName = username ?? user?.email ?? "玩家";

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",

        padding: "8px 16px",
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",

        borderBottom: "1px solid rgba(0,0,0,0.08)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* 左側選單 */}
      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <GlassButton href="/">排行榜</GlassButton>
        <GlassButton href="/play">我的陣容</GlassButton>
      </div>

      {/* 右側 UI */}
      <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
        {loading ? (
          <span>讀取中...</span>
        ) : user ? (
          <>
            {/* 玩家名稱 */}
            <span
              style={{
                fontWeight: 600,
                fontSize: "1rem",
                color:"#333333ff",
              }}
            >
              {displayName}
            </span>

            {/* 帳號設定 */}
            <GlassButton href="/account">帳號設定</GlassButton>

            {/* 登出 */}
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                background: "rgba(255,70,70,0.9)",
                border: "2px solid rgba(255,255,255,0.7)",
                borderRadius: "24px",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(255,60,60,0.3)",
                transition: "0.25s",
                
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,40,40,1)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,70,70,0.9)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              登出
            </button>
          </>
        ) : (
          <GlassButton href="/auth">登入 / 註冊</GlassButton>
        )}
      </div>
    </nav>
  );
}
