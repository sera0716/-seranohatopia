import React, { useState, useEffect, useMemo, useRef } from "react";

// ============================================================
// ★★★ ここにあなたのJSONBin情報を入れてください ★★★
// ============================================================
const JSONBIN_BIN_ID = "6a386bcdf5f4af5e291a1ce9";
const JSONBIN_API_KEY = "$2a$10$q/q7hSIaabH6Hfem.f5iPu.arUr3yBBINi.b8S6TNGHJwFgiGZNOa";
// ============================================================

const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

const C = {
  bg: "#FFF8F0", card: "#FFFFFF", accent: "#E8A87C", accentSoft: "#FDE8D0",
  green: "#7BC67E", greenSoft: "#E3F5E1", blue: "#7EB8D4", blueSoft: "#DFF0F8",
  purple: "#B59ED8", purpleSoft: "#EDE4F5", pink: "#E89BBF", pinkSoft: "#FCE4EF",
  text: "#4A3728", textMuted: "#9B8B7D", border: "#F0E6DA", danger: "#E87C7C", dangerSoft: "#FCE4E4",
  gold: "#D4A017", goldSoft: "#FFF8E1",
  oakGreen: "#5A9E3E", oakGreenSoft: "#E8F5E0", oakGreenBorder: "#B5D8A0",
  gemBlue: "#5B9EC9", gemBlueSoft: "#E0F0FA", gemBlueBorder: "#A8D4F0",
};

function loadJSON(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } }
function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

function getGameDay(now) {
  const d = now || new Date();
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  if (jst.getUTCHours() < 6) jst.setUTCDate(jst.getUTCDate() - 1);
  return jst.toISOString().slice(0, 10);
}

const Badge = ({ children, color = C.accent, bg = C.accentSoft }) => (
  <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" }}>{children}</span>
);
const IconBtn = ({ children, onClick, active, color = C.accent, style: s }) => (
  <button onClick={onClick} style={{ background: active ? color : "transparent", color: active ? "#fff" : color, border: `1.5px solid ${color}`, borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s", ...s }}>{children}</button>
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

function playBeep(times) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = "sine"; gain.gain.value = 0.3;
      osc.start(ctx.currentTime + i * 0.3); osc.stop(ctx.currentTime + i * 0.3 + 0.15);
    }
  } catch(e) {}
}
function sendNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") { try { new Notification(title, { body }); } catch(e) {} }
}

const CROPS = [
  { name: "トマト", min: 15, lv: "1", tip: "最速レベリング用" },
  { name: "稲", min: 20, lv: "1", tip: "" },
  { name: "ジャガイモ", min: 15, lv: "1", tip: "トマトと同じ回転率" },
  { name: "小麦", min: 240, lv: "2", tip: "4時間。就寝/外出前に" },
  { name: "レタス", min: 480, lv: "3", tip: "8時間。寝る前に植えて朝収穫" },
  { name: "パイナップル", min: 30, lv: "4", tip: "30分" },
  { name: "にんじん", min: 120, lv: "5", tip: "2時間" },
  { name: "いちご", min: 360, lv: "6", tip: "6時間。ジャム金策に" },
  { name: "ブルーベリー", min: 60, lv: "1", tip: "1時間" },
  { name: "とうもろこし", min: 480, lv: "3", tip: "8時間" },
  { name: "ブドウ", min: 720, lv: "7", tip: "12時間。ジャム金策最強" },
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
  const [notifEnabled, setNotifEnabled] = useState(false);
  const notifiedRef = useRef({});
  useEffect(() => { if ("Notification" in window && Notification.permission === "granted") setNotifEnabled(true); }, []);
  const requestNotif = () => { if ("Notification" in window) Notification.requestPermission().then(p => { if (p === "granted") setNotifEnabled(true); }); };
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setTimers(prev => { prev.forEach(t => {
        const remain = t.harvestAt - Date.now(); const k1 = t.id + "_1m", kd = t.id + "_done";
        if (remain <= 60000 && remain > 0 && !notifiedRef.current[k1]) { notifiedRef.current[k1] = true; playBeep(1); sendNotification("あと1分!", t.name + " の収穫まであと1分"); }
        if (remain <= 0 && !notifiedRef.current[kd]) { notifiedRef.current[kd] = true; playBeep(2); sendNotification("収穫OK!", t.name + " が収穫できます!"); }
      }); return prev; });
    }, 1000); return () => clearInterval(id);
  }, []);
  const addTimer = () => {
    const c = CROPS.find(x => x.name === crop);
    const mins = crop === "カスタム" ? (parseFloat(customH) || 1) * 60 : c.min;
    const name = crop === "カスタム" ? (customName || "カスタム") : crop;
    setTimers(p => [...p, { id: Date.now(), name, planted: Date.now(), harvestAt: Date.now() + mins * 60000 }]);
  };
  const fmtRemain = (ms) => { if (ms <= 0) return "収穫OK!"; const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); return h > 0 ? `${h}h${m}m${s}s` : `${m}m${s}s`; };
  const fmtDuration = (min) => min >= 60 ? `${min / 60}時間` : `${min}分`;
  const fmtTime = (ts) => { const d = new Date(ts); return `${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`; };
  return (
    <Card>
      <SectionTitle emoji="🌱">栽培タイマー</SectionTitle>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>攻略Wiki準拠の実際の収穫時間</div>
      {!notifEnabled && <div style={{ marginBottom: 10 }}><IconBtn onClick={requestNotif} color={C.accent}>🔔 通知を許可する</IconBtn><span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>1分前と収穫時に通知</span></div>}
      {notifEnabled && <div style={{ fontSize: 11, color: C.green, marginBottom: 10 }}>🔔 通知ON — 1分前にピロン、収穫時にピロンピロン</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Select value={crop} onChange={e => setCrop(e.target.value)} style={{ flex: 1, minWidth: 120 }}>
          {CROPS.map(c => <option key={c.name} value={c.name}>{c.name}{c.min ? ` (${fmtDuration(c.min)})` : ""}{c.lv && c.lv !== "-" ? ` Lv${c.lv}` : ""}</option>)}
        </Select>
        {crop === "カスタム" && (<><Input placeholder="作物名" value={customName} onChange={e => setCustomName(e.target.value)} style={{ flex: 1, minWidth: 80 }} /><Input placeholder="時間(h)" type="number" value={customH} onChange={e => setCustomH(e.target.value)} style={{ width: 70, flex: "none" }} /></>)}
        <IconBtn onClick={addTimer} color={C.green}>+ 植える</IconBtn>
      </div>
      {timers.length === 0 && <p style={{ color: C.textMuted, fontSize: 13, textAlign: "center", margin: "18px 0 4px" }}>まだ作物を植えていません</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {timers.map(t => { const remain = t.harvestAt - Date.now(); const done = remain <= 0; const warn = remain > 0 && remain <= 60000; const pct = Math.min(100, Math.max(0, ((Date.now() - t.planted) / (t.harvestAt - t.planted)) * 100)); return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: done ? C.greenSoft : warn ? C.goldSoft : C.bg, border: `1px solid ${done ? C.green : warn ? C.gold : C.border}` }}>
            <span style={{ fontSize: 20 }}>{done ? "🌾" : warn ? "⏰" : "🌿"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: done ? C.green : warn ? C.gold : C.textMuted, fontWeight: done || warn ? 700 : 400 }}>{fmtRemain(remain)}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>📍 収穫予定: {fmtTime(t.harvestAt)}</div>
              {!done && <div style={{ height: 4, borderRadius: 2, background: C.border, marginTop: 4 }}><div style={{ height: 4, borderRadius: 2, background: warn ? C.gold : C.green, width: `${pct}%`, transition: "width 1s linear" }} /></div>}
            </div>
            <button onClick={() => { setTimers(p => p.filter(x => x.id !== t.id)); delete notifiedRef.current[t.id+"_1m"]; delete notifiedRef.current[t.id+"_done"]; }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>); })}
      </div>
    </Card>);
}

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
  const [tasks, setTasks] = useState(() => loadJSON("hp_tasks", DEFAULT_TASKS.map(t => ({ ...t, done: false }))));
  const [newTask, setNewTask] = useState("");
  useEffect(() => { saveJSON("hp_tasks", tasks); }, [tasks]);
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

const RECIPES = [
  { name: "田舎サラダ", mats: ["野菜 x2"], sell1: 90 },
  { name: "ミックスジャム", mats: ["果物 x4 (種類混合)"], sell1: 160 },
  { name: "トマトソース", mats: ["トマト x4"], sell1: 180 },
  { name: "ブルーベリージャム", mats: ["ブルーベリー x4"], sell1: 170 },
  { name: "ラズベリージャム", mats: ["ラズベリー x4"], sell1: 250 },
  { name: "オレンジジャム", mats: ["オレンジ x4"], sell1: 270 },
  { name: "いちごジャム", mats: ["いちご x4"], sell1: 1580 },
  { name: "ブドウジャム", mats: ["ブドウ x4"], sell1: 2020 },
  { name: "リンゴジャム", mats: ["リンゴ x4"], sell1: 270 },
  { name: "パイナップルジャム", mats: ["パイナップル x4"], sell1: 280 },
  { name: "チョコソース", mats: ["カカオ豆 x4"], sell1: 1400 },
  { name: "オリジナルロールケーキ", mats: ["卵 x1", "牛乳 x1", "虹のキャンディ x2"], sell1: 550 },
  { name: "赤いロールケーキ", mats: ["卵 x1", "牛乳 x1", "赤のキャンディ x2"], sell1: 670 },
  { name: "オレンジのロールケーキ", mats: ["卵 x1", "牛乳 x1", "オレンジ色のキャンディ x2"], sell1: 670 },
  { name: "黄色いロールケーキ", mats: ["卵 x1", "牛乳 x1", "黄色のキャンディ x2"], sell1: 670 },
  { name: "紫のロールケーキ", mats: ["卵 x1", "牛乳 x1", "紫のキャンディ x2"], sell1: 670 },
  { name: "緑のロールケーキ", mats: ["卵 x1", "牛乳 x1", "緑のキャンディ x2"], sell1: 670 },
  { name: "青いロールケーキ", mats: ["卵 x1", "牛乳 x1", "青のキャンディ x2"], sell1: 670 },
  { name: "藍色のロールケーキ", mats: ["卵 x1", "牛乳 x1", "ブルーキャンディ x2"], sell1: 670 },
  { name: "スモークサーモンベーグル", mats: ["魚 x1", "チーズ x1", "野菜 x1", "小麦 x1"], sell1: 520 },
  { name: "キノコパイ", mats: ["キノコ x2", "小麦 x1", "卵 x1"], sell1: 500 },
  { name: "ヒラタケパイ", mats: ["ヒラタケ x2", "小麦 x1", "卵 x1"], sell1: 500 },
  { name: "シイタケパイ", mats: ["シイタケ x2", "小麦 x1", "卵 x1"], sell1: 500 },
  { name: "マッシュルームパイ", mats: ["マッシュルーム x2", "小麦 x1", "卵 x1"], sell1: 500 },
  { name: "ヤマドリタケパイ", mats: ["ヤマドリタケ x2", "小麦 x1", "卵 x1"], sell1: 500 },
  { name: "トリュフパイ", mats: ["トリュフ x2", "小麦 x1", "卵 x1"], sell1: 830 },
  { name: "焼きキノコ", mats: ["キノコ x5"], sell1: 180 },
  { name: "焼きヒラタケ", mats: ["ヒラタケ x5"], sell1: 180 },
  { name: "焼きシイタケ", mats: ["シイタケ x5"], sell1: 180 },
  { name: "焼きマッシュルーム", mats: ["マッシュルーム x5"], sell1: 180 },
  { name: "焼きヤマドリダケ", mats: ["ヤマドリダケ x5"], sell1: 180 },
  { name: "コーヒー", mats: ["コーヒー豆 x2", "コーヒー豆 x2"], sell1: 290 },
  { name: "カフェラテ", mats: ["コーヒー豆 x2", "牛乳 x2"], sell1: 300 },
  { name: "シーフードリゾット", mats: ["海鮮 x1", "小麦 x1", "トマト x1"], sell1: 490 },
  { name: "チーズケーキ", mats: ["チーズ x1", "牛乳 x1", "小麦 x1"], sell1: 480 },
  { name: "カントリー風煮込み", mats: ["トマト x1", "じゃがいも x1", "レタス x1"], sell1: 640 },
  { name: "トリュフのクリームパスタ", mats: ["トリュフ x1", "小麦 x2", "牛乳 x1"], sell1: 900 },
  { name: "温泉卵", mats: ["無菌卵 x1"], sell1: 130 },
  { name: "フィッシュアンドチップス", mats: ["魚 x2", "ジャガイモ x2"], sell1: 310 },
  { name: "シェイク", mats: ["牛乳 x2", "牛乳 x2"], sell1: 400 },
  { name: "抹茶シェイク", mats: ["牛乳 x2", "抹茶パウダー x2"], sell1: 840 },
  { name: "ブルーベリーシェイク", mats: ["牛乳 x2", "ブルーベリー x2"], sell1: 400 },
  { name: "ラズベリーシェイク", mats: ["牛乳 x2", "ラズベリー x2"], sell1: 440 },
  { name: "リンゴシェイク", mats: ["牛乳 x2", "リンゴ x2"], sell1: 450 },
  { name: "オレンジシェイク", mats: ["牛乳 x2", "オレンジ x2"], sell1: 450 },
  { name: "パイナップルシェイク", mats: ["牛乳 x2", "パイナップル x2"], sell1: 440 },
  { name: "いちごシェイク", mats: ["牛乳 x2", "いちご x2"], sell1: 1090 },
  { name: "ブドウシェイク", mats: ["牛乳 x2", "ブドウ x2"], sell1: 1300 },
  { name: "濃厚ミルクティー", mats: ["紅茶 x2", "牛乳 x2"], sell1: 2840 },
  { name: "ココアシェイク", mats: ["牛乳 x2", "カカオ豆 x2"], sell1: 1120 },
  { name: "抹茶ミルクティー", mats: ["茶葉 x2", "牛乳 x1", "抹茶パウダー x1"], sell1: 700 },
  { name: "ヒナギクハーブティー", mats: ["茶葉 x2", "白いヒナギク x2"], sell1: 600 },
  { name: "ローズティー", mats: ["茶葉 x2", "赤いバラ x1"], sell1: 1930 },
  { name: "アフタヌーンティー", mats: ["チーズケーキ x2", "香る紅茶 x2"], sell1: 2970 },
  { name: "エビのアボガドカップ詰め", mats: ["アガサエビ系 x2", "アボガド x2"], sell1: 1560 },
  { name: "チーズカニ爪フライ", mats: ["タラバガニ系 x2", "アガサエビ系 x2"], sell1: 1440 },
  { name: "アップルパイ", mats: ["リンゴ x1", "小麦 x1", "卵 x1", "バター x1"], sell1: 730 },
  { name: "キャンドルディナー", mats: ["田園サラダ x1", "スモークサーモンベーグル x1", "シーフードリゾット x1", "ティラミス x1"], sell1: 1760 },
  { name: "英国式アフタヌーンティー", mats: ["ティラミス x1", "ジャム材料 x1"], sell1: 710 },
  { name: "ミートバーガー", mats: ["小麦 x1", "レタス x1", "肉 x1", "トマトソース x1"], sell1: 1350 },
  { name: "キャンプセット", mats: ["コーヒー素材 x1", "シーフードピザ x1", "アップルパイ x1", "フィッシュアンドチップス x1"], sell1: 2260 },
  { name: "ティラミス", mats: ["コーヒー豆 x1", "卵 x1", "牛乳 x1", "チーズ x1"], sell1: 530 },
  { name: "豪華海鮮盛り合わせ", mats: ["北欧アカザエビ x2", "魚 x2"], sell1: 410 },
  { name: "コーンポタージュ", mats: ["牛乳 x1", "バター x1", "トウモロコシ x2"], sell1: 1340 },
  { name: "ニンジンケーキ", mats: ["卵 x1", "小麦 x1", "ニンジン x3"], sell1: 840 },
  { name: "ココアミルクティー", mats: ["紅茶 x2", "牛乳 x1", "カカオ豆 x1"], sell1: 1120 },
  { name: "ミートソースパスタ", mats: ["肉 x1", "小麦 x1", "トマト x1", "チーズ x1"], sell1: 670 },
  { name: "シーフードピザ", mats: ["チーズ x1", "トマトソース x1", "小麦 x1", "魚 x1"], sell1: 780 },
  { name: "アカザエビの前菜", mats: ["アガサエビ x3", "レタス x1"], sell1: 850 },
  { name: "蒸しタラバガニ", mats: ["タラバガニ x3", "バター x1"], sell1: 1990 },
  { name: "北欧ブルーアカザエビの前菜", mats: ["北欧ブルーアガサエビ x3", "レタス x1"], sell1: 1310 },
  { name: "蒸し黄金タラバガニ", mats: ["黄金タラバガニ x3", "バター x1"], sell1: 2980 },
  { name: "香る紅茶", mats: ["紅茶 x2", "牛乳 x2"], sell1: 840 },
  { name: "ナスのひき肉の炒め物", mats: ["ナス x1", "肉 x1", "料理油 x1", "トマトソース x1"], sell1: 1230 },
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
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>★5は★1の約3〜5倍 (目安4倍で計算)</div>
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
            </div>
          </div>))}
      </div>
      {filtered.length === 0 && <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, marginTop: 14 }}>該当なし</p>}
    </Card>);
}

const FISH_DATA=[{name:"ヨーロピアンパーチ",weather:"全天気",time:"全時間",spot:"全ての川",lv:"-",sell:75},{name:"コウライエビ",weather:"全天気",time:"全時間",spot:"全ての川",lv:"-",sell:50},{name:"シマドジョウ",weather:"全天気",time:"全時間",spot:"巨木の川",lv:"-",sell:50},{name:"バーベル",weather:"全天気",time:"全時間",spot:"浅水川",lv:"-",sell:75},{name:"ミノー",weather:"全天気",time:"全時間",spot:"静川",lv:"-",sell:50},{name:"イシドジョウ",weather:"全天気",time:"全時間",spot:"郊外の湖",lv:"2",sell:100},{name:"キュウリウオ",weather:"全天気",time:"全時間",spot:"草原の湖",lv:"2",sell:100},{name:"マッドサンフィッシュ",weather:"全天気",time:"6:00-24:00",spot:"森の湖",lv:"2",sell:100},{name:"パイクパーチ",weather:"晴虹",time:"全時間",spot:"巨木の川",lv:"3",sell:230},{name:"イガイ",weather:"雨雪虹",time:"全時間",spot:"郊外の湖",lv:"3",sell:100},{name:"オタマジャクシ",weather:"雨雪虹",time:"全時間",spot:"温泉山の湖",lv:"3",sell:100},{name:"北欧アカザエビ",weather:"全天気",time:"0:00-12:00 18:00-24:00",spot:"森の湖",lv:"3",sell:100},{name:"オオクチバス",weather:"晴虹",time:"全時間",spot:"森の湖",lv:"4",sell:230},{name:"バタフライコイ",weather:"雨雪虹",time:"全時間",spot:"草原の湖",lv:"4",sell:320},{name:"カワメンタイ",weather:"全天気",time:"12:00-24:00",spot:"静川",lv:"4",sell:230},{name:"ヨーロッパコイ",weather:"晴虹",time:"12:00-24:00",spot:"霞川",lv:"4",sell:230},{name:"マス",weather:"晴虹",time:"0:00-6:00 18:00-24:00",spot:"草原の湖",lv:"5",sell:230},{name:"カワギンボ",weather:"全天気",time:"全時間",spot:"露川",lv:"5",sell:150},{name:"シロザケ",weather:"虹",time:"全時間",spot:"静川",lv:"6",sell:150},{name:"シンジュガイ",weather:"虹",time:"全時間",spot:"森の湖",lv:"6",sell:380},{name:"カワヒメマス",weather:"全天気",time:"全時間",spot:"郊外の湖",lv:"6",sell:230},{name:"カジカ",weather:"雨雪虹",time:"6:00-24:00",spot:"温泉山の湖",lv:"7",sell:150},{name:"イトヨ",weather:"雨雪虹",time:"全時間",spot:"浅水川",lv:"7",sell:150},{name:"アプロケイルス",weather:"晴虹",time:"0:00-6:00 12:00-24:00",spot:"郊外の湖",lv:"7",sell:150},{name:"北欧ブルーアカザエビ",weather:"全天気",time:"0:00-6:00 18:00-24:00",spot:"森の湖",lv:"8",sell:250},{name:"キンギョ",weather:"雨雪虹",time:"6:00-24:00",spot:"草原の湖",lv:"8",sell:250},{name:"マッドミノー",weather:"晴虹",time:"0:00-12:00",spot:"郊外の湖",lv:"8",sell:250},{name:"ドナウイトウ",weather:"虹",time:"0:00-6:00 12:00-24:00",spot:"巨木の川",lv:"9",sell:380},{name:"パンプキンシード",weather:"晴虹",time:"6:00-24:00",spot:"温泉山の湖",lv:"9",sell:250},{name:"ノーザンパイク",weather:"雨雪虹",time:"0:00-6:00 18:00-24:00",spot:"郊外の湖",lv:"9",sell:670},{name:"ヨーロッパナマズ",weather:"晴虹",time:"0:00-6:00 18:00-24:00",spot:"草原の湖",lv:"10",sell:610},{name:"ホッキョクイワナ",weather:"雨雪虹",time:"12:00-24:00",spot:"森の湖",lv:"10",sell:610},{name:"ブルーギル",weather:"晴虹",time:"0:00-6:00 18:00-24:00",spot:"温泉山の湖",lv:"10",sell:395},{name:"ニシイワシ",weather:"全天気",time:"全時間",spot:"全ての海",lv:"-",sell:50},{name:"スズキ",weather:"全天気",time:"全時間",spot:"全ての海",lv:"-",sell:75},{name:"カツオ",weather:"全天気",time:"全時間",spot:"全ての海",lv:"-",sell:210},{name:"タチウオ",weather:"全天気",time:"全時間",spot:"そよ風の海",lv:"-",sell:105},{name:"ウミエビ",weather:"全天気",time:"全時間",spot:"東海",lv:"-",sell:50},{name:"ウミトゲウオ",weather:"全天気",time:"全時間",spot:"旧海",lv:"-",sell:50},{name:"カクレクマノミ",weather:"全天気",time:"全時間",spot:"旧海",lv:"3",sell:100},{name:"フグ",weather:"全天気",time:"12:00-24:00",spot:"旧海",lv:"6",sell:230},{name:"タブ・ガーナード",weather:"虹",time:"全時間",spot:"東海",lv:"6",sell:380},{name:"スペインダイ",weather:"雨雪虹",time:"0:00-6:00 18:00-24:00",spot:"そよ風の海",lv:"7",sell:230},{name:"ヨーロッパウナギ",weather:"虹",time:"6:00-24:00",spot:"旧海",lv:"7",sell:380},{name:"モンツキダラ",weather:"晴虹",time:"0:00-6:00 12:00-24:00",spot:"東海",lv:"8",sell:230},{name:"マンボウ",weather:"全天気",time:"0:00-12:00",spot:"東海",lv:"9",sell:850},{name:"ミナミマグロ",weather:"虹",time:"6:00-18:00",spot:"そよ風の海",lv:"9",sell:850},{name:"シュモクザメ",weather:"虹",time:"0:00-6:00 18:00-24:00",spot:"旧海",lv:"10",sell:850},{name:"メカジキ",weather:"虹",time:"6:00-18:00",spot:"クジラ海",lv:"10",sell:850},{name:"アオザメ",weather:"虹",time:"6:00-18:00",spot:"釣りクエスト",lv:"10",sell:850}];
const BUG_DATA=[{name:"アカイトトンボ",weather:"全天気",time:"全時間",spot:"水辺",lv:"-",sell:35},{name:"アスバラカズハムシ",weather:"全天気",time:"全時間",spot:"花畑",lv:"-",sell:55},{name:"イカルスヒメシジミ",weather:"全天気",time:"全時間",spot:"中心街",lv:"2",sell:105},{name:"アオホシハナムグリ",weather:"雨雪虹",time:"全時間",spot:"ホーム",lv:"2",sell:165},{name:"ナナホシテントウ",weather:"雨雪虹",time:"全時間",spot:"郊外",lv:"2",sell:110},{name:"アカエリトリバネアゲハ",weather:"全天気",time:"0:00-6:00 18:00-24:00",spot:"ホーム",lv:"3",sell:90},{name:"アカハネムシ",weather:"全天気",time:"全時間",spot:"温泉山",lv:"3",sell:110},{name:"アリ",weather:"全天気",time:"全時間",spot:"漁村広場",lv:"3",sell:220},{name:"イリスコムラサキ",weather:"晴虹",time:"0:00-6:00 12:00-24:00",spot:"花畑/クジラ山",lv:"3",sell:90},{name:"アルキプテラフスカ",weather:"晴虹",time:"0:00-6:00 12:00-24:00",spot:"郊外",lv:"4",sell:140},{name:"ニジイロカマキリ",weather:"晴虹",time:"0:00-6:00 12:00-24:00",spot:"温泉山",lv:"4",sell:195},{name:"ツマグロヒョウモン",weather:"雨雪虹",time:"0:00-12:00 18:00-24:00",spot:"漁村桟橋",lv:"4",sell:90},{name:"タケウチトゲムネカマキリ",weather:"虹",time:"全時間",spot:"森の島",lv:"5",sell:165},{name:"ナミテントウ",weather:"雨雪虹",time:"0:00-6:00 12:00-24:00",spot:"森コジカ塔",lv:"5",sell:165},{name:"アオハダトンボ",weather:"雨雪虹",time:"全時間",spot:"森の湖",lv:"6",sell:110},{name:"ビューティースペキオーサ",weather:"雨雪虹",time:"6:00-18:00",spot:"クジラ山",lv:"7",sell:275},{name:"ロサトンボ",weather:"虹",time:"0:00-6:00 12:00-24:00",spot:"温泉山湖",lv:"7",sell:185},{name:"イザベラミズアオ",weather:"晴虹",time:"12:00-24:00",spot:"不思議な松林",lv:"8",sell:105},{name:"ピカソバグ",weather:"晴虹",time:"0:00-6:00 18:00-24:00",spot:"花畑/パープルビーチ",lv:"8",sell:185},{name:"青いクマバチ",weather:"虹",time:"0:00-6:00 12:00-24:00",spot:"漁村広場",lv:"9",sell:440},{name:"オウゴンオニクワガタ",weather:"雨雪虹",time:"0:00-6:00 18:00-24:00",spot:"不思議な松林",lv:"9",sell:440},{name:"シンジュタテハ",weather:"雨雪虹",time:"0:00-12:00",spot:"風車の花畑",lv:"9",sell:300},{name:"タイヨウモルフォ",weather:"虹",time:"6:00-18:00",spot:"森コジカ塔",lv:"10",sell:500}];
const BIRD_DATA=[{name:"スズメ",weather:"全天気",time:"全時間",spot:"中心街",lv:"-",sell:20},{name:"エナガ",weather:"全天気",time:"全時間",spot:"中心街/郊外",lv:"-",sell:20},{name:"コマドリ",weather:"全天気",time:"全時間",spot:"郊外",lv:"2",sell:25},{name:"カワセミ",weather:"晴虹",time:"6:00-18:00",spot:"川辺",lv:"3",sell:25},{name:"オオルリ",weather:"全天気",time:"6:00-18:00",spot:"森",lv:"4",sell:30},{name:"フクロウ",weather:"全天気",time:"0:00-6:00 18:00-24:00",spot:"森",lv:"5",sell:30},{name:"ハヤブサ",weather:"雨雪虹",time:"6:00-18:00",spot:"郊外/温泉山",lv:"6",sell:35},{name:"ワシミミズク",weather:"雨雪虹",time:"0:00-6:00 18:00-24:00",spot:"森/温泉山",lv:"7",sell:35},{name:"アジサシ",weather:"虹",time:"全時間",spot:"東海",lv:"7",sell:35},{name:"ナナイロフウキンチョウ",weather:"虹",time:"全時間",spot:"郊外",lv:"9",sell:30},{name:"ロクショウヒタキ",weather:"虹",time:"全時間",spot:"森ジャンプステージ",lv:"10",sell:30}];
const WEATHER_OPTS=["全て","全天気","晴虹","雨雪虹","虹"];
const COLLECTIONS={fish:FISH_DATA,bug:BUG_DATA,bird:BIRD_DATA};
function CollectionTracker() {
  const [tab, setTab] = useState("fish");
  const [caught, setCaught] = useState(() => loadJSON("hp_caught", {}));
  const [wFilter, setWFilter] = useState("全て"); const [search, setSearch] = useState(""); const [hideOwned, setHideOwned] = useState(false);
  useEffect(() => { saveJSON("hp_caught", caught); }, [caught]);
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
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>攻略Wiki準拠。チェックはブラウザに自動保存</div>
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

const OAK_SPOTS = ["1番地","2番地","3番地","4番地","5番地","6番地","7番地","8番地","9番地","10番地","11番地","12番地","不思議な松林","温泉山遺跡"];
const FLUORITE_SPOTS = ["1番地","2番地","3番地","4番地","5番地","6番地","7番地","8番地","9番地","10番地","11番地","12番地","温泉山の湖"];
const OTHER_GATHER = [
  { id: "rarewood", name: "レア木材", maxDaily: 8, spot: "郊外の巨木 (8箇所)", tip: "2時間ごとに再採取可能", emoji: "🪵" },
  { id: "stone", name: "石", maxDaily: 0, spot: "各地の岩", tip: "上限なし。建築素材", emoji: "🪨" },
  { id: "ore", name: "鉱石", maxDaily: 0, spot: "各地の鉱床", tip: "上限なし", emoji: "⛏️" },
  { id: "starmeteor", name: "スターメテオの欠片", maxDaily: 0, spot: "各地", tip: "レア素材", emoji: "⭐" },
  { id: "bamboo", name: "竹", maxDaily: 0, spot: "竹林エリア", tip: "建築素材", emoji: "🎋" },
];

async function fetchBanchiData() {
  try {
    const res = await fetch(JSONBIN_URL + "/latest", { headers: { "X-Master-Key": JSONBIN_API_KEY } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.record || null;
  } catch (e) { return null; }
}
async function saveBanchiData(data) {
  try {
    const res = await fetch(JSONBIN_URL, { method: "PUT", headers: { "Content-Type": "application/json", "X-Master-Key": JSONBIN_API_KEY }, body: JSON.stringify(data) });
    return res.ok;
  } catch (e) { return false; }
}

function BanchiCard({ emoji, label, color, colorSoft, colorBorder, spots, todaySpots }) {
  const hasData = todaySpots && todaySpots.length > 0;
  return (
    <div style={{ background: colorSoft, borderRadius: 16, padding: 18, border: "2px solid " + colorBorder, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 36 }}>{emoji}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: color }}>{label}</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>毎朝6:00リセット</div>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, padding: 12, border: "1px solid " + colorBorder }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: color, marginBottom: 8 }}>今日の出現場所</div>
        {hasData ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {spots.map(spot => {
              const active = todaySpots.includes(spot);
              return (<span key={spot} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 8, fontWeight: active ? 700 : 400, background: active ? color : "#f5f5f5", color: active ? "#fff" : "#bbb", border: "1px solid " + (active ? color : "#e0e0e0") }}>{spot}</span>);
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", padding: "8px 0" }}>まだ更新されていません</div>
        )}
      </div>
    </div>
  );
}

function DailyGathering() {
  const gameDay = getGameDay();
  const [banchiData, setBanchiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("banchi");
  const [localData, setLocalData] = useState(() => {
    const saved = loadJSON("hp_gather_v5", { date: "", items: {} });
    return saved.date === gameDay ? saved : { date: gameDay, items: {} };
  });
  useEffect(() => { saveJSON("hp_gather_v5", localData); }, [localData]);
  useEffect(() => {
    fetchBanchiData().then(data => {
      if (data && data.date === gameDay) setBanchiData(data);
      setLoading(false);
    });
  }, [gameDay]);
  const toggleItem = (id) => setLocalData(p => ({ ...p, items: { ...p.items, [id]: !p.items[id] } }));
  const otherDone = OTHER_GATHER.filter(g => localData.items[g.id]).length;
  return (
    <Card style={{ padding: 14 }}>
      <SectionTitle emoji="⛏️">デイリー採集トラッカー</SectionTitle>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>毎朝6:00(JST)自動リセット — 番地情報はみんなで共有</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <IconBtn active={subTab === "banchi"} color={C.oakGreen} onClick={() => setSubTab("banchi")}>🌳💎 番地チェック</IconBtn>
        <IconBtn active={subTab === "other"} color={C.accent} onClick={() => setSubTab("other")}>⛏️ その他</IconBtn>
      </div>
      {subTab === "banchi" && (
        loading ? (
          <div style={{ textAlign: "center", padding: 20, color: C.textMuted, fontSize: 13 }}>読み込み中...</div>
        ) : (
          <>
            <BanchiCard emoji="🌳" label="ツルツルオーク" color={C.oakGreen} colorSoft={C.oakGreenSoft} colorBorder={C.oakGreenBorder} spots={OAK_SPOTS} todaySpots={banchiData ? banchiData.oak || [] : []} />
            <BanchiCard emoji="💎" label="無垢な蛍石" color={C.gemBlue} colorSoft={C.gemBlueSoft} colorBorder={C.gemBlueBorder} spots={FLUORITE_SPOTS} todaySpots={banchiData ? banchiData.fluorite || [] : []} />
          </>
        )
      )}
      {subTab === "other" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.border }}>
              <div style={{ height: 6, borderRadius: 3, background: otherDone === OTHER_GATHER.length ? C.green : C.accent, width: Math.round((otherDone / OTHER_GATHER.length) * 100) + "%", transition: "width .3s" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: otherDone === OTHER_GATHER.length ? C.green : C.accent }}>{otherDone}/{OTHER_GATHER.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {OTHER_GATHER.map(g => {
              const done = localData.items[g.id];
              return (
                <div key={g.id} onClick={() => toggleItem(g.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: done ? C.greenSoft : C.bg, border: "1px solid " + (done ? C.green : C.border), cursor: "pointer" }}>
                  <span style={{ fontSize: 18 }}>{g.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>{g.name}</span>
                      {g.maxDaily > 0 && <Badge color={C.pink} bg={C.pinkSoft}>1日{g.maxDaily}回</Badge>}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{g.spot}</div>
                  </div>
                  <span style={{ fontSize: 15 }}>{done ? "✅" : "⬜"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

function AdminPanel() {
  const gameDay = getGameDay();
  const [oak, setOak] = useState([]);
  const [fluorite, setFluorite] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetchBanchiData().then(data => {
      if (data && data.date === gameDay) { setOak(data.oak || []); setFluorite(data.fluorite || []); }
      setLoaded(true);
    });
  }, [gameDay]);
  const toggleSpot = (list, setList, spot) => { setList(prev => prev.includes(spot) ? prev.filter(s => s !== spot) : [...prev, spot]); };
  const handleSave = async () => {
    setSaving(true); setMsg("");
    const ok = await saveBanchiData({ date: gameDay, oak: oak, fluorite: fluorite });
    setSaving(false);
    setMsg(ok ? "保存しました!" : "保存失敗...もう一度試してね");
  };
  if (!loaded) return <Card><div style={{ textAlign: "center", padding: 20, color: C.textMuted }}>読み込み中...</div></Card>;
  return (
    <Card>
      <SectionTitle emoji="🔧">番地管理（管理者用）</SectionTitle>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>ゲーム日付: {gameDay}（6:00 JSTリセット）</div>
      <div style={{ fontSize: 11, color: C.accent, marginBottom: 16 }}>今日の出現番地をタップで選んで「保存」してね</div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>🌳</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.oakGreen }}>ツルツルオーク</span>
          {oak.length > 0 && <Badge color={C.oakGreen} bg={C.oakGreenSoft}>{oak.length}箇所</Badge>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {OAK_SPOTS.map(spot => {
            const active = oak.includes(spot);
            return (<button key={spot} onClick={() => toggleSpot(oak, setOak, spot)} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 8, fontWeight: active ? 700 : 400, background: active ? C.oakGreen : "#fff", color: active ? "#fff" : C.text, border: "1.5px solid " + (active ? C.oakGreen : C.border), cursor: "pointer", transition: "all .12s" }}>{spot}</button>);
          })}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>💎</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.gemBlue }}>無垢な蛍石</span>
          {fluorite.length > 0 && <Badge color={C.gemBlue} bg={C.gemBlueSoft}>{fluorite.length}箇所</Badge>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {FLUORITE_SPOTS.map(spot => {
            const active = fluorite.includes(spot);
            return (<button key={spot} onClick={() => toggleSpot(fluorite, setFluorite, spot)} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 8, fontWeight: active ? 700 : 400, background: active ? C.gemBlue : "#fff", color: active ? "#fff" : C.text, border: "1.5px solid " + (active ? C.gemBlue : C.border), cursor: "pointer", transition: "all .12s" }}>{spot}</button>);
          })}
        </div>
      </div>
      <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: saving ? C.textMuted : "linear-gradient(135deg, " + C.oakGreen + ", " + C.gemBlue + ")", color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: saving ? "default" : "pointer", transition: "all .15s" }}>
        {saving ? "保存中..." : "保存する"}
      </button>
      {msg && <div style={{ marginTop: 10, textAlign: "center", fontSize: 13, fontWeight: 600, color: msg.includes("しました") ? C.green : C.danger }}>{msg}</div>}
    </Card>
  );
}

function CompactOverlay() {
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);
  const tasks = loadJSON("hp_tasks", DEFAULT_TASKS.map(t => ({...t, done: false})));
  const caught = loadJSON("hp_caught", {});
  const doneCount = tasks.filter(t => t.done).length;
  const taskPct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const fishOwned = FISH_DATA.filter(i => caught["fish:" + i.name]).length;
  const bugOwned = BUG_DATA.filter(i => caught["bug:" + i.name]).length;
  const birdOwned = BIRD_DATA.filter(i => caught["bird:" + i.name]).length;
  return (
    <div style={{ background: "rgba(255,248,240,0.92)", borderRadius: 16, padding: 16, maxWidth: 320, fontFamily: "'Helvetica Neue','Hiragino Sans',sans-serif", color: C.text, border: "1px solid " + C.border, backdropFilter: "blur(8px)" }}>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10, textAlign: "center" }}>🏡 ハートピア LIVE</div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>📋 今日の進捗</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.border }}><div style={{ height: 6, borderRadius: 3, background: taskPct === 100 ? C.green : C.accent, width: taskPct + "%" }} /></div>
          <span style={{ fontSize: 12, fontWeight: 700, color: taskPct === 100 ? C.green : C.accent }}>{doneCount}/{tasks.length}</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>📖 図鑑コンプ率</div>
        <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
          <span>🐟 {fishOwned}/{FISH_DATA.length}</span>
          <span>🦋 {bugOwned}/{BUG_DATA.length}</span>
          <span>🐦 {birdOwned}/{BIRD_DATA.length}</span>
        </div>
      </div>
    </div>);
}

const TABS = [
  { key: "crop", label: "🌱 栽培", color: C.green },
  { key: "daily", label: "📋 デイリー", color: C.accent },
  { key: "gather", label: "⛏️ 採集", color: C.gold },
  { key: "recipe", label: "🍳 レシピ", color: C.pink },
  { key: "collect", label: "📖 図鑑", color: C.blue },
  { key: "overlay", label: "🎬 配信", color: C.purple },
];

const ADMIN_PASSWORD = "黄色い謎の子";

export default function App() {
  const [activeTab, setActiveTab] = useState("crop");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPwDialog, setShowPwDialog] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  const handlePwSubmit = () => {
    if (pwInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowPwDialog(false);
      setPwInput("");
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Helvetica Neue','Hiragino Sans','Noto Sans JP',sans-serif", color: C.text }}>
      <div style={{ background: "linear-gradient(135deg, #FDE8D0 0%, #DFF0F8 50%, #EDE4F5 100%)", padding: "20px 16px 14px", borderBottom: "1px solid " + C.border, position: "relative" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, textAlign: "center" }}>🏡 ハートピア ダッシュボード</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textMuted, textAlign: "center" }}>攻略Wiki準拠 — All-in-One Tool</p>
        <button onClick={() => { if (isAdmin) { setIsAdmin(false); } else { setShowPwDialog(true); setPwInput(""); setPwError(false); } }} style={{ position: "absolute", right: 12, top: 18, background: isAdmin ? C.accent : "rgba(0,0,0,0.08)", border: "none", borderRadius: 8, padding: "4px 8px", fontSize: 14, cursor: "pointer", color: isAdmin ? "#fff" : C.textMuted }}>🔧</button>
      </div>

      {showPwDialog && !isAdmin && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: C.card, borderRadius: 16, padding: 24, width: 280, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12, textAlign: "center" }}>🔧 管理者パスワード</div>
            <Input placeholder="パスワードを入力" type="password" value={pwInput} onChange={e => { setPwInput(e.target.value); setPwError(false); }} onKeyDown={e => { if (e.key === "Enter") handlePwSubmit(); }} style={{ marginBottom: 8 }} />
            {pwError && <div style={{ fontSize: 11, color: C.danger, marginBottom: 8, textAlign: "center" }}>パスワードが違います</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <IconBtn onClick={() => setShowPwDialog(false)} color={C.textMuted} style={{ flex: 1 }}>キャンセル</IconBtn>
              <IconBtn onClick={handlePwSubmit} color={C.oakGreen} style={{ flex: 1 }}>ログイン</IconBtn>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div style={{ padding: 12, maxWidth: 640, margin: "0 auto" }}>
          <AdminPanel />
        </div>
      )}
      {!isAdmin && (
        <>
          <div style={{ display: "flex", overflowX: "auto", gap: 2, padding: "8px 8px 0", background: C.bg, borderBottom: "1px solid " + C.border, WebkitOverflowScrolling: "touch" }}>
            {TABS.map(t => (<button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: "none", padding: "8px 12px", fontSize: 12, fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? t.color : C.textMuted, background: activeTab === t.key ? C.card : "transparent", border: "none", borderBottom: activeTab === t.key ? "2.5px solid " + t.color : "2.5px solid transparent", cursor: "pointer", whiteSpace: "nowrap", borderRadius: "8px 8px 0 0" }}>{t.label}</button>))}
          </div>
          <div style={{ padding: 12, maxWidth: 640, margin: "0 auto" }}>
            <div style={{ display: activeTab === "crop" ? "block" : "none" }}><CropTimer /></div>
            <div style={{ display: activeTab === "daily" ? "block" : "none" }}><DailyTasks /></div>
            <div style={{ display: activeTab === "gather" ? "block" : "none" }}><DailyGathering /></div>
            <div style={{ display: activeTab === "recipe" ? "block" : "none" }}><RecipeCalc /></div>
            <div style={{ display: activeTab === "collect" ? "block" : "none" }}><CollectionTracker /></div>
            <div style={{ display: activeTab === "overlay" ? "block" : "none" }}>
              <Card>
                <SectionTitle emoji="🎬">配信者コンパクトモード</SectionTitle>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>OBSのブラウザソースにURLを入れると配信画面に重ねて使えます</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>プレビュー:</div>
                <CompactOverlay />
              </Card>
            </div>
          </div>
        </>
      )}
      <div style={{ textAlign: "center", padding: "20px 16px", fontSize: 11, color: C.textMuted }}>ハートピアスローライフ 非公式便利ツール v5</div>
    </div>
  );
}
