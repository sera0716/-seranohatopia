import React, { useState, useEffect, useMemo, useRef } from "react";

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

// ===== オーク・蛍石 50日周期 =====
// 番地は数字、"matsu"=不思議な松林、"lake"=温泉山の湖、"iseki"=温泉山遺跡
const OAK_CYCLE = [8,6,8,12,10,7,12,8,6,11,2,9,4,7,2,11,"matsu","matsu",11,9,10,3,6,9,4,10,"matsu",7,4,6,3,12,4,12,"matsu",2,7,10,5,10,8,7,7,"matsu",3,5,12,7,8,4];
const FLU_CYCLE = ["lake",8,8,6,2,2,"lake",5,11,4,2,4,2,11,7,9,4,4,7,5,7,7,7,1,5,9,11,5,8,4,1,12,11,"lake",8,5,7,11,"lake",8,8,2,2,2,1,1,4,8,8,1];
// 基準日: この実日付(ゲーム日)が周期の何日目か (1始まり)
const CYCLE_ANCHOR_DATE = getGameDay();
const CYCLE_ANCHOR_DAY = 22; // 今日=22日目

function spotLabel(v, isOak) {
  if (v === "matsu") return "不思議な松林";
  if (v === "lake") return "温泉山の湖";
  if (v === "iseki") return "温泉山遺跡";
  return v + "番地";
}

function getTodayCycleIndex(gameDay) {
  // gameDay と CYCLE_ANCHOR_DATE の日数差を計算
  const a = new Date(CYCLE_ANCHOR_DATE + "T00:00:00Z").getTime();
  const b = new Date(gameDay + "T00:00:00Z").getTime();
  const diffDays = Math.round((b - a) / 86400000);
  let idx = (CYCLE_ANCHOR_DAY - 1 + diffDays) % 50;
  if (idx < 0) idx += 50;
  return idx;
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

let currentAlarmAudio = null;
function stopAlarm() {
  if (currentAlarmAudio) { try { currentAlarmAudio.pause(); currentAlarmAudio.currentTime = 0; } catch(e) {} currentAlarmAudio = null; }
}
function playBeep(times, customUrl) {
  if (customUrl) {
    try { stopAlarm(); const a = new Audio(customUrl); currentAlarmAudio = a; a.play(); return; } catch(e) {}
  }
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

// ============ TAB 1: CROP & GATHER TIMER ============
const CROPS = [
  { name: "トマト", min: 15, lv: "1", tip: "最速レベリング用", cat: "栽培" },
  { name: "稲", min: 20, lv: "1", tip: "", cat: "栽培" },
  { name: "ジャガイモ", min: 15, lv: "1", tip: "トマトと同じ回転率", cat: "栽培" },
  { name: "小麦", min: 240, lv: "2", tip: "4時間。就寝/外出前に", cat: "栽培" },
  { name: "レタス", min: 480, lv: "3", tip: "8時間。寝る前に植えて朝収穫", cat: "栽培" },
  { name: "パイナップル", min: 30, lv: "4", tip: "30分", cat: "栽培" },
  { name: "にんじん", min: 120, lv: "5", tip: "2時間", cat: "栽培" },
  { name: "いちご", min: 360, lv: "6", tip: "6時間。ジャム金策に", cat: "栽培" },
  { name: "ブルーベリー", min: 60, lv: "1", tip: "1時間", cat: "栽培" },
  { name: "とうもろこし", min: 480, lv: "3", tip: "8時間", cat: "栽培" },
  { name: "ブドウ", min: 720, lv: "7", tip: "12時間。ジャム金策最強", cat: "栽培" },
  { name: "ナス", min: 720, lv: "8", tip: "12時間", cat: "栽培" },
  { name: "茶葉", min: 720, lv: "11", tip: "12時間", cat: "栽培" },
  { name: "カカオ豆", min: 720, lv: "12", tip: "12時間", cat: "栽培" },
  { name: "アボカド", min: 720, lv: "13", tip: "12時間", cat: "栽培" },
  { name: "トリュフ(再出現)", min: 16, lv: "-", tip: "約16分で復活。森の島", cat: "採集" },
  { name: "巨木レア木材(再出現)", min: 120, lv: "-", tip: "2時間で復活。郊外の巨木", cat: "採集" },
  { name: "カスタム", min: 0, lv: "-", tip: "", cat: "その他" },
];
function CropTimer({ alarmUrl, timers, setTimers }) {
  const [crop, setCrop] = useState(CROPS[0].name);
  const [customH, setCustomH] = useState(""); const [customName, setCustomName] = useState("");
  const [, setTick] = useState(0);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const notifiedRef = useRef({});
  const alarmRef = useRef(alarmUrl);
  useEffect(() => { alarmRef.current = alarmUrl; }, [alarmUrl]);
  useEffect(() => { saveJSON("hp_timers", timers); }, [timers]);
  useEffect(() => { if ("Notification" in window && Notification.permission === "granted") setNotifEnabled(true); }, []);
  const requestNotif = () => { if ("Notification" in window) Notification.requestPermission().then(p => { if (p === "granted") setNotifEnabled(true); }); };
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setTimers(prev => { prev.forEach(t => {
        const remain = t.harvestAt - Date.now(); const k1 = t.id + "_1m", kd = t.id + "_done";
        if (remain <= 60000 && remain > 0 && !notifiedRef.current[k1]) { notifiedRef.current[k1] = true; playBeep(1); sendNotification("あと1分!", t.name + " まであと1分"); }
        if (remain <= 0 && !notifiedRef.current[kd]) { notifiedRef.current[kd] = true; playBeep(2, alarmRef.current); sendNotification("収穫OK!", t.name + " が収穫できます!"); }
      }); return prev; });
    }, 1000); return () => clearInterval(id);
  }, [setTimers]);
  const addTimer = () => {
    const c = CROPS.find(x => x.name === crop);
    const mins = crop === "カスタム" ? (parseFloat(customH) || 1) : c.min;
    const name = crop === "カスタム" ? (customName || "カスタム") : crop;
    setTimers(p => [...p, { id: Date.now(), name, planted: Date.now(), harvestAt: Date.now() + mins * 60000 }]);
  };
  const fmtRemain = (ms) => { if (ms <= 0) return "収穫OK!"; const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); return h > 0 ? `${h}h${m}m${s}s` : `${m}m${s}s`; };
  const fmtDuration = (min) => min >= 60 ? `${min / 60}時間` : `${min}分`;
  const fmtTime = (ts) => { const d = new Date(ts); return `${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`; };
  return (
    <Card>
      <SectionTitle emoji="🌱">栽培・採集タイマー</SectionTitle>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>攻略Wiki準拠。トリュフ(13分)・巨木(2時間)の再出現も</div>
      {!notifEnabled && <div style={{ marginBottom: 10 }}><IconBtn onClick={requestNotif} color={C.accent}>🔔 通知を許可する</IconBtn><span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>1分前と収穫時に通知</span></div>}
      {notifEnabled && <div style={{ fontSize: 11, color: C.green, marginBottom: 10 }}>🔔 通知ON{alarmUrl ? "（カスタム音）" : ""}</div>}
      <div style={{ marginBottom: 12 }}><IconBtn onClick={stopAlarm} color={C.danger}>🔇 アラームを止める</IconBtn></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Select value={crop} onChange={e => setCrop(e.target.value)} style={{ flex: 1, minWidth: 120 }}>
          {CROPS.map(c => <option key={c.name} value={c.name}>{c.name}{c.min ? ` (${fmtDuration(c.min)})` : ""}{c.lv && c.lv !== "-" ? ` Lv${c.lv}` : ""}</option>)}
        </Select>
        {crop === "カスタム" && (<><Input placeholder="名前" value={customName} onChange={e => setCustomName(e.target.value)} style={{ flex: 1, minWidth: 80 }} /><Input placeholder="分" type="number" value={customH} onChange={e => setCustomH(e.target.value)} style={{ width: 70, flex: "none" }} /></>)}
        <IconBtn onClick={addTimer} color={C.green}>+ セット</IconBtn>
      </div>
      {timers.length === 0 && <p style={{ color: C.textMuted, fontSize: 13, textAlign: "center", margin: "18px 0 4px" }}>まだタイマーがありません</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {timers.map(t => { const remain = t.harvestAt - Date.now(); const done = remain <= 0; const warn = remain > 0 && remain <= 60000; const pct = Math.min(100, Math.max(0, ((Date.now() - t.planted) / (t.harvestAt - t.planted)) * 100)); return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: done ? C.greenSoft : warn ? C.goldSoft : C.bg, border: `1px solid ${done ? C.green : warn ? C.gold : C.border}` }}>
            <span style={{ fontSize: 20 }}>{done ? "🌾" : warn ? "⏰" : "🌿"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: done ? C.green : warn ? C.gold : C.textMuted, fontWeight: done || warn ? 700 : 400 }}>{fmtRemain(remain)}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>📍 完了予定: {fmtTime(t.harvestAt)}</div>
              {!done && <div style={{ height: 4, borderRadius: 2, background: C.border, marginTop: 4 }}><div style={{ height: 4, borderRadius: 2, background: warn ? C.gold : C.green, width: `${pct}%`, transition: "width 1s linear" }} /></div>}
            </div>
            <button onClick={() => { setTimers(p => p.filter(x => x.id !== t.id)); delete notifiedRef.current[t.id+"_1m"]; delete notifiedRef.current[t.id+"_done"]; }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
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

// ============ TAB 3: RECIPE (★倍率 正確版) ============
// ★1基準: ★2=1.5倍, ★3=2倍, ★4=4倍, ★5=8倍
const STAR_MULT = { 1: 1, 2: 1.5, 3: 2, 4: 4, 5: 8 };
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
  const [search, setSearch] = useState(""); const [sort, setSort] = useState("sell5");
  const filtered = useMemo(() => {
    let list = RECIPES.map(r => ({ ...r, sell5: Math.round(r.sell1 * STAR_MULT[5]) }));
    if (search.trim()) { const q = search.trim().toLowerCase(); list = list.filter(r => r.name.toLowerCase().includes(q) || r.mats.some(m => m.toLowerCase().includes(q))); }
    if (sort === "sell1") list.sort((a, b) => b.sell1 - a.sell1); else if (sort === "sell5") list.sort((a, b) => b.sell5 - a.sell5); else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [search, sort]);
  return (
    <Card>
      <SectionTitle emoji="🍳">レシピ逆引き & 金策計算</SectionTitle>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>★倍率(★1基準): ★2=1.5倍 / ★3=2倍 / ★4=4倍 / ★5=8倍</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Input placeholder="素材名 or 料理名で検索..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
        <Select value={sort} onChange={e => setSort(e.target.value)}><option value="sell5">★5売値順</option><option value="sell1">★1売値順</option><option value="name">名前順</option></Select>
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
              <Badge color={C.green} bg={C.greenSoft}>★5: {r.sell5}G</Badge>
            </div>
          </div>))}
      </div>
      {filtered.length === 0 && <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, marginTop: 14 }}>該当なし</p>}
    </Card>);
}

// ============ TAB 4: DAILY GATHERING (50日周期 自動) ============
const OAK_SPOTS = ["1番地","2番地","3番地","4番地","5番地","6番地","7番地","8番地","9番地","10番地","11番地","12番地","不思議な松林","温泉山遺跡"];
const FLUORITE_SPOTS = ["1番地","2番地","3番地","4番地","5番地","6番地","7番地","8番地","9番地","10番地","11番地","12番地","温泉山の湖"];
const OTHER_GATHER = [
  { id: "rarewood", name: "レア木材", maxDaily: 0, spot: "郊外の巨木 (8箇所)", tip: "2時間ごとに再採取可能", emoji: "🪵" },
  { id: "stone", name: "石", maxDaily: 0, spot: "各地の岩", tip: "上限なし。建築素材", emoji: "🪨" },
  { id: "ore", name: "鉱石", maxDaily: 0, spot: "各地の鉱床", tip: "上限なし", emoji: "⛏️" },
  { id: "starmeteor", name: "スターメテオの欠片", maxDaily: 0, spot: "各地", tip: "レア素材", emoji: "⭐" },
  { id: "bamboo", name: "竹", maxDaily: 0, spot: "竹林エリア", tip: "建築素材", emoji: "🎋" },
];

function BanchiCard({ emoji, label, color, colorSoft, colorBorder, todaySpot }) {
  return (
    <div style={{ background: colorSoft, borderRadius: 16, padding: 18, border: "2px solid " + colorBorder, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 36 }}>{emoji}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: color }}>{label}</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>毎朝6:00リセット</div>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, padding: "16px 12px", border: "1px solid " + colorBorder, textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: color, marginBottom: 6 }}>今日の出現場所</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: color }}>{todaySpot}</div>
      </div>
    </div>
  );
}

function DailyGathering() {
  const gameDay = getGameDay();
  const idx = getTodayCycleIndex(gameDay);
  const oakToday = spotLabel(OAK_CYCLE[idx], true);
  const fluToday = spotLabel(FLU_CYCLE[idx], false);
  const [subTab, setSubTab] = useState("banchi");
  const [localData, setLocalData] = useState(() => {
    const saved = loadJSON("hp_gather_v6", { date: "", items: {} });
    return saved.date === gameDay ? saved : { date: gameDay, items: {} };
  });
  useEffect(() => { saveJSON("hp_gather_v6", localData); }, [localData]);
  const toggleItem = (id) => setLocalData(p => ({ ...p, items: { ...p.items, [id]: !p.items[id] } }));
  const otherDone = OTHER_GATHER.filter(g => localData.items[g.id]).length;
  return (
    <Card style={{ padding: 14 }}>
      <SectionTitle emoji="⛏️">デイリー採集トラッカー</SectionTitle>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>オーク・蛍石は50日周期で自動表示（毎朝6:00更新）</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <IconBtn active={subTab === "banchi"} color={C.oakGreen} onClick={() => setSubTab("banchi")}>🌳💎 番地</IconBtn>
        <IconBtn active={subTab === "other"} color={C.accent} onClick={() => setSubTab("other")}>⛏️ その他</IconBtn>
      </div>
      {subTab === "banchi" && (
        <>
          <BanchiCard emoji="🌳" label="ツルツルオーク" color={C.oakGreen} colorSoft={C.oakGreenSoft} colorBorder={C.oakGreenBorder} todaySpot={oakToday} />
          <BanchiCard emoji="💎" label="無垢な蛍石" color={C.gemBlue} colorSoft={C.gemBlueSoft} colorBorder={C.gemBlueBorder} todaySpot={fluToday} />
        </>
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
                    <div style={{ fontWeight: 600, fontSize: 13, textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>{g.name}</div>
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

// ============ ADMIN: 番地 手動上書き ============
function AdminPanel() {
  const gameDay = getGameDay();
  const idx = getTodayCycleIndex(gameDay);
  return (
    <Card>
      <SectionTitle emoji="🔧">番地 確認（管理者用）</SectionTitle>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>ゲーム日付: {gameDay} / 周期 {idx + 1}日目</div>
      <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>50日周期データから自動計算された今日の出現場所:</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, background: C.oakGreenSoft, borderRadius: 12, padding: 14, textAlign: "center", border: "1px solid " + C.oakGreenBorder }}>
          <div style={{ fontSize: 24 }}>🌳</div>
          <div style={{ fontSize: 12, color: C.oakGreen, fontWeight: 700 }}>オーク</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.oakGreen }}>{spotLabel(OAK_CYCLE[idx], true)}</div>
        </div>
        <div style={{ flex: 1, background: C.gemBlueSoft, borderRadius: 12, padding: 14, textAlign: "center", border: "1px solid " + C.gemBlueBorder }}>
          <div style={{ fontSize: 24 }}>💎</div>
          <div style={{ fontSize: 12, color: C.gemBlue, fontWeight: 700 }}>蛍石</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.gemBlue }}>{spotLabel(FLU_CYCLE[idx], false)}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
        ※ もしゲーム内とズレていたら、アプデで周期が変わった可能性があります。その場合は新しい早見表をスクショして相談してください。コードの OAK_CYCLE / FLU_CYCLE を更新します。
      </div>
    </Card>
  );
}

// ============ TAB 5: COMPACT OVERLAY (だわゆイラスト + タイマー) ============
const DAWAYU_FACES = [
  { id: "dawayu1", label: "笑顔", file: "/dawayu1.png", blink: null },
  { id: "dawayu2", label: "赤目1", file: "/dawayu2.png", blink: "/dawayu2_blink.png" },
  { id: "dawayu3", label: "赤目2", file: "/dawayu3.png", blink: "/dawayu2_blink.png" },
];
// まばたき対応のイラスト表示
function BlinkImage({ faceId, imgSize, hidden }) {
  const [closed, setClosed] = useState(false);
  const faceObj = DAWAYU_FACES.find(f => f.id === faceId) || DAWAYU_FACES[0];
  useEffect(() => {
    if (!faceObj.blink) { setClosed(false); return; }
    let timeout;
    const loop = () => {
      const next = 2500 + Math.random() * 3000; // 2.5〜5.5秒ごと
      timeout = setTimeout(() => {
        setClosed(true);
        setTimeout(() => setClosed(false), 140); // 0.14秒だけ閉じる
        loop();
      }, next);
    };
    loop();
    return () => clearTimeout(timeout);
  }, [faceObj.blink, faceId]);
  if (hidden) return null;
  const src = (closed && faceObj.blink) ? faceObj.blink : faceObj.file;
  return <img src={src} alt="だわゆ" style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: imgSize, zIndex: 2, pointerEvents: "none" }} onError={(e) => { e.target.style.display = "none"; }} />;
}
// ============ アスレチックトラッカー ============
function loadAthletic() { return loadJSON("hp_athletic", { maxCp: 5, players: [] }); }
function fmtSec(ms) {
  if (ms == null) return "-";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60), s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}秒`;
}
function AthleticTracker({ embedded }) {
  const [data, setData] = useState(() => loadAthletic());
  const [name, setName] = useState("");
  const [, setTick] = useState(0);
  const lastWriteRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1); // 計測中の表示更新
      if (embedded && Date.now() - lastWriteRef.current >= 2500) setData(loadAthletic());
    }, 1000);
    return () => clearInterval(id);
  }, [embedded]);
  const update = (next) => { lastWriteRef.current = Date.now(); setData(next); saveJSON("hp_athletic", next); };
  const addPlayer = () => { if (!name.trim()) return; update({ ...data, players: [...data.players, { id: Date.now(), name: name.trim(), cp: 0, startAt: null, splits: [] }] }); setName(""); };
  const removePlayer = (id) => update({ ...data, players: data.players.filter(p => p.id !== id) });
  const startPlayer = (id) => update({ ...data, players: data.players.map(p => p.id === id ? { ...p, startAt: Date.now(), cp: 0, splits: [] } : p) });
  const passCp = (id) => update({ ...data, players: data.players.map(p => {
    if (p.id !== id || !p.startAt || p.cp >= data.maxCp) return p;
    return { ...p, cp: p.cp + 1, splits: [...p.splits, Date.now() - p.startAt] };
  }) });
  const undoCp = (id) => update({ ...data, players: data.players.map(p => p.id === id && p.cp > 0 ? { ...p, cp: p.cp - 1, splits: p.splits.slice(0, -1) } : p) });
  const setMaxCp = (n) => update({ ...data, maxCp: Math.max(1, n) });
  const resetAll = () => update({ ...data, players: data.players.map(p => ({ ...p, cp: 0, startAt: null, splits: [] })) });
  // 順位: 到達CP数 多い順 → 同数なら最新スプリットが速い順
  const ranked = [...data.players].sort((a, b) => {
    if (b.cp !== a.cp) return b.cp - a.cp;
    const at = a.splits.length ? a.splits[a.splits.length - 1] : Infinity;
    const bt = b.splits.length ? b.splits[b.splits.length - 1] : Infinity;
    return at - bt;
  });
  const medal = (i) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>CP数:</span>
        <button onClick={() => setMaxCp(data.maxCp - 1)} style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid " + C.accent, background: "#fff", color: C.accent, fontWeight: 800, cursor: "pointer" }}>−</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: C.accent, minWidth: 24, textAlign: "center" }}>{data.maxCp}</span>
        <button onClick={() => setMaxCp(data.maxCp + 1)} style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid " + C.accent, background: "#fff", color: C.accent, fontWeight: 800, cursor: "pointer" }}>+</button>
        <IconBtn onClick={resetAll} color={C.danger} style={{ marginLeft: "auto" }}>全リセット</IconBtn>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <Input placeholder="参加者名を入力..." value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addPlayer(); }} />
        <IconBtn onClick={addPlayer} color={C.green}>+ 追加</IconBtn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ranked.length === 0 && <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, margin: "10px 0" }}>参加者を追加してください</p>}
        {ranked.map((p, i) => {
          const goal = p.cp >= data.maxCp;
          const running = p.startAt && !goal;
          const elapsed = p.startAt ? (goal && p.splits.length ? p.splits[p.splits.length - 1] : Date.now() - p.startAt) : null;
          return (
            <div key={p.id} style={{ padding: "10px 12px", borderRadius: 12, background: goal ? C.goldSoft : C.bg, border: "1px solid " + (goal ? C.gold : C.border) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, width: 28, textAlign: "center" }}>{medal(i)}</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{p.name}{goal && " 🏁"}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: goal ? C.gold : C.text }}>{p.cp}/{data.maxCp}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.accent, minWidth: 48, textAlign: "right" }}>{p.startAt ? fmtSec(elapsed) : "未開始"}</span>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                {!p.startAt ? (
                  <IconBtn onClick={() => startPlayer(p.id)} color={C.green} style={{ padding: "4px 12px", fontSize: 12 }}>▶ スタート</IconBtn>
                ) : (
                  <>
                    <IconBtn onClick={() => passCp(p.id)} color={C.blue} style={{ padding: "4px 12px", fontSize: 12 }} >CP通過</IconBtn>
                    <IconBtn onClick={() => undoCp(p.id)} color={C.textMuted} style={{ padding: "4px 10px", fontSize: 12 }}>↩ 取消</IconBtn>
                    <IconBtn onClick={() => startPlayer(p.id)} color={C.danger} style={{ padding: "4px 10px", fontSize: 12 }}>やり直し</IconBtn>
                  </>
                )}
                <button onClick={() => removePlayer(p.id)} style={{ marginLeft: "auto", background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
              {p.splits.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {p.splits.map((sp, si) => {
                    const lap = si === 0 ? sp : sp - p.splits[si - 1];
                    return (
                      <span key={si} style={{ fontSize: 11, background: "#fff", borderRadius: 6, padding: "3px 8px", border: "1px solid " + C.border }}>
                        CP{si + 1}: <b>{fmtSec(sp)}</b> <span style={{ color: C.textMuted }}>(+{fmtSec(lap)})</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
  if (embedded) {
    return (
      <div style={{ background: "rgba(255,248,240,0.97)", borderRadius: 16, padding: 14, border: `2px solid ${C.accent}`, maxWidth: 360, margin: "0 auto" }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, textAlign: "center" }}>🏁 アスレチック順位</div>
        {inner}
      </div>
    );
  }
  return (<Card><SectionTitle emoji="🏁">アスレチックトラッカー</SectionTitle><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>スタート→CP通過ボタンでタイム記録。到達数→タイム順に自動で並びます。OBSにも表示可</div>{inner}</Card>);
}

function OverlayBody({ timers, faceId, imgSize, imgOffset, onRemove, ctrlButton, hideImg }) {
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);
  const gameDay = getGameDay();
  const idx = getTodayCycleIndex(gameDay);
  const fmtRemain = (ms) => { if (ms <= 0) return "完了!"; const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); return h > 0 ? `${h}h${m}m` : `${m}m${s}s`; };
  const sorted = [...(timers || [])].sort((a, b) => a.harvestAt - b.harvestAt);
  return (
    <div style={{ position: "relative", maxWidth: 340, margin: "0 auto", paddingTop: hideImg ? 8 : imgSize * 0.58 }}>
      <BlinkImage faceId={faceId} imgSize={imgSize} hidden={hideImg} />
      {ctrlButton && <div style={{ position: "absolute", top: hideImg ? 0 : imgSize * 0.36, right: 4, zIndex: 3 }}>{ctrlButton}</div>}
      <div style={{ background: "rgba(255,248,240,0.96)", borderRadius: 16, padding: 16, border: `2px solid ${C.purple}`, boxShadow: "0 4px 16px rgba(74,55,40,.12)", position: "relative", zIndex: 1, marginTop: hideImg ? 0 : imgOffset }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>🌳💎 今日の番地</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: C.oakGreenSoft, borderRadius: 8, padding: "6px 4px", textAlign: "center" }}>
              <div style={{ fontSize: 14 }}>🌳</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.oakGreen }}>{spotLabel(OAK_CYCLE[idx], true)}</div>
            </div>
            <div style={{ flex: 1, background: C.gemBlueSoft, borderRadius: 8, padding: "6px 4px", textAlign: "center" }}>
              <div style={{ fontSize: 14 }}>💎</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.gemBlue }}>{spotLabel(FLU_CYCLE[idx], false)}</div>
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>⏱️ タイマー</div>
          {sorted.length === 0 ? (
            <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", padding: "6px 0" }}>セット中のタイマーなし</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sorted.map(t => {
                const remain = t.harvestAt - Date.now();
                const done = remain <= 0;
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 8px", borderRadius: 6, background: done ? C.greenSoft : "#fff", border: `1px solid ${done ? C.green : C.border}` }}>
                    <span>{done ? "🌾" : "🌿"}</span>
                    <span style={{ flex: 1, fontWeight: 600 }}>{t.name}</span>
                    <span style={{ fontWeight: 700, color: done ? C.green : C.accent }}>{fmtRemain(remain)}</span>
                    {onRemove && <button onClick={() => onRemove(t.id)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompactOverlay({ timers }) {
  const [face, setFace] = useState(() => loadJSON("hp_overlay_face", "dawayu1"));
  const [imgSize, setImgSize] = useState(() => loadJSON("hp_overlay_size", 260));
  const [imgOffset, setImgOffset] = useState(() => loadJSON("hp_overlay_offset", -54));
  const [hideImg, setHideImg] = useState(() => loadJSON("hp_overlay_hide", false));
  useEffect(() => { saveJSON("hp_overlay_face", face); }, [face]);
  useEffect(() => { saveJSON("hp_overlay_size", imgSize); }, [imgSize]);
  useEffect(() => { saveJSON("hp_overlay_offset", imgOffset); }, [imgOffset]);
  useEffect(() => { saveJSON("hp_overlay_hide", hideImg); }, [hideImg]);
  const obsUrl = (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "") + "?obs=1";
  const obsAthleticUrl = (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "") + "?obs=athletic";
  return (
    <div>
      <div style={{ background: C.goldSoft, borderRadius: 10, padding: 12, marginBottom: 12, border: "1px solid " + C.gold }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📺 OBSに入れるURL（メインオーバーレイ）</div>
        <div style={{ fontSize: 12, color: C.text, background: "#fff", borderRadius: 6, padding: "6px 10px", wordBreak: "break-all", border: "1px solid " + C.border }}>{obsUrl}</div>
        <div style={{ fontSize: 12, fontWeight: 700, margin: "10px 0 6px" }}>🏁 アスレチック順位表 用URL</div>
        <div style={{ fontSize: 12, color: C.text, background: "#fff", borderRadius: 6, padding: "6px 10px", wordBreak: "break-all", border: "1px solid " + C.border }}>{obsAthleticUrl}</div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>OBSの「ブラウザソース」に入れて使います。アスレチックは別ソースとして追加できます</div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {DAWAYU_FACES.map(f => <IconBtn key={f.id} active={face === f.id} color={C.purple} onClick={() => setFace(f.id)}>{f.label}{f.blink ? " ✨" : ""}</IconBtn>)}
      </div>
      <div style={{ background: C.bg, borderRadius: 10, padding: 12, marginBottom: 12, border: "1px solid " + C.border }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>🎚️ イラスト調整</span>
          <IconBtn onClick={() => setHideImg(h => !h)} color={hideImg ? C.danger : C.purple} style={{ padding: "4px 10px", fontSize: 12 }}>{hideImg ? "イラスト非表示中" : "イラスト表示中"}</IconBtn>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: C.textMuted, width: 48 }}>サイズ</span>
          <input type="range" min={140} max={400} value={imgSize} onChange={e => setImgSize(Number(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: C.textMuted, width: 40, textAlign: "right" }}>{imgSize}px</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: C.textMuted, width: 48 }}>縦位置</span>
          <input type="range" min={-120} max={20} value={imgOffset} onChange={e => setImgOffset(Number(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: C.textMuted, width: 40, textAlign: "right" }}>{imgOffset}px</span>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <IconBtn onClick={() => { setImgSize(260); setImgOffset(-54); }} color={C.textMuted}>リセット</IconBtn>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>プレビュー:</div>
      <OverlayBody timers={timers} faceId={face} imgSize={imgSize} imgOffset={imgOffset} hideImg={hideImg} />
      <div style={{ fontSize: 10, color: C.textMuted, textAlign: "center", marginTop: 10 }}>
        ※イラストが表示されない場合は public フォルダに dawayu1〜3.png（まばたき用は dawayu2_blink.png）を入れてください
      </div>
    </div>
  );
}

function ObsTimers({ imgSize, imgOffset }) {
  const [timers, setTimersLocal] = useState(() => loadJSON("hp_timers", []));
  const [face, setFace] = useState(() => loadJSON("hp_overlay_face", "dawayu1"));
  const [crop, setCrop] = useState(CROPS[0].name);
  const [customH, setCustomH] = useState(""); const [customName, setCustomName] = useState("");
  const [showCtrl, setShowCtrl] = useState(false);
  const [, setTick] = useState(0);
  const lastWriteRef = useRef(0);
  const notifiedRef = useRef({});
  // 音の判定（毎秒チェック）
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      const list = loadJSON("hp_timers", []);
      list.forEach(t => {
        const remain = t.harvestAt - Date.now();
        const k1 = t.id + "_1m", kd = t.id + "_done";
        if (remain <= 60000 && remain > 0 && !notifiedRef.current[k1]) { notifiedRef.current[k1] = true; playBeep(1); }
        if (remain <= 0 && !notifiedRef.current[kd]) { notifiedRef.current[kd] = true; playBeep(2); }
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      // 直近2.5秒以内に自分で書き込んだ場合は再読込しない（上書き防止）
      if (Date.now() - lastWriteRef.current < 2500) return;
      setTimersLocal(loadJSON("hp_timers", []));
    }, 2000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { saveJSON("hp_overlay_face", face); }, [face]);
  const updateTimers = (next) => { lastWriteRef.current = Date.now(); setTimersLocal(next); saveJSON("hp_timers", next); };
  const addTimer = () => {
    const c = CROPS.find(x => x.name === crop);
    const mins = crop === "カスタム" ? (parseFloat(customH) || 1) : c.min;
    const name = crop === "カスタム" ? (customName || "カスタム") : crop;
    updateTimers([...timers, { id: Date.now(), name, planted: Date.now(), harvestAt: Date.now() + mins * 60000 }]);
  };
  const removeTimer = (id) => { delete notifiedRef.current[id + "_1m"]; delete notifiedRef.current[id + "_done"]; updateTimers(timers.filter(t => t.id !== id)); };
  return (
    <div>
      {showCtrl && (
        <div style={{ background: "rgba(255,248,240,0.97)", borderRadius: 12, padding: 12, marginBottom: 8, border: "1px solid " + C.purple }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>表情</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
            {DAWAYU_FACES.map(f => <IconBtn key={f.id} active={face === f.id} color={C.purple} onClick={() => setFace(f.id)} style={{ padding: "4px 10px", fontSize: 12 }}>{f.label}</IconBtn>)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>タイマー追加</div>
          <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 6, marginBottom: 8, WebkitOverflowScrolling: "touch" }}>
            {CROPS.map(c => (
              <button key={c.name} onClick={() => setCrop(c.name)} style={{
                flex: "none", padding: "5px 10px", borderRadius: 8, fontSize: 12,
                fontWeight: crop === c.name ? 700 : 500,
                background: crop === c.name ? C.green : "#fff",
                color: crop === c.name ? "#fff" : C.text,
                border: "1.5px solid " + (crop === c.name ? C.green : C.border),
                cursor: "pointer", whiteSpace: "nowrap",
              }}>{c.name}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            {crop === "カスタム" && (<><Input placeholder="名前" value={customName} onChange={e => setCustomName(e.target.value)} style={{ flex: 1, minWidth: 60, fontSize: 12 }} /><Input placeholder="分" type="number" value={customH} onChange={e => setCustomH(e.target.value)} style={{ width: 56, flex: "none", fontSize: 12 }} /></>)}
            <span style={{ fontSize: 12, color: C.textMuted, flex: 1 }}>選択中: <b style={{ color: C.green }}>{crop}</b></span>
            <IconBtn onClick={addTimer} color={C.green} style={{ padding: "5px 12px", fontSize: 12 }}>+ 追加</IconBtn>
          </div>
        </div>
      )}
      <OverlayBody timers={timers} faceId={face} imgSize={imgSize} imgOffset={imgOffset} hideImg={loadJSON("hp_overlay_hide", false)} onRemove={showCtrl ? removeTimer : null} ctrlButton={
        <button onClick={() => setShowCtrl(s => !s)} style={{ background: showCtrl ? C.purple : "rgba(181,158,216,0.7)", color: "#fff", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{showCtrl ? "× 閉じる" : "⚙️ 操作"}</button>
      } />
    </div>
  );
}

// ============ MAIN APP ============
const TABS = [
  { key: "crop", label: "🌱 タイマー", color: C.green },
  { key: "daily", label: "📋 デイリー", color: C.accent },
  { key: "gather", label: "⛏️ 採集", color: C.gold },
  { key: "recipe", label: "🍳 レシピ", color: C.pink },
  { key: "athletic", label: "🏁 アスレ", color: C.blue },
  { key: "overlay", label: "🎬 配信", color: C.purple },
];
const ADMIN_PASSWORD = "黄色い謎の子";

export default function App() {
  const [activeTab, setActiveTab] = useState("crop");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPwDialog, setShowPwDialog] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [alarmUrl, setAlarmUrl] = useState(null);
  const [alarmName, setAlarmName] = useState("");
  const [timers, setTimers] = useState(() => loadJSON("hp_timers", []));

  const isObs = typeof window !== "undefined" && window.location.search.includes("obs=1");
  const isObsAthletic = typeof window !== "undefined" && window.location.search.includes("obs=athletic");
  if (isObsAthletic) {
    return (
      <div style={{ background: "transparent", padding: 8, fontFamily: "'Helvetica Neue','Hiragino Sans','Noto Sans JP',sans-serif", color: C.text }}>
        <AthleticTracker embedded />
      </div>
    );
  }
  if (isObs) {
    const imgSize = loadJSON("hp_overlay_size", 260);
    const imgOffset = loadJSON("hp_overlay_offset", -54);
    return (
      <div style={{ background: "transparent", padding: 8, fontFamily: "'Helvetica Neue','Hiragino Sans','Noto Sans JP',sans-serif", color: C.text }}>
        <ObsTimers imgSize={imgSize} imgOffset={imgOffset} />
      </div>
    );
  }

  const handlePwSubmit = () => {
    if (pwInput === ADMIN_PASSWORD) { setIsAdmin(true); setShowPwDialog(false); setPwInput(""); setPwError(false); }
    else { setPwError(true); }
  };
  const handleAlarmFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) { const url = URL.createObjectURL(f); setAlarmUrl(url); setAlarmName(f.name); }
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
        <div style={{ padding: 12, maxWidth: 640, margin: "0 auto" }}><AdminPanel /></div>
      )}
      {!isAdmin && (
        <>
          <div style={{ display: "flex", overflowX: "auto", gap: 2, padding: "8px 8px 0", background: C.bg, borderBottom: "1px solid " + C.border, WebkitOverflowScrolling: "touch" }}>
            {TABS.map(t => (<button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: "none", padding: "8px 12px", fontSize: 12, fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? t.color : C.textMuted, background: activeTab === t.key ? C.card : "transparent", border: "none", borderBottom: activeTab === t.key ? "2.5px solid " + t.color : "2.5px solid transparent", cursor: "pointer", whiteSpace: "nowrap", borderRadius: "8px 8px 0 0" }}>{t.label}</button>))}
          </div>
          <div style={{ padding: 12, maxWidth: 640, margin: "0 auto" }}>
            <div style={{ display: activeTab === "crop" ? "block" : "none" }}><CropTimer alarmUrl={alarmUrl} timers={timers} setTimers={setTimers} /></div>
            <div style={{ display: activeTab === "daily" ? "block" : "none" }}><DailyTasks /></div>
            <div style={{ display: activeTab === "gather" ? "block" : "none" }}><DailyGathering /></div>
            <div style={{ display: activeTab === "recipe" ? "block" : "none" }}><RecipeCalc /></div>
            <div style={{ display: activeTab === "athletic" ? "block" : "none" }}><AthleticTracker /></div>
            <div style={{ display: activeTab === "overlay" ? "block" : "none" }}>
              <Card>
                <SectionTitle emoji="🎬">配信者コンパクトモード</SectionTitle>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>OBSのブラウザソースにURLを入れると配信画面に重ねて使えます</div>
                <div style={{ marginBottom: 16, padding: 12, background: C.bg, borderRadius: 10, border: "1px solid " + C.border }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🔔 アラーム音（mp3）</div>
                  <input type="file" accept="audio/*" onChange={handleAlarmFile} style={{ fontSize: 12 }} />
                  {alarmName && <div style={{ fontSize: 11, color: C.green, marginTop: 4 }}>設定中: {alarmName}</div>}
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>※ページを開き直すと再設定が必要です</div>
                </div>
                <CompactOverlay timers={timers} />
              </Card>
            </div>
          </div>
        </>
      )}
      <div style={{ textAlign: "center", padding: "20px 16px", fontSize: 11, color: C.textMuted }}>ハートピアスローライフ 非公式便利ツール v6</div>
    </div>
  );
}