import { useState, useEffect } from "react";

const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const BOOK_GOAL = 5;
const RUN_GOAL = 250;

const now = new Date();
const THIS_YEAR = now.getFullYear();
const THIS_MONTH = now.getMonth();

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatDateKR(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(m)}월 ${parseInt(d)}일`;
}

function getDayLabel(books, currentId, dateStr) {
  const sameDayBooks = books.filter(b => b.date === dateStr);
  if (sameDayBooks.length <= 1) return formatDateKR(dateStr);
  const idx = sameDayBooks.findIndex(b => b.id === currentId);
  return `${formatDateKR(dateStr)} (${idx + 1})`;
}

function initMonthData() {
  return Array.from({ length: 12 }, () => ({ books: [], runs: [] }));
}

function loadData() {
  try {
    const raw = localStorage.getItem("myYearPlan_v2");
    if (raw) return JSON.parse(raw);
  } catch {}
  return initMonthData();
}

function saveData(data) {
  localStorage.setItem("myYearPlan_v2", JSON.stringify(data));
}

function calcPace(distKm, timeSec) {
  if (!distKm || !timeSec) return null;
  const secPerKm = timeSec / distKm;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}'${String(sec).padStart(2,"0")}"`;
}

function parseDuration(str) {
  const parts = str.trim().split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 1) return parts[0] * 60;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function formatDuration(sec) {
  if (!sec) return "-";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${m}:${String(s).padStart(2,"0")}`;
}

function getDaysInMonth(monthIndex) {
  return new Date(THIS_YEAR, monthIndex + 1, 0).getDate();
}

function Ring({ value, goal, color, label, unit }) {
  const pct = Math.min(value / goal, 1);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={110} height={110} viewBox="0 0 110 110">
        <circle cx={55} cy={55} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10}/>
        <circle cx={55} cy={55} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 55 55)"
          style={{ transition:"stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}/>
        <text x={55} y={50} textAnchor="middle" fill="white" fontSize={18} fontWeight={700} fontFamily="'Bebas Neue', sans-serif">{value}</text>
        <text x={55} y={66} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={10} fontFamily="'Noto Sans KR', sans-serif">/ {goal}{unit}</text>
      </svg>
      <span style={{ color:"rgba(255,255,255,0.6)", fontSize:12, fontFamily:"'Noto Sans KR', sans-serif" }}>{label}</span>
    </div>
  );
}

function PaceSparkline({ runs }) {
  const paced = runs.filter(r => r.dist && r.time);
  if (paced.length < 2) return (
    <p style={{ color:"rgba(255,255,255,0.3)", fontSize:12, fontFamily:"'Noto Sans KR', sans-serif", margin:0 }}>
      기록이 2개 이상 쌓이면 페이스 그래프가 나타납니다
    </p>
  );
  const paces = paced.map(r => r.time / r.dist);
  const min = Math.min(...paces);
  const max = Math.max(...paces);
  const W = 260, H = 60, pad = 8;
  const pts = paces.map((p, i) => {
    const x = pad + (i / (paces.length - 1)) * (W - pad * 2);
    const y = pad + ((p - min) / (max - min || 1)) * (H - pad * 2);
    return [x, y];
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  return (
    <div>
      <p style={{ color:"rgba(255,255,255,0.4)", fontSize:11, margin:"0 0 6px", fontFamily:"'Noto Sans KR', sans-serif" }}>
        페이스 추이 — {paced.length}개 기록
      </p>
      <svg width={W} height={H} style={{ overflow:"visible" }}>
        <path d={path} fill="none" stroke="#4ade80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map(([x,y], i) => <circle key={i} cx={x} cy={y} r={3} fill="#4ade80"/>)}
        <text x={pts[pts.length-1][0]+5} y={pts[pts.length-1][1]+4} fontSize={9} fill="#4ade80" fontFamily="monospace">
          {calcPace(paced[paced.length-1].dist, paced[paced.length-1].time)}
        </text>
      </svg>
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:14, border:"1px solid rgba(255,255,255,0.08)", padding:"16px 18px" }}>
      {children}
    </div>
  );
}

function Empty({ children }) {
  return <p style={{ textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:13, padding:16 }}>{children}</p>;
}

const inputStyle = {
  width:"100%", padding:"10px 14px",
  background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
  borderRadius:10, color:"white", fontSize:14, outline:"none",
  fontFamily:"'Noto Sans KR', sans-serif",
};

function btnStyle(color) {
  return {
    width:"100%", marginTop:12, padding:"12px 0",
    background:`linear-gradient(135deg, ${color}33, ${color}22)`,
    border:`1px solid ${color}55`, borderRadius:10,
    color:color, fontSize:14, fontWeight:700, cursor:"pointer",
    fontFamily:"'Noto Sans KR', sans-serif", transition:"all 0.2s",
  };
}

export default function App() {
  const [data, setData] = useState(loadData);
  const [month, setMonth] = useState(THIS_MONTH);
  const [tab, setTab] = useState("overview");
  const [bookForm, setBookForm] = useState({ title:"", author:"", memo:"", date: todayString() });
  const [runForm, setRunForm] = useState({ dist:"", time:"", date: todayString() });
  const [toast, setToast] = useState(null);

  useEffect(() => { saveData(data); }, [data]);

  function showToast(msg, type="ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  const md = data[month];
  const totalKm = +md.runs.reduce((s, r) => s + (r.dist || 0), 0).toFixed(2);
  const totalBooks = md.books.length;

  // Sort books by date
  const sortedBooks = [...md.books].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  function addBook() {
    if (!bookForm.title.trim()) return showToast("책 제목을 입력해주세요!", "err");
    const newBook = { ...bookForm, id: Date.now() };
    const updated = data.map((m, i) =>
      i === month ? { ...m, books: [...m.books, newBook] } : m
    );
    setData(updated);
    setBookForm({ title:"", author:"", memo:"", date: todayString() });
    showToast(`📚 "${bookForm.title}" 추가! (${totalBooks + 1}/${BOOK_GOAL}권)`);
  }

  function addRun() {
    const dist = parseFloat(runForm.dist);
    if (!dist || dist <= 0) return showToast("거리를 입력해주세요!", "err");
    const timeSec = runForm.time ? parseDuration(runForm.time) : null;
    if (runForm.time && !timeSec) return showToast("시간 형식: 32:15 또는 1:05:30", "err");
    const newRun = { dist, time: timeSec, date: runForm.date || todayString(), id: Date.now() };
    const updated = data.map((m, i) =>
      i === month ? { ...m, runs: [...m.runs, newRun] } : m
    );
    setData(updated);
    const newTotal = +(totalKm + dist).toFixed(2);
    setRunForm({ dist:"", time:"", date: todayString() });
    showToast(`🏃 ${dist}km 추가! 이번 달 ${newTotal}km / ${RUN_GOAL}km`);
  }

  function deleteBook(id) {
    setData(data.map((m, i) => i === month ? { ...m, books: m.books.filter(b => b.id !== id) } : m));
  }

  function deleteRun(id) {
    setData(data.map((m, i) => i === month ? { ...m, runs: m.runs.filter(r => r.id !== id) } : m));
  }

  const yearBooks = data.reduce((s, m) => s + m.books.length, 0);
  const yearKm = +data.reduce((s, m) => s + m.runs.reduce((ss, r) => ss + (r.dist || 0), 0), 0).toFixed(1);

  // Generate day slots for current month
  const daysInMonth = getDaysInMonth(month);
  const daySlots = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${THIS_YEAR}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const dayBooks = md.books.filter(b => b.date === dateStr);
    return { day, dateStr, books: dayBooks };
  });

  return (
    <div style={{
      minHeight:"100vh", background:"#0a0a0f",
      fontFamily:"'Noto Sans KR', sans-serif", color:"white",
      position:"relative", overflow:"hidden",
    }}>
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 80% 60% at 20% 10%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(16,185,129,0.08) 0%, transparent 60%)",
      }}/>

      <div style={{ position:"relative", zIndex:1, maxWidth:520, margin:"0 auto", padding:"24px 16px 80px" }}>

        {/* HEADER */}
        <div style={{ marginBottom:28 }}>
          <p style={{ margin:0, color:"rgba(255,255,255,0.35)", fontSize:12, letterSpacing:3, textTransform:"uppercase" }}>
            {THIS_YEAR} MY YEAR
          </p>
          <h1 style={{
            margin:"4px 0 0", fontSize:36, fontFamily:"'Bebas Neue', sans-serif",
            letterSpacing:2, background:"linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.55) 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>개인 맞춤형 계획표</h1>
          <div style={{ display:"flex", gap:16, marginTop:12 }}>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>📚 올해 {yearBooks}권</span>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>🏃 올해 {yearKm}km</span>
          </div>
        </div>

        {/* MONTH SELECTOR */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:24 }}>
          {MONTHS_KR.map((m, i) => {
            const bks = data[i].books.length;
            const kms = +data[i].runs.reduce((s,r)=>s+(r.dist||0),0).toFixed(0);
            return (
              <button key={i} onClick={() => setMonth(i)} style={{
                padding:"6px 10px", borderRadius:8, border:"1px solid",
                borderColor: month === i ? "#6366f1" : "rgba(255,255,255,0.1)",
                background: month === i ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                color: month === i ? "white" : "rgba(255,255,255,0.45)",
                cursor:"pointer", fontSize:12, transition:"all 0.2s",
              }}>
                {m}
                <span style={{ fontSize:9, marginLeft:3 }}>
                  {bks >= BOOK_GOAL ? "📚" : ""}{kms >= RUN_GOAL ? "🏃" : ""}
                </span>
              </button>
            );
          })}
        </div>

        {/* RINGS */}
        <div style={{
          background:"rgba(255,255,255,0.04)", borderRadius:16,
          border:"1px solid rgba(255,255,255,0.08)",
          padding:20, marginBottom:20,
          display:"flex", justifyContent:"space-around", alignItems:"center",
        }}>
          <Ring value={totalBooks} goal={BOOK_GOAL} color="#a78bfa" label="이번 달 독서" unit="권"/>
          <div style={{ width:1, height:80, background:"rgba(255,255,255,0.08)" }}/>
          <Ring value={+totalKm.toFixed(0)} goal={RUN_GOAL} color="#4ade80" label="이번 달 러닝" unit="km"/>
        </div>

        {/* TABS */}
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {[["overview","📊 현황"],["books","📚 독서"],["runs","🏃 러닝"]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex:1, padding:"10px 0", borderRadius:10, border:"none",
              background: tab === k ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)",
              color: tab === k ? "white" : "rgba(255,255,255,0.45)",
              cursor:"pointer", fontSize:13, transition:"all 0.2s",
              fontFamily:"'Noto Sans KR', sans-serif",
            }}>{l}</button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Card>
              <p style={{ margin:"0 0 14px", fontSize:13, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>월별 독서 현황</p>
              {MONTHS_KR.map((m, i) => {
                const cnt = data[i].books.length;
                const pct = Math.min(cnt / BOOK_GOAL, 1);
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                    <span style={{ width:24, fontSize:11, color:"rgba(255,255,255,0.35)", textAlign:"right" }}>{m}</span>
                    <div style={{ flex:1, height:6, borderRadius:99, background:"rgba(255,255,255,0.07)" }}>
                      <div style={{ width:`${pct*100}%`, height:"100%", borderRadius:99, background:"#a78bfa", transition:"width 0.5s" }}/>
                    </div>
                    <span style={{ width:32, fontSize:11, color: cnt>=BOOK_GOAL?"#a78bfa":"rgba(255,255,255,0.35)" }}>{cnt}권</span>
                  </div>
                );
              })}
            </Card>
            <Card>
              <p style={{ margin:"0 0 14px", fontSize:13, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>월별 러닝 현황</p>
              {MONTHS_KR.map((m, i) => {
                const km = +data[i].runs.reduce((s,r)=>s+(r.dist||0),0).toFixed(1);
                const pct = Math.min(km / RUN_GOAL, 1);
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                    <span style={{ width:24, fontSize:11, color:"rgba(255,255,255,0.35)", textAlign:"right" }}>{m}</span>
                    <div style={{ flex:1, height:6, borderRadius:99, background:"rgba(255,255,255,0.07)" }}>
                      <div style={{ width:`${pct*100}%`, height:"100%", borderRadius:99, background:"#4ade80", transition:"width 0.5s" }}/>
                    </div>
                    <span style={{ width:48, fontSize:11, color: km>=RUN_GOAL?"#4ade80":"rgba(255,255,255,0.35)" }}>{km}km</span>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* BOOKS */}
        {tab === "books" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Card>
              <p style={{ margin:"0 0 12px", fontSize:13, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>
                {MONTHS_KR[month]} 책 추가
              </p>
              <input placeholder="📖 책 제목 *" value={bookForm.title}
                onChange={e=>setBookForm(f=>({...f,title:e.target.value}))} style={inputStyle}/>
              <input placeholder="✍️ 저자" value={bookForm.author}
                onChange={e=>setBookForm(f=>({...f,author:e.target.value}))} style={{...inputStyle, marginTop:8}}/>
              <textarea placeholder="💭 느낀점 (선택)" value={bookForm.memo}
                onChange={e=>setBookForm(f=>({...f,memo:e.target.value}))} rows={3}
                style={{...inputStyle, marginTop:8, resize:"vertical"}}/>
              <div style={{ marginTop:8 }}>
                <label style={{ fontSize:11, color:"rgba(255,255,255,0.4)", display:"block", marginBottom:4 }}>📅 읽은 날짜</label>
                <input type="date" value={bookForm.date}
                  onChange={e=>setBookForm(f=>({...f,date:e.target.value}))}
                  min={`${THIS_YEAR}-${String(month+1).padStart(2,"0")}-01`}
                  max={`${THIS_YEAR}-${String(month+1).padStart(2,"0")}-${String(daysInMonth).padStart(2,"0")}`}
                  style={{...inputStyle, colorScheme:"dark"}}/>
              </div>
              <button onClick={addBook} style={btnStyle("#a78bfa")}>+ 기록하기</button>
            </Card>

            {/* DAY SLOTS */}
            <Card>
              <p style={{ margin:"0 0 14px", fontSize:13, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>
                {MONTHS_KR[month]} 날짜별 독서 현황
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {daySlots.map(({ day, dateStr, books }) => {
                  const isToday = dateStr === todayString();
                  const hasBooksToday = books.length > 0;
                  return (
                    <div key={day} style={{
                      width:36, height:36, borderRadius:8,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      flexDirection:"column",
                      background: hasBooksToday ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.04)",
                      border: isToday ? "1px solid #a78bfa" : "1px solid rgba(255,255,255,0.06)",
                      cursor: hasBooksToday ? "pointer" : "default",
                      position:"relative",
                    }}
                    title={hasBooksToday ? books.map(b=>b.title).join(", ") : ""}
                    >
                      <span style={{ fontSize:11, color: hasBooksToday ? "#a78bfa" : "rgba(255,255,255,0.3)", fontWeight: isToday ? 700 : 400 }}>
                        {day}
                      </span>
                      {hasBooksToday && (
                        <span style={{ fontSize:7, color:"#a78bfa", lineHeight:1 }}>
                          {"●".repeat(Math.min(books.length, 3))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {sortedBooks.length === 0
              ? <Empty>아직 읽은 책이 없어요 📚</Empty>
              : sortedBooks.map((b) => (
                <Card key={b.id}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:11, color:"#a78bfa", fontWeight:700 }}>
                        {getDayLabel(md.books, b.id, b.date)}
                      </span>
                      <p style={{ margin:"4px 0 2px", fontSize:15, fontWeight:700 }}>{b.title}</p>
                      {b.author && <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,0.45)" }}>{b.author}</p>}
                      {b.memo && (
                        <p style={{ margin:"8px 0 0", fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6, padding:"8px 12px", background:"rgba(167,139,250,0.08)", borderRadius:8, borderLeft:"2px solid #a78bfa" }}>
                          {b.memo}
                        </p>
                      )}
                    </div>
                    <button onClick={()=>deleteBook(b.id)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.25)", cursor:"pointer", fontSize:16, padding:"0 0 0 8px" }}>×</button>
                  </div>
                </Card>
              ))
            }
          </div>
        )}

        {/* RUNS */}
        {tab === "runs" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Card>
              <p style={{ margin:"0 0 12px", fontSize:13, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>
                {MONTHS_KR[month]} 러닝 추가
              </p>
              <input placeholder="📍 거리 (km) *  예: 5.3" type="number" step="0.01" value={runForm.dist}
                onChange={e=>setRunForm(f=>({...f,dist:e.target.value}))} style={inputStyle}/>
              <input placeholder="⏱️ 시간  예: 32:15 또는 1:05:30" value={runForm.time}
                onChange={e=>setRunForm(f=>({...f,time:e.target.value}))} style={{...inputStyle, marginTop:8}}/>
              <div style={{ marginTop:8 }}>
                <label style={{ fontSize:11, color:"rgba(255,255,255,0.4)", display:"block", marginBottom:4 }}>📅 뛴 날짜</label>
                <input type="date" value={runForm.date}
                  onChange={e=>setRunForm(f=>({...f,date:e.target.value}))}
                  min={`${THIS_YEAR}-${String(month+1).padStart(2,"0")}-01`}
                  max={`${THIS_YEAR}-${String(month+1).padStart(2,"0")}-${String(daysInMonth).padStart(2,"0")}`}
                  style={{...inputStyle, colorScheme:"dark"}}/>
              </div>
              <button onClick={addRun} style={btnStyle("#4ade80")}>+ 기록하기</button>
            </Card>

            {md.runs.length >= 2 && (
              <Card><PaceSparkline runs={md.runs}/></Card>
            )}

            {md.runs.length === 0
              ? <Empty>아직 러닝 기록이 없어요 🏃</Empty>
              : [...md.runs].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).reverse().map((r) => {
                const pace = calcPace(r.dist, r.time);
                return (
                  <Card key={r.id}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                        <div style={{ textAlign:"center" }}>
                          <p style={{ margin:0, fontSize:22, fontWeight:800, fontFamily:"'Bebas Neue', sans-serif", color:"#4ade80" }}>{r.dist}</p>
                          <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.4)" }}>km</p>
                        </div>
                        {r.time && <>
                          <div style={{ textAlign:"center" }}>
                            <p style={{ margin:0, fontSize:14, fontWeight:600 }}>{formatDuration(r.time)}</p>
                            <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.4)" }}>시간</p>
                          </div>
                          <div style={{ textAlign:"center" }}>
                            <p style={{ margin:0, fontSize:14, fontWeight:600, color:"#4ade80" }}>{pace}</p>
                            <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.4)" }}>페이스</p>
                          </div>
                        </>}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {r.date && <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>{formatDateKR(r.date)}</span>}
                        <button onClick={()=>deleteRun(r.id)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.25)", cursor:"pointer", fontSize:16 }}>×</button>
                      </div>
                    </div>
                  </Card>
                );
              })
            }
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)",
          background: toast.type === "err" ? "#ef4444" : "#1e1e2e",
          border:`1px solid ${toast.type === "err" ? "#ef4444" : "rgba(255,255,255,0.15)"}`,
          color:"white", padding:"12px 20px", borderRadius:12, fontSize:13,
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
          animation:"fadeup 0.3s ease", zIndex:99, whiteSpace:"nowrap",
          fontFamily:"'Noto Sans KR', sans-serif",
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+KR:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeup { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.5; }
      `}</style>
    </div>
  );
}
