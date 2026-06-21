import { useState, useEffect, useMemo } from "react";

const C = {
  bg: "#FFF8F0", card: "#FFFFFF", accent: "#E8A87C", accentSoft: "#FDE8D0",
  green: "#7BC67E", greenSoft: "#E3F5E1", blue: "#7EB8D4", blueSoft: "#DFF0F8",
  purple: "#B59ED8", purpleSoft: "#EDE4F5", pink: "#E89BBF", pinkSoft: "#FCE4EF",
  text: "#4A3728", textMuted: "#9B8B7D", border: "#F0E6DA", danger: "#E87C7C", dangerSoft: "#FCE4E4",
  gold: "#D4A017", goldSoft: "#FFF8E1",
};

const Badge = ({ children, color = C.accent, bg = C.accentSoft }) => (
  <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" }}>{children}</span>
);
const IconBtn = ({ children, onClick, active, color = C.accent }) => (
  <button onClick={onClick} style={{ background: active ? color : "transparent", color: active ? "#fff" : color, border: `1.5px solid ${color}`, borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>{children}</button>
);
const Card = ({ children, style }) => (
  <div style={{ background: C.card, borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(74,55,40,.06)", border: `1px solid ${C.border}`, ...style }}>{children}</div>
);
const SectionTitle = ({ emoji, children }) => (
  <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 22 }}>{emoji}</span>{children}</h2>
);
const Input = (props) => (
  <input {...props} style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "7px 12px", fontSize: 13, color: C.text, outline: "none", width: "100%", boxSizing: "border-box", background: C.bg, ...props.style }} />
);
const Select = ({ children, ...props }) => (
  <select {...props} style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "7px 12px", fontSize: 13, color: C.text, outline: "none", background: C.bg, cursor: "pointer", ...props.style }}>{children}</select>
);

// ============ TAB 1: CROP TIMER ============
const CROPS = [
  { name: "トマト", min: 15, lv: "1", tip: "最速レベリング用" },
  { name: "ジャガイモ", min: 15, lv: "1", tip: "トマトと同じ回転率" },
  { name: "小麦", min: 240, lv: "2", tip: "4時間。就寝/外出前に" },
  { name: "レタス", min: 480, lv: "3", tip: "8時間。寝る前に植えて朝収穫" },
  { name: "パイナップル", min: 30, lv: "4", tip: "30分。トマトの次のレベリング候補" },
  { name: "にんじん", min: 120, lv: "5", tip: "2時間" },
  { name: "いちご", min: 360, lv: "6", tip: "6時間。ジャム金策に" },
  { name: "ブルーベリー", min: 60, lv: "1", tip: "1時間" },
  { name: "とうもろこし", min: 480, lv: "3", tip: "8時間" },
  { name: "ブドウ", min: 720, lv: "7", tip: "12時間。ジャム金策最強クラス" },
  { name: "ナス", min: 720, lv: "8", tip: "12時間" },
  { name: "茶葉", min: 720, lv: "11", tip: "12時間" },
  { name: "カカオ豆", min: 720, lv: "12", tip: "12時間" },
  { name: "アボカド", min: 720, lv: "13", tip: "12時間" },
  { name: "カスタム", min: 0, lv: "-", tip: "" },
];
function CropTimer() {
  const [timers, setTimers] = useState([]);
  const [crop, setCrop] = useState(CROPS[0].name);
  const [customH, setCustomH] = useState(""); const [customName, setCustomName] = useState("");
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);
  const addTimer = () => {
    const c = CROPS.find(x => x.name === crop);
    const mins = crop === "カスタム" ? (parseFloat(customH) || 1) * 60 : c.min;
    const name = crop === "カスタム" ? (customName || "カスタム") : crop;
    setTimers(p => [...p, { id: Date.now(), name, planted: Date.now(), harvestAt: Date.now() + mins * 60000, tip: c ? c.tip : "" }]);
  };
  const fmtRemain = (ms) => { if (ms <= 0) return "収穫OK!"; const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); return h > 0 ? `${h}h${m}m${s}s` : `${m}m${s}s`; };
  const fmtDuration = (min) => min >= 60 ? `${min / 60}時間` : `${min}分`;
  return (
    <Card>
      <SectionTitle emoji="🌱">栽培タイマー</SectionTitle>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>攻略Wiki準拠の実際の収穫時間。ブランクから種を購入して育てます</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Select value={crop} onChange={e => setCrop(e.target.value)} style={{ flex: 1, minWidth: 120 }}>
          {CROPS.map(c => <option key={c.name} value={c.name}>{c.name}{c.min ? ` (${fmtDuration(c.min)})` : ""}{c.lv && c.lv !== "-" ? ` Lv${c.lv}` : ""}</option>)}
        </Select>
        {crop === "カスタム" && (<><Input placeholder="作物名" value={customName} onChange={e => setCustomName(e.target.value)} style={{ flex: 1, minWidth: 80 }} /><Input placeholder="時間(h)" type="number" value={customH} onChange={e => setCustomH(e.target.value)} style={{ width: 70, flex: "none" }} /></>)}
        <IconBtn onClick={addTimer} color={C.green}>+ 植える</IconBtn>
      </div>
      {timers.length === 0 && <p style={{ color: C.textMuted, fontSize: 13, textAlign: "center", margin: "18px 0 4px" }}>まだ作物を植えていません</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {timers.map(t => { const remain = t.harvestAt - Date.now(); const done = remain <= 0; const pct = Math.min(100, Math.max(0, ((Date.now() - t.planted) / (t.harvestAt - t.planted)) * 100)); return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: done ? C.greenSoft : C.bg, border: `1px solid ${done ? C.green : C.border}` }}>
            <span style={{ fontSize: 20 }}>{done ? "🌾" : "🌿"}</span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div><div style={{ fontSize: 12, color: done ? C.green : C.textMuted, fontWeight: done ? 700 : 400 }}>{fmtRemain(remain)}</div>
              {!done && <div style={{ height: 4, borderRadius: 2, background: C.border, marginTop: 4 }}><div style={{ height: 4, borderRadius: 2, background: C.green, width: `${pct}%`, transition: "width 1s linear" }} /></div>}
            </div>
            <button onClick={() => setTimers(p => p.filter(x => x.id !== t.id))} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>); })}
      </div>
    </Card>);
}

// ============ TAB 2: DAILY TASKS ============
const DEFAULT_TASKS = [
  { id: 1, text: "ログインボーナス受取", cat: "管理" }, { id: 2, text: "ショップ巡回 (日替わり/週替わり確認)", cat: "管理" },
  { id: 3, text: "デイリー依頼クリア", cat: "依頼" }, { id: 4, text: "ウィークリー依頼 進捗確認", cat: "依頼" },
  { id: 5, text: "畑の水やり (雨/雪の日は自動)", cat: "園芸" }, { id: 6, text: "作物の収穫 → 種まき", cat: "園芸" },
  { id: 7, text: "ペットのえさやり/スキンシップ", cat: "ペット" }, { id: 8, text: "ペットトレーニング (芸を教える)", cat: "ペット" },
  { id: 9, text: "釣り (図鑑埋め/金策)", cat: "趣味" }, { id: 10, text: "虫捕り (バブルワンドで採集)", cat: "趣味" },
  { id: 11, text: "バードウォッチング (双眼鏡スキャン)", cat: "趣味" }, { id: 12, text: "料理 (ジャム/サラダなど加工品売却)", cat: "料理" },
  { id: 13, text: "家具屋チェック (日替わり商品)", cat: "建築" }, { id: 14, text: "イベント進捗確認", cat: "管理" },
  { id: 15, text: "天気予報チェック (腕時計→天気マーク)", cat: "管理" }, { id: 16, text: "ドリスの幸運商店 (雨/雪/虹の日のみ)", cat: "管理" },
];
function DailyTasks() {
  const [tasks, setTasks] = useState(DEFAULT_TASKS.map(t => ({ ...t, done: false })));
  const [newTask, setNewTask] = useState("");
  const toggle = (id) => setTasks(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const doneCount = tasks.filter(t => t.done).length; const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const grouped = useMemo(() => { const m = {}; tasks.forEach(t => { (m[t.cat] = m[t.cat] || []).push(t); }); return Object.entries(m); }, [tasks]);
  return (
    <Card>
      <SectionTitle emoji="📋">デイリータスク</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.border }}><div style={{ height: 8, borderRadius: 4, background: pct === 100 ? C.green : C.accent, width: `${pct}%`, transition: "width .3s" }} /></div>
        <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? C.green : C.accent, whiteSpace: "nowrap" }}>{doneCount}/{tasks.length}</span>
        <IconBtn onClick={() => setTasks(p => p.map(t => ({ ...t, done: false })))} color={C.danger}>リセット</IconBtn>
      </div>
      {grouped.map(([cat, items]) => (<div key={cat} style={{ marginBottom: 12 }}><Badge color={C.purple} bg={C.purpleSoft}>{cat}</Badge><div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map(t => (<div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: t.done ? C.greenSoft : C.bg, cursor: "pointer", border: `1px solid ${t.done ? C.green : "transparent"}` }} onClick={() => toggle(t.id)}>
          <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>{t.done ? "✅" : "⬜"}</span>
          <span style={{ flex: 1, fontSize: 13, color: C.text, textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.55 : 1 }}>{t.text}</span>
          {t.cat === "カスタム" && <button onClick={e => { e.stopPropagation(); setTasks(p => p.filter(x => x.id !== t.id)); }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}>✕</button>}
        </div>))}
      </div></div>))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Input placeholder="タスクを追加..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newTask.trim()) { setTasks(p => [...p, { id: Date.now(), text: newTask.trim(), cat: "カスタム", done: false }]); setNewTask(""); }}} />
        <IconBtn onClick={() => { if (newTask.trim()) { setTasks(p => [...p, { id: Date.now(), text: newTask.trim(), cat: "カスタム", done: false }]); setNewTask(""); }}} color={C.accent}>追加</IconBtn>
      </div>
    </Card>);
}

// ============ TAB 3: RECIPE & PROFIT ============
const RECIPES = [
  { name: "田舎サラダ", mats: ["トマト x2"], sell1: 90, src: "初期" },
  { name: "ミックスジャム", mats: ["果物 x4 (種類混合)"], sell1: 100, src: "初期" },
  { name: "ブルーベリージャム", mats: ["ブルーベリー x4"], sell1: 120, src: "派生" },
  { name: "いちごジャム", mats: ["いちご x4"], sell1: 150, src: "派生" },
  { name: "ブドウジャム", mats: ["ブドウ x4"], sell1: 200, src: "派生" },
  { name: "フィッシュアンドチップス", mats: ["魚 x2", "小麦粉 x1", "油 x1"], sell1: 180, src: "Lv2" },
  { name: "ピザ", mats: ["小麦粉 x1", "トマトソース x1", "チーズ x1", "キノコ x1"], sell1: 200, src: "Lv4" },
  { name: "キノコパイ", mats: ["キノコ x2", "小麦粉 x1", "バター x1"], sell1: 250, src: "サブストーリー" },
  { name: "トリュフパイ", mats: ["トリュフ x2", "小麦粉 x1", "バター x1"], sell1: 400, src: "派生" },
  { name: "ロールケーキ", mats: ["小麦粉 x1", "牛乳 x1", "卵 x1", "キャンディ x1"], sell1: 180, src: "ドリス商店" },
  { name: "キャンプセット", mats: ["肉 x1", "野菜 x1", "パン x1", "飲み物 x1"], sell1: 450, src: "Lv7" },
  { name: "ロブスターグリル", mats: ["北欧アカザエビ x2", "バター x1", "レモン x1"], sell1: 350, src: "Lv6" },
  { name: "ブルーロブスターグリル", mats: ["北欧ブルーアカザエビ x2", "バター x1", "レモン x1"], sell1: 500, src: "Lv8派生" },
];
function RecipeCalc() {
  const [search, setSearch] = useState(""); const [sort, setSort] = useState("sell1");
  const filtered = useMemo(() => {
    let list = RECIPES.map(r => ({ ...r, sell5: Math.round(r.sell1 * 4) }));
    if (search.trim()) { const q = search.trim().toLowerCase(); list = list.filter(r => r.name.toLowerCase().includes(q) || r.mats.some(m => m.toLowerCase().includes(q))); }
    if (sort === "sell1") list.sort((a, b) => b.sell1 - a.sell1); else if (sort === "sell5") list.sort((a, b) => b.sell5 - a.sell5); else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [search, sort]);
  return (
    <Card>
      <SectionTitle emoji="🍳">レシピ逆引き & 金策計算</SectionTitle>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>攻略Wikiの情報をもとにしたデータです。★5は★1の約3〜5倍 (目安4倍で計算)</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Input placeholder="素材名 or 料理名で検索..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
        <Select value={sort} onChange={e => setSort(e.target.value)}><option value="sell1">★1売値順</option><option value="sell5">★5売値順</option><option value="name">名前順</option></Select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((r, i) => (
          <div key={r.name} style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 12, background: i === 0 ? C.goldSoft : C.bg, border: `1px solid ${i === 0 ? C.gold : C.border}`, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 130 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>{i === 0 && <span>👑</span>}{r.name}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{r.mats.join(" / ")}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <Badge color={C.gold} bg={C.goldSoft}>★1: {r.sell1}G</Badge>
              <Badge color={C.green} bg={C.greenSoft}>★5: ~{r.sell5}G</Badge>
              <Badge color={C.textMuted} bg={C.bg}>{r.src}</Badge>
            </div>
          </div>))}
      </div>
      {filtered.length === 0 && <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, marginTop: 14 }}>該当なし</p>}
    </Card>);
}

// ============ TAB 4: COLLECTION TRACKER (REAL DATA) ============
const FISH_DATA = [
  { name: "ヨーロピアンパーチ", weather: "全天気", time: "全時間", spot: "全ての川", lv: "-", sell: 75 },
  { name: "コウライエビ", weather: "全天気", time: "全時間", spot: "全ての川", lv: "-", sell: 50 },
  { name: "シマドジョウ", weather: "全天気", time: "全時間", spot: "巨木の川", lv: "-", sell: 50 },
  { name: "バーベル", weather: "全天気", time: "全時間", spot: "浅水川", lv: "-", sell: 75 },
  { name: "ミノー", weather: "全天気", time: "全時間", spot: "静川", lv: "-", sell: 50 },
  { name: "イシドジョウ", weather: "全天気", time: "全時間", spot: "郊外の湖", lv: "2", sell: 100 },
  { name: "キュウリウオ", weather: "全天気", time: "全時間", spot: "草原の湖", lv: "2", sell: 100 },
  { name: "マッドサンフィッシュ", weather: "全天気", time: "6:00-24:00", spot: "森の湖", lv: "2", sell: 100 },
  { name: "パイクパーチ", weather: "晴虹", time: "全時間", spot: "巨木の川", lv: "3", sell: 230 },
  { name: "イガイ", weather: "雨雪虹", time: "全時間", spot: "郊外の湖", lv: "3", sell: 100 },
  { name: "オタマジャクシ", weather: "雨雪虹", time: "全時間", spot: "温泉山の湖", lv: "3", sell: 100 },
  { name: "北欧アカザエビ", weather: "全天気", time: "0:00-12:00 18:00-24:00", spot: "森の湖", lv: "3", sell: 100 },
  { name: "オオクチバス", weather: "晴虹", time: "全時間", spot: "森の湖", lv: "4", sell: 230 },
  { name: "バタフライコイ", weather: "雨雪虹", time: "全時間", spot: "草原の湖", lv: "4", sell: 320 },
  { name: "カワメンタイ", weather: "全天気", time: "12:00-24:00", spot: "静川", lv: "4", sell: 230 },
  { name: "ヨーロッパコイ", weather: "晴虹", time: "12:00-24:00", spot: "霞川", lv: "4", sell: 230 },
  { name: "マス", weather: "晴虹", time: "0:00-6:00 18:00-24:00", spot: "草原の湖", lv: "5", sell: 230 },
  { name: "カワギンボ", weather: "全天気", time: "全時間", spot: "露川", lv: "5", sell: 150 },
  { name: "シロザケ", weather: "虹", time: "全時間", spot: "静川", lv: "6", sell: 150 },
  { name: "シンジュガイ", weather: "虹", time: "全時間", spot: "森の湖", lv: "6", sell: 380 },
  { name: "カワヒメマス", weather: "全天気", time: "全時間", spot: "郊外の湖", lv: "6", sell: 230 },
  { name: "カジカ", weather: "雨雪虹", time: "6:00-24:00", spot: "温泉山の湖", lv: "7", sell: 150 },
  { name: "イトヨ", weather: "雨雪虹", time: "全時間", spot: "浅水川", lv: "7", sell: 150 },
  { name: "アプロケイルス", weather: "晴虹", time: "0:00-6:00 12:00-24:00", spot: "郊外の湖", lv: "7", sell: 150 },
  { name: "北欧ブルーアカザエビ", weather: "全天気", time: "0:00-6:00 18:00-24:00", spot: "森の湖", lv: "8", sell: 250 },
  { name: "キンギョ", weather: "雨雪虹", time: "6:00-24:00", spot: "草原の湖", lv: "8", sell: 250 },
  { name: "マッドミノー", weather: "晴虹", time: "0:00-12:00", spot: "郊外の湖", lv: "8", sell: 250 },
  { name: "ドナウイトウ", weather: "虹", time: "0:00-6:00 12:00-24:00", spot: "巨木の川", lv: "9", sell: 380 },
  { name: "パンプキンシード", weather: "晴虹", time: "6:00-24:00", spot: "温泉山の湖", lv: "9", sell: 250 },
  { name: "ノーザンパイク", weather: "雨雪虹", time: "0:00-6:00 18:00-24:00", spot: "郊外の湖", lv: "9", sell: 670 },
  { name: "ヨーロッパナマズ", weather: "晴虹", time: "0:00-6:00 18:00-24:00", spot: "草原の湖", lv: "10", sell: 610 },
  { name: "ホッキョクイワナ", weather: "雨雪虹", time: "12:00-24:00", spot: "森の湖", lv: "10", sell: 610 },
  { name: "ブルーギル", weather: "晴虹", time: "0:00-6:00 18:00-24:00", spot: "温泉山の湖", lv: "10", sell: 395 },
  { name: "ニシイワシ", weather: "全天気", time: "全時間", spot: "全ての海", lv: "-", sell: 50 },
  { name: "スズキ", weather: "全天気", time: "全時間", spot: "全ての海", lv: "-", sell: 75 },
  { name: "カツオ", weather: "全天気", time: "全時間", spot: "全ての海", lv: "-", sell: 210 },
  { name: "タチウオ", weather: "全天気", time: "全時間", spot: "そよ風の海", lv: "-", sell: 105 },
  { name: "ウミエビ", weather: "全天気", time: "全時間", spot: "東海", lv: "-", sell: 50 },
  { name: "ウミトゲウオ", weather: "全天気", time: "全時間", spot: "旧海", lv: "-", sell: 50 },
  { name: "カクレクマノミ", weather: "全天気", time: "全時間", spot: "旧海", lv: "3", sell: 100 },
  { name: "フグ", weather: "全天気", time: "12:00-24:00", spot: "旧海", lv: "6", sell: 230 },
  { name: "タブ・ガーナード", weather: "虹", time: "全時間", spot: "東海", lv: "6", sell: 380 },
  { name: "スペインダイ", weather: "雨雪虹", time: "0:00-6:00 18:00-24:00", spot: "そよ風の海", lv: "7", sell: 230 },
  { name: "ヨーロッパウナギ", weather: "虹", time: "6:00-24:00", spot: "旧海", lv: "7", sell: 380 },
  { name: "モンツキダラ", weather: "晴虹", time: "0:00-6:00 12:00-24:00", spot: "東海", lv: "8", sell: 230 },
  { name: "マンボウ", weather: "全天気", time: "0:00-12:00", spot: "東海", lv: "9", sell: 850 },
  { name: "ミナミマグロ", weather: "虹", time: "6:00-18:00", spot: "そよ風の海", lv: "9", sell: 850 },
  { name: "シュモクザメ", weather: "虹", time: "0:00-6:00 18:00-24:00", spot: "旧海", lv: "10", sell: 850 },
  { name: "メカジキ", weather: "虹", time: "6:00-18:00", spot: "クジラ海", lv: "10", sell: 850 },
  { name: "アオザメ", weather: "虹", time: "6:00-18:00", spot: "釣りクエスト", lv: "10", sell: 850 },
];
const BUG_DATA = [
  { name: "アカイトトンボ", weather: "全天気", time: "全時間", spot: "水辺", lv: "-", sell: 35 },
  { name: "アスバラカズハムシ", weather: "全天気", time: "全時間", spot: "花畑", lv: "-", sell: 55 },
  { name: "イカルスヒメシジミ", weather: "全天気", time: "全時間", spot: "中心街", lv: "2", sell: 105 },
  { name: "アオホシハナムグリ", weather: "雨雪虹", time: "全時間", spot: "ホーム", lv: "2", sell: 165 },
  { name: "ナナホシテントウ", weather: "雨雪虹", time: "全時間", spot: "郊外", lv: "2", sell: 110 },
  { name: "アカエリトリバネアゲハ", weather: "全天気", time: "0:00-6:00 18:00-24:00", spot: "ホーム", lv: "3", sell: 90 },
  { name: "アカハネムシ", weather: "全天気", time: "全時間", spot: "温泉山", lv: "3", sell: 110 },
  { name: "アリ", weather: "全天気", time: "全時間", spot: "漁村広場", lv: "3", sell: 220 },
  { name: "イリスコムラサキ", weather: "晴虹", time: "0:00-6:00 12:00-24:00", spot: "花畑/クジラ山", lv: "3", sell: 90 },
  { name: "アルキプテラフスカ", weather: "晴虹", time: "0:00-6:00 12:00-24:00", spot: "郊外", lv: "4", sell: 140 },
  { name: "ニジイロカマキリ", weather: "晴虹", time: "0:00-6:00 12:00-24:00", spot: "温泉山", lv: "4", sell: 195 },
  { name: "ツマグロヒョウモン", weather: "雨雪虹", time: "0:00-12:00 18:00-24:00", spot: "漁村桟橋", lv: "4", sell: 90 },
  { name: "タケウチトゲムネカマキリ", weather: "虹", time: "全時間", spot: "森の島", lv: "5", sell: 165 },
  { name: "ナミテントウ", weather: "雨雪虹", time: "0:00-6:00 12:00-24:00", spot: "森コジカ塔", lv: "5", sell: 165 },
  { name: "アオハダトンボ", weather: "雨雪虹", time: "全時間", spot: "森の湖", lv: "6", sell: 110 },
  { name: "ビューティースペキオーサ", weather: "雨雪虹", time: "6:00-18:00", spot: "クジラ山", lv: "7", sell: 275 },
  { name: "ロサトンボ", weather: "虹", time: "0:00-6:00 12:00-24:00", spot: "温泉山湖", lv: "7", sell: 185 },
  { name: "イザベラミズアオ", weather: "晴虹", time: "12:00-24:00", spot: "不思議な松林", lv: "8", sell: 105 },
  { name: "ピカソバグ", weather: "晴虹", time: "0:00-6:00 18:00-24:00", spot: "花畑/パープルビーチ", lv: "8", sell: 185 },
  { name: "青いクマバチ", weather: "虹", time: "0:00-6:00 12:00-24:00", spot: "漁村広場", lv: "9", sell: 440 },
  { name: "オウゴンオニクワガタ", weather: "雨雪虹", time: "0:00-6:00 18:00-24:00", spot: "不思議な松林", lv: "9", sell: 440 },
  { name: "シンジュタテハ", weather: "雨雪虹", time: "0:00-12:00", spot: "風車の花畑", lv: "9", sell: 300 },
  { name: "タイヨウモルフォ", weather: "虹", time: "6:00-18:00", spot: "森コジカ塔", lv: "10", sell: 500 },
];
const BIRD_DATA = [
  { name: "スズメ", weather: "全天気", time: "全時間", spot: "中心街", lv: "-", sell: 20 },
  { name: "エナガ", weather: "全天気", time: "全時間", spot: "中心街/郊外", lv: "-", sell: 20 },
  { name: "コマドリ", weather: "全天気", time: "全時間", spot: "郊外", lv: "2", sell: 25 },
  { name: "カワセミ", weather: "晴虹", time: "6:00-18:00", spot: "川辺", lv: "3", sell: 25 },
  { name: "オオルリ", weather: "全天気", time: "6:00-18:00", spot: "森", lv: "4", sell: 30 },
  { name: "フクロウ", weather: "全天気", time: "0:00-6:00 18:00-24:00", spot: "森", lv: "5", sell: 30 },
  { name: "ハヤブサ", weather: "雨雪虹", time: "6:00-18:00", spot: "郊外/温泉山", lv: "6", sell: 35 },
  { name: "ワシミミズク", weather: "雨雪虹", time: "0:00-6:00 18:00-24:00", spot: "森/温泉山", lv: "7", sell: 35 },
  { name: "アジサシ", weather: "虹", time: "全時間", spot: "東海", lv: "7", sell: 35 },
  { name: "ナナイロフウキンチョウ", weather: "虹", time: "全時間", spot: "郊外", lv: "9", sell: 30 },
  { name: "ロクショウヒタキ", weather: "虹", time: "全時間", spot: "森ジャンプステージ", lv: "10", sell: 30 },
];

const WEATHER_OPTS = ["全て", "全天気", "晴虹", "雨雪虹", "虹"];
const COLLECTIONS = { fish: FISH_DATA, bug: BUG_DATA, bird: BIRD_DATA };

function CollectionTracker() {
  const [tab, setTab] = useState("fish"); const [caught, setCaught] = useState({});
  const [wFilter, setWFilter] = useState("全て"); const [search, setSearch] = useState(""); const [hideOwned, setHideOwned] = useState(false);
  const toggleCaught = (cat, name) => setCaught(p => ({ ...p, [`${cat}:${name}`]: !p[`${cat}:${name}`] }));
  const items = useMemo(() => {
    let list = COLLECTIONS[tab] || [];
    if (wFilter !== "全て") list = list.filter(i => i.weather === wFilter || (wFilter === "雨雪虹" && (i.weather === "雨雪虹" || i.weather === "全天気")) || (wFilter === "晴虹" && (i.weather === "晴虹" || i.weather === "全天気")) || (wFilter === "虹" && i.weather.includes("虹")) || (wFilter === "全天気" && i.weather === "全天気"));
    if (search.trim()) { const q = search.trim().toLowerCase(); list = list.filter(i => i.name.toLowerCase().includes(q) || i.spot.toLowerCase().includes(q)); }
    if (hideOwned) list = list.filter(i => !caught[`${tab}:${i.name}`]);
    return list;
  }, [tab, wFilter, search, hideOwned, caught]);
  const total = (COLLECTIONS[tab] || []).length; const ownedCount = (COLLECTIONS[tab] || []).filter(i => caught[`${tab}:${i.name}`]).length;
  const tabLabels = { fish: "🐟 魚", bug: "🦋 虫", bird: "🐦 鳥" }; const tabColors = { fish: C.blue, bug: C.green, bird: C.purple };
  return (
    <Card>
      <SectionTitle emoji="📖">図鑑コンプトラッカー</SectionTitle>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>攻略Wiki準拠の実データ。売値は★1基準 (★5は約8倍)</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>{Object.entries(tabLabels).map(([k, l]) => <IconBtn key={k} active={tab === k} color={tabColors[k]} onClick={() => setTab(k)}>{l}</IconBtn>)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <Badge color={tabColors[tab]} bg={tab === "fish" ? C.blueSoft : tab === "bug" ? C.greenSoft : C.purpleSoft}>{ownedCount}/{total}</Badge>
        <label style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><input type="checkbox" checked={hideOwned} onChange={e => setHideOwned(e.target.checked)} /> 未取得のみ</label>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <Input placeholder="名前/場所で検索..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
        <Select value={wFilter} onChange={e => setWFilter(e.target.value)}>{WEATHER_OPTS.map(w => <option key={w} value={w}>天気: {w}</option>)}</Select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map(item => { const owned = caught[`${tab}:${item.name}`]; return (
          <div key={item.name} onClick={() => toggleCaught(tab, item.name)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: owned ? C.greenSoft : C.bg, border: `1px solid ${owned ? C.green : "transparent"}`, cursor: "pointer" }}>
            <span style={{ fontSize: 15, width: 22, textAlign: "center" }}>{owned ? "✅" : "⬜"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</span>{item.lv && item.lv !== "-" && <Badge color={C.accent} bg={C.accentSoft}>Lv{item.lv}</Badge>}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{item.spot} / {item.weather} / {item.time}{item.sell ? ` / ★1: ${item.sell}G` : ""}</div>
            </div>
          </div>); })}
        {items.length === 0 && <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, margin: "14px 0" }}>該当なし</p>}
      </div>
    </Card>);
}

// ============ TAB 5: FURNITURE ============
function FurnitureCatalog() {
  const [items, setItems] = useState([{ id: 1, name: "パステルソファ", source: "家具屋", cost: 3200, owned: false, memo: "" }, { id: 2, name: "星のランプ", source: "ガチャ", cost: 0, owned: false, memo: "欲しい!" }, { id: 3, name: "レンガの壁", source: "建材屋", cost: 800, owned: true, memo: "2F外壁用" }]);
  const [newName, setNewName] = useState(""); const [newSource, setNewSource] = useState(""); const [newCost, setNewCost] = useState("");
  const [layoutMemo, setLayoutMemo] = useState("1F: リビング+キッチン\n2F: 寝室 (星のランプをベッドサイドに)\n庭: ガーデンエリア");
  const totalCost = items.filter(i => !i.owned && i.cost > 0).reduce((s, i) => s + i.cost, 0);
  return (
    <Card>
      <SectionTitle emoji="🏠">家具カタログ & レイアウトメモ</SectionTitle>
      <div style={{ marginBottom: 12 }}><Badge color={C.pink} bg={C.pinkSoft}>未入手分の必要コイン: {totalCost.toLocaleString()}G</Badge></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {items.map(item => (
          <div key={item.id} style={{ padding: "10px 12px", borderRadius: 10, background: item.owned ? C.greenSoft : C.bg, border: `1px solid ${item.owned ? C.green : C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span onClick={() => setItems(p => p.map(i => i.id === item.id ? { ...i, owned: !i.owned } : i))} style={{ cursor: "pointer", fontSize: 15 }}>{item.owned ? "✅" : "⬜"}</span>
              <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{item.name}</span><Badge>{item.source}</Badge>
              {item.cost > 0 && <Badge color={C.accent} bg={C.accentSoft}>{item.cost}G</Badge>}
              <button onClick={() => setItems(p => p.filter(i => i.id !== item.id))} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}>✕</button>
            </div>
            <input value={item.memo} onChange={e => { const v = e.target.value; setItems(p => p.map(i => i.id === item.id ? { ...i, memo: v } : i)); }} placeholder="メモ..." style={{ marginTop: 6, width: "100%", border: "none", background: "transparent", fontSize: 12, color: C.textMuted, outline: "none", boxSizing: "border-box" }} />
          </div>))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <Input placeholder="家具名" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, minWidth: 100 }} />
        <Input placeholder="入手方法" value={newSource} onChange={e => setNewSource(e.target.value)} style={{ flex: 1, minWidth: 80 }} />
        <Input placeholder="コイン" type="number" value={newCost} onChange={e => setNewCost(e.target.value)} style={{ width: 70, flex: "none" }} />
        <IconBtn onClick={() => { if (newName.trim()) { setItems(p => [...p, { id: Date.now(), name: newName.trim(), source: newSource.trim() || "未定", cost: parseInt(newCost) || 0, owned: false, memo: "" }]); setNewName(""); setNewSource(""); setNewCost(""); }}} color={C.pink}>追加</IconBtn>
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>📐 レイアウトメモ</div>
        <textarea value={layoutMemo} onChange={e => setLayoutMemo(e.target.value)} rows={4} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 10, fontSize: 12, color: C.text, background: C.bg, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
      </div>
    </Card>);
}

// ============ TAB 6: GACHA COUNTER ============
function GachaCounter() {
  const [banners, setBanners] = useState([{ id: 1, name: "マイリトルポニー コラボ", pulls: 0, pity: 80, stonesPerPull: 160, stonesOwned: 4800 }, { id: 2, name: "バターベア コラボ", pulls: 0, pity: 80, stonesPerPull: 160, stonesOwned: 0 }]);
  const [newBanner, setNewBanner] = useState("");
  const upd = (id, f, v) => setBanners(p => p.map(b => b.id === id ? { ...b, [f]: v } : b));
  return (
    <Card>
      <SectionTitle emoji="🎰">ガチャ天井カウンター</SectionTitle>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>天井到達前に未入手アイテムが出ると天井リセットされるため、慎重に計画しましょう</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {banners.map(b => { const rem = Math.max(0, b.pity - b.pulls); const need = rem * b.stonesPerPull; const ok = b.stonesOwned >= need; const pct = b.pity > 0 ? Math.min(100, Math.round((b.pulls / b.pity) * 100)) : 0; return (
          <div key={b.id} style={{ padding: 14, borderRadius: 14, background: C.bg, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{b.name}</span><button onClick={() => setBanners(p => p.filter(x => x.id !== b.id))} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}>✕</button></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 100 }}><div style={{ fontSize: 11, color: C.textMuted }}>現在</div><div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <button onClick={() => upd(b.id, "pulls", Math.max(0, b.pulls - 1))} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, cursor: "pointer" }}>-</button>
                <span style={{ fontSize: 20, fontWeight: 800, color: C.accent, minWidth: 40, textAlign: "center" }}>{b.pulls}</span>
                <button onClick={() => upd(b.id, "pulls", b.pulls + 1)} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, cursor: "pointer" }}>+</button>
                <button onClick={() => upd(b.id, "pulls", b.pulls + 10)} style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, cursor: "pointer", fontSize: 11, padding: "4px 8px" }}>+10</button>
              </div></div>
              <div><div style={{ fontSize: 11, color: C.textMuted }}>天井</div><Input type="number" value={b.pity} onChange={e => upd(b.id, "pity", parseInt(e.target.value) || 0)} style={{ width: 60, marginTop: 2 }} /></div>
              <div><div style={{ fontSize: 11, color: C.textMuted }}>1回石数</div><Input type="number" value={b.stonesPerPull} onChange={e => upd(b.id, "stonesPerPull", parseInt(e.target.value) || 0)} style={{ width: 60, marginTop: 2 }} /></div>
              <div><div style={{ fontSize: 11, color: C.textMuted }}>手持ち石</div><Input type="number" value={b.stonesOwned} onChange={e => upd(b.id, "stonesOwned", parseInt(e.target.value) || 0)} style={{ width: 80, marginTop: 2 }} /></div>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: C.border, marginBottom: 8 }}><div style={{ height: 8, borderRadius: 4, background: pct >= 100 ? C.danger : C.accent, width: `${pct}%`, transition: "width .3s" }} /></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge color={C.accent} bg={C.accentSoft}>あと {rem}連</Badge>
              <Badge color={C.purple} bg={C.purpleSoft}>必要石 {need.toLocaleString()}</Badge>
              <Badge color={ok ? C.green : C.danger} bg={ok ? C.greenSoft : C.dangerSoft}>{ok ? "石 足りてます!" : `不足 ${(need - b.stonesOwned).toLocaleString()}`}</Badge>
            </div>
          </div>); })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Input placeholder="新しいガチャバナー名..." value={newBanner} onChange={e => setNewBanner(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newBanner.trim()) { setBanners(p => [...p, { id: Date.now(), name: newBanner.trim(), pulls: 0, pity: 80, stonesPerPull: 160, stonesOwned: 0 }]); setNewBanner(""); }}} />
        <IconBtn onClick={() => { if (newBanner.trim()) { setBanners(p => [...p, { id: Date.now(), name: newBanner.trim(), pulls: 0, pity: 80, stonesPerPull: 160, stonesOwned: 0 }]); setNewBanner(""); }}} color={C.accent}>追加</IconBtn>
      </div>
    </Card>);
}

// ============ MAIN APP ============
const TABS = [
  { key: "crop", label: "🌱 栽培", color: C.green }, { key: "daily", label: "📋 デイリー", color: C.accent },
  { key: "recipe", label: "🍳 レシピ", color: C.pink }, { key: "collect", label: "📖 図鑑", color: C.blue },
  { key: "furniture", label: "🏠 家具", color: C.purple }, { key: "gacha", label: "🎰 ガチャ", color: C.accent },
];
export default function App() {
  const [activeTab, setActiveTab] = useState("crop");
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Helvetica Neue','Hiragino Sans','Noto Sans JP',sans-serif", color: C.text }}>
      <div style={{ background: "linear-gradient(135deg, #FDE8D0 0%, #DFF0F8 50%, #EDE4F5 100%)", padding: "20px 16px 14px", borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, textAlign: "center" }}>🏡 ハートピア ダッシュボード</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textMuted, textAlign: "center" }}>攻略Wiki準拠 — All-in-One Tool</p>
      </div>
      <div style={{ display: "flex", overflowX: "auto", gap: 2, padding: "8px 8px 0", background: C.bg, borderBottom: `1px solid ${C.border}`, WebkitOverflowScrolling: "touch" }}>
        {TABS.map(t => (<button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: "none", padding: "8px 12px", fontSize: 12, fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? t.color : C.textMuted, background: activeTab === t.key ? C.card : "transparent", border: "none", borderBottom: activeTab === t.key ? `2.5px solid ${t.color}` : "2.5px solid transparent", cursor: "pointer", whiteSpace: "nowrap", borderRadius: "8px 8px 0 0" }}>{t.label}</button>))}
      </div>
      <div style={{ padding: 12, maxWidth: 640, margin: "0 auto" }}>
        {activeTab === "crop" && <CropTimer />}
        {activeTab === "daily" && <DailyTasks />}
        {activeTab === "recipe" && <RecipeCalc />}
        {activeTab === "collect" && <CollectionTracker />}
        {activeTab === "furniture" && <FurnitureCatalog />}
        {activeTab === "gacha" && <GachaCounter />}
      </div>
      <div style={{ textAlign: "center", padding: "20px 16px", fontSize: 11, color: C.textMuted }}>ハートピアスローライフ 非公式便利ツール — 攻略Wiki/Note(tam様)等の公開情報を参考</div>
    </div>);
}
