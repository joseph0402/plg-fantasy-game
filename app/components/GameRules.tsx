"use client"

import { useState } from 'react'

export default function GameRules() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto 20px auto', // 下方留白
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      overflow: 'hidden'
    }}>
      {/* 標題列 (可點擊) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '15px 20px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#e9ecef',
          fontWeight: 'bold',
          color: '#333'
        }}
      >
        <span>📖 遊戲玩法說明 (點擊展開/收起)</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </div>

      {/* 說明內容 (展開時顯示) */}
      {isOpen && (
        <div style={{ padding: '20px', lineHeight: '1.6', color: '#555' }}>
          
          <h3 style={{ color: '#0070f3', marginTop: 0 }}>🏀 遊戲目標</h3>
          <p>扮演球隊總經理 (GM)，在有限的薪資上限內，組建一支最強的夢幻球隊！球員在真實比賽中的表現，將轉換為你的遊戲積分。</p>

          <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />

          <h3 style={{ color: '#0070f3' }}>📋 組隊規則</h3>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>人數限制：</strong>必須選滿 <strong>5</strong> 名球員。</li>
            <li><strong>位置限制：</strong>需包含 <strong>2名後衛 (G)</strong>、<strong>2名前鋒 (F)</strong>、<strong>1名中鋒 (C)</strong>。</li>
            <li><strong>薪資上限：</strong>所有球員薪資總和不得超過 <strong>$100,000</strong>。</li>
            <li><strong>洋將限制：</strong>陣容中最多只能有 <strong>2名洋將</strong>。</li>
            <li><strong>隊長加成：</strong>必須指定一名球員為 <strong>隊長 (★)</strong>，該球員得分將獲得 <strong>1.2倍</strong> 加成！</li>
          </ul>

          <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />

          <h3 style={{ color: '#0070f3' }}>📊 計分方式</h3>
          <p>球員的積分根據真實比賽數據計算：</p>
          <ul style={{ paddingLeft: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <li>得分：<strong>+1.0</strong> 分</li>
            <li>籃板：<strong>+1.2</strong> 分</li>
            <li>助攻：<strong>+1.5</strong> 分</li>
            <li>抄截：<strong>+2.5</strong> 分</li>
            <li>阻攻：<strong>+2.5</strong> 分</li>
            <li>三分命中：<strong>+1.0</strong> 分</li>
            <li>失誤：<strong>-1.0</strong> 分</li>
          </ul>
        </div>
      )}
    </div>
  )
}