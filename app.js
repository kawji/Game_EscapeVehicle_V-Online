/** Road Safety — Dodge (Online PG) **/
(() => {
const $ = (q, el=document)=> el.querySelector(q);
const nav = document.getElementById("nav");
const view = document.getElementById("view");

/** ===== Remote Adapter (PostgreSQL via Express API) ===== */
async function fetchJSON(path, opts={}){
  const r = await fetch(path, { credentials: 'include', ...opts, headers: { 'Content-Type':'application/json', ...(opts.headers||{}) } });
  if(!r.ok) throw new Error((await r.text())||('HTTP '+r.status));
  return r.json();
}
async function api_register(username, password){ return fetchJSON('/api/register', { method:'POST', body: JSON.stringify({ username, password }) }); }
async function api_login(username, password){ return fetchJSON('/api/login', { method:'POST', body: JSON.stringify({ username, password }) }); }
async function api_logout(){ try{ await fetch('/api/logout',{method:'POST', credentials:'include'}); }catch(e){} }
async function api_me(){ try{ return await fetchJSON('/api/me'); }catch(e){ return null; } }
async function api_win(){ return fetchJSON('/api/win', { method:'POST', body: JSON.stringify({}) }); }

/** Local-only stats (best time/score) */
function statsKey(user){ return 'rsd_stats_'+user; }
function loadStats(user){ try{ return JSON.parse(localStorage.getItem(statsKey(user)) || '{"dodge":{"bestTimeMs":0,"bestScore":0}}'); }catch(e){ return { dodge:{ bestTimeMs:0, bestScore:0 } }; } }
function saveStats(user, stats){ localStorage.setItem(statsKey(user), JSON.stringify(stats)); }

window.addEventListener("error", e => {
  view.innerHTML = `<div class="card" style="max-width:620px;margin:24px auto;"><div class="h1">เกิดข้อผิดพลาด</div><div class="sep"></div><div class="notice">${e.message}<br>${e.filename}:${e.lineno}</div></div>`;
});

/** UI **/
async function renderNav(){
  nav.innerHTML="";
  const me = await api_me();
  if(me){
    const badge=document.createElement("span"); badge.className="badge"; badge.textContent="👤 "+me.username; nav.appendChild(badge);
    const aHome=document.createElement("a"); aHome.href="#/home"; aHome.textContent="หน้าแรก"; nav.appendChild(aHome);
    const aLB=document.createElement("a"); aLB.href="#/leaderboard"; aLB.textContent="จัดอันดับ"; nav.appendChild(aLB);
    const btn=document.createElement("button"); btn.textContent="ออกจากระบบ"; btn.onclick=async()=>{ await api_logout(); location.hash="#/login"; route(); }; nav.appendChild(btn);
  }else{
    const aLogin=document.createElement("a"); aLogin.href="#/login"; aLogin.textContent="เข้าสู่ระบบ"; nav.appendChild(aLogin);
  }
}

function renderLogin(){
  view.innerHTML = `
  <div class="grid" style="max-width:520px;margin:24px auto;">
    <div class="card">
      <div class="h1">เข้าสู่ระบบ</div>
      <div class="sep"></div>
      <div class="grid">
        <div id="msg-login"></div>
        <input id="login-user" class="input" placeholder="ชื่อบัญชี" />
        <input id="login-pass" class="input" placeholder="รหัสผ่าน" type="password" />
        <button id="btn-login" class="btn primary">เข้าสู่ระบบ</button>
      </div>
      <div class="sep"></div>
      <div class="help">ยังไม่พบบัญชี? ลงทะเบียนด้านล่าง</div>
    </div>
    <div class="card">
      <div class="h1">สร้างบัญชีใหม่</div>
      <div class="sep"></div>
      <div class="grid">
        <div id="msg-reg"></div>
        <input id="reg-user" class="input" placeholder="ตั้งชื่อบัญชี" />
        <input id="reg-pass" class="input" placeholder="ตั้งรหัสผ่าน" type="password" />
        <button id="btn-reg" class="btn">สมัครสมาชิก</button>
      </div>
      <div class="sep"></div>
      <div class="help">* ข้อมูลหลักเก็บบนฐานข้อมูลเซิร์ฟเวอร์</div>
    </div>
  </div>`;
  document.getElementById("btn-login").onclick=async()=>{
    const u=$('#login-user').value.trim(), p=$('#login-pass').value;
    const m=$('#msg-login');
    try{ await api_login(u,p); location.hash="#/home"; route(); }
    catch(e){ m.className="notice"; m.textContent="ชื่อบัญชีหรือรหัสผ่านไม่ถูกต้อง"; }
  };
  document.getElementById("btn-reg").onclick=async()=>{
    const u=$('#reg-user').value.trim(), p=$('#reg-pass').value;
    const m=$('#msg-reg');
    if(!u||!p){ m.className="notice"; m.textContent="กรุณากรอกชื่อบัญชีและรหัสผ่าน"; return; }
    try{ await api_register(u,p); m.className="notice"; m.textContent="สมัครสำเร็จ! กำลังพาไปหน้าแรก…"; setTimeout(()=>{ location.hash="#/home"; route(); }, 500); }
    catch(e){ m.className="notice"; m.textContent="สมัครไม่สำเร็จหรือมีผู้ใช้นี้อยู่แล้ว"; }
  };
}

async function renderHome(){
  const me = await api_me();
  if(!me){ location.hash="#/login"; return renderLogin(); }
  const stats = loadStats(me.username);
  view.innerHTML = `
  <div class="grid" style="gap:16px;">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div>
          <div class="h1">สวัสดี, ${me.username}</div>
          <div class="help">แรงค์ปัจจุบัน: <span class="rank-pill">Tier ${me.tier} • ${"⭐".repeat(me.stars)}${me.tier<3?" / ⭐⭐⭐":""}</span></div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn" id="btn-devinfo">เกี่ยวกับนักพัฒนา</button>
        </div>
      </div>
      <div class="sep"></div>
      <div class="grid grid-2">
        <button class="btn primary" id="btn-play-general">เล่นโหมดทั่วไป</button>
        <button class="btn" id="btn-play-ranked">เล่นโหมดแรงค์</button>
      </div>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="h2">สถิติของฉัน (Dodge)</div>
        <div class="sep"></div>
        <div class="badge">Best time: <b>${(stats.dodge.bestTimeMs/1000|0)}s</b></div>
        <div class="badge">Best score: <b>${stats.dodge.bestScore}</b></div>
      </div>
      <div class="card">
        <div class="h2">จัดอันดับ (ภายในเครื่อง)</div>
        <div class="sep"></div>
        <a class="btn" href="#/leaderboard">เปิดตารางอันดับ</a>
      </div>
    </div>
  </div>`;
  $('#btn-play-general').onclick=()=>{ location.hash="#/general"; route(); };
  $('#btn-play-ranked').onclick=()=>{ location.hash="#/ranked"; route(); };

  const modal=$('#devinfo-modal'), btn=$('#btn-devinfo'), close=$('#devinfo-close');
  if(btn && modal && close){
    btn.onclick=()=>{ modal.classList.add("show"); modal.setAttribute("aria-hidden","false"); };
    close.onclick=()=>{ modal.classList.remove("show"); modal.setAttribute("aria-hidden","true"); };
    modal.addEventListener("click", e=>{ if(e.target===modal){ modal.classList.remove("show"); modal.setAttribute("aria-hidden","true"); } });
  }
}

function Stars(n){ return "⭐".repeat(Math.max(0,n)); }

function renderLeaderboard(){
  // device-only leaderboard (optional)
  view.innerHTML = `
  <div class="card">
    <div class="h1">ตารางจัดอันดับ (ภายในอุปกรณ์)</div>
    <div class="sep"></div>
    <div class="help">* รุ่นออนไลน์มินิมอลยังไม่รวมอันดับกลางระบบ</div>
    <a class="btn" href="#/home">กลับหน้าแรก</a>
  </div>`;
}

function renderGeneralSelect(){
  view.innerHTML = `
    <div class="card">
      <div class="h1">โหมดทั่วไป — เลือกระดับความยาก</div>
      <div class="sep"></div>
      <div class="grid grid-2">
        <button class="btn" id="g-easy">ง่าย</button>
        <button class="btn" id="g-medium">ปานกลาง</button>
        <button class="btn" id="g-hard">ยาก</button>
        <button class="btn danger" id="g-hell">นรก 🔥</button>
      </div>
      <div class="sep"></div>
      <div class="help">* นรก: ยากมากจนแทบเป็นไปไม่ได้ แต่ยังมีโอกาสชนะ</div>
      <div class="sep"></div>
      <a class="btn" href="#/home">กลับหน้าแรก</a>
    </div>`;
  $('#g-easy').onclick   = ()=> startGame({ mode:"general", diff:"easy" });
  $('#g-medium').onclick = ()=> startGame({ mode:"general", diff:"medium" });
  $('#g-hard').onclick   = ()=> startGame({ mode:"general", diff:"hard" });
  $('#g-hell').onclick   = ()=> startGame({ mode:"general", diff:"hell" });
}

async function renderRankedIntro(){
  const me = await api_me();
  if(!me){ location.hash="#/login"; return renderLogin(); }
  const tier = me.tier, stars = me.stars, cfg = tierCfg(tier);
  view.innerHTML = `
    <div class="card" style="max-width:760px;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div>
          <div class="h1">โหมดแรงค์</div>
          <div class="help">แรงค์ปัจจุบันของคุณ</div>
        </div>
        <a class="btn" href="#/home">กลับหน้าแรก</a>
      </div>
      <div class="sep"></div>
      <div class="grid">
        <div class="badge">Tier: <b>Tier ${tier}</b></div>
        <div class="badge">Stars: <b>${Stars(stars)}${tier<3?" / ⭐⭐⭐":""}</b></div>
        <div class="badge">เป้าหมาย: <b>${cfg.label}</b></div>
      </div>
      <div class="sep"></div>
      <div class="grid grid-2">
        <div class="note">ชนะหนึ่งครั้ง = +1 ดาว (Tier1–2 ครบ 3 ดาว ⇒ เลื่อน Tier, Tier3 สะสมดาวได้)</div>
        <div class="note">พารามิเตอร์ความยาก: ความเร็วพื้นฐาน ~ ${cfg.speed}px/s, อัตราเกิด ~ ${cfg.spawnMs} ms, เพิ่มความเร็ว ~ ${cfg.accel}/s</div>
      </div>
      <div class="sep"></div>
      <div class="center">
        <button class="btn primary" id="btn-start-ranked">เริ่มเกม</button>
      </div>
    </div>`;
  $('#btn-start-ranked').onclick=()=> startGame({ mode:"ranked" });
}

/** Sprites (pixel) */
function makeSprites(){
  const mk = (w,h,draw)=>{ const c=document.createElement("canvas"); c.width=w; c.height=h; const g=c.getContext("2d"); g.imageSmoothingEnabled=false; draw(g); return c; };
  const truck = mk(32,48, g=>{
    g.fillStyle="#3b3b3b"; g.fillRect(0,0,32,48);
    g.fillStyle="#8b5cf6"; g.fillRect(2,2,28,44);
    g.fillStyle="#0f172a"; g.fillRect(2,38,6,6); g.fillRect(24,38,6,6);
    g.fillStyle="#93c5fd"; g.fillRect(6,6,20,10);
    g.fillStyle="#a78bfa"; g.fillRect(4,18,24,18);
    g.fillStyle="#f59e0b"; g.fillRect(12,40,8,4);
  });
  const tree = mk(32,32, g=>{
    g.fillStyle="#0b3d2d"; g.fillRect(10,20,12,10);
    g.fillStyle="#115e3b"; g.fillRect(8,8,16,16);
    g.fillStyle="#22c55e"; g.fillRect(6,10,20,12);
    g.fillStyle="#6b421c"; g.fillRect(12,20,8,10);
  });
  const sign = mk(20,28, g=>{
    g.fillStyle="#0f172a"; g.fillRect(0,0,20,28);
    g.fillStyle="#fef3c7"; g.fillRect(2,2,16,16);
    g.fillStyle="#111827"; g.fillRect(9,18,2,8);
    g.fillStyle="#ef4444"; g.fillRect(6,6,8,8);
  });
  return { truck, tree, sign };
}
const SPRITE_META = {
  truck: { drawW:32, drawH:48, hitW:26, hitH:44 },
  tree:  { drawW:32, drawH:32, hitW:24, hitH:28 },
  sign:  { drawW:20, drawH:28, hitW:16, hitH:26 },
};

/** Game */
let raf=0;
function startGame({ mode, diff }){
  const sClick=$('#sfx-click'), sWin=$('#sfx-win'), sLose=$('#sfx-lose');
  view.innerHTML = `
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div class="h1">${mode==="ranked"?"โหมดแรงค์":"โหมดทั่วไป"} — Dodge</div>
        <div class="help">${mode==="ranked" ? "เป้า: อยู่รอดตาม Tier" : "โหมดทั่วไป • "+(generalCfg(diff||'easy').label)}</div>
      </div>
      <div>
        <button class="btn" id="btn-mute">ปิด/เปิดเสียง</button>
        <a class="btn" href="#/home">ออกเกม</a>
      </div>
    </div>
    <div class="sep"></div>
    <div class="canvas-wrap">
      <div id="overlay" class="overlay">Loading...</div>
      <div class="hud">
        <div class="pill" id="pill-rank">Tier ?</div>
        <div class="pill" id="hud">เวลา 0.0s • คะแนน 0</div>
      </div>
      <canvas id="game" width="960" height="540"></canvas>
      <div class="ctrls">
        <button id="btn-left">⟵</button>
        <button id="btn-right">⟶</button>
      </div>
    </div>
  </div>`;

  let muted=false; $('#btn-mute').onclick=()=>{ muted=!muted; [sClick,sWin,sLose].forEach(a=>a.muted=muted); };
  const cvs=$('#game'), ctx=cvs.getContext('2d');
  const keys=new Set();
  $('#btn-left').ontouchstart=()=>keys.add("ArrowLeft"); $('#btn-left').ontouchend=()=>keys.delete("ArrowLeft");
  $('#btn-right').ontouchstart=()=>keys.add("ArrowRight"); $('#btn-right').ontouchend=()=>keys.delete("ArrowRight");
  window.onkeydown = e=>{ if(["ArrowLeft","ArrowRight","a","d","A","D"].includes(e.key)) e.preventDefault(); keys.add(e.key); };
  window.onkeyup = e=>{ keys.delete(e.key); };

  const SPRITES = makeSprites();
  const overlay=$('#overlay');

  const state = {
    active:false, over:false,
    t:0, score:0,
    car:{ x:cvs.width/2, y:cvs.height-72, w:26, h:40 },
    obs:[], lastSpawn:0, spawnMs: 700,
    baseSpeed: 180, accel: 8,
    mode, tier:1, targetMs:25000
  };

  (async () => {
    if(mode==="ranked"){
      const me = await api_me();
      state.tier = me?.tier || 1;
      const cfg = tierCfg(state.tier);
      state.spawnMs = cfg.spawnMs; state.baseSpeed = cfg.speed; state.accel = cfg.accel; state.targetMs = cfg.targetMs;
      $('#pill-rank').textContent = `Tier ${state.tier}`;
    }else{
      const g = generalCfg(diff||'easy');
      state.spawnMs = g.spawnMs; state.baseSpeed = g.speed; state.accel = g.accel; state.targetMs = g.targetMs;
      $('#pill-rank').textContent = `ทั่วไป`;
    }
  })();

  setTimeout(()=>{
    let count=3; overlay.textContent="3";
    const timer=setInterval(()=>{
      count--; overlay.textContent = count>0? String(count): "Start";
      if(count<=0){ clearInterval(timer); setTimeout(()=>{ overlay.remove(); state.active=true; }, 400); }
    },1000);
  }, 200);

  function spawnWave(){
    const margin = 120;
    const roadW = cvs.width - margin*2;
    const gapMin = 48;
    const pieces = 5;
    const gapIndex = Math.floor(Math.random()*pieces);
    let xCursor = margin;
    const yStart = -40;
    for(let i=0;i<pieces;i++){
      const remain = margin + roadW - xCursor;
      const avg = Math.max(40, Math.floor(remain / (pieces - i)));
      const jitter = Math.floor(avg * 0.35);
      let segW = Math.max(30, Math.min(remain - (pieces-i-1)*30, avg + (Math.random()*2-1)*jitter));
      if(i===gapIndex){ segW = Math.max(segW, gapMin); xCursor += segW; continue; }
      const r = Math.random();
      const type = r < 0.45 ? "truck" : (r < 0.75 ? "tree" : "sign");
      const meta = SPRITE_META[type];
      const pad = 6;
      const xMin = xCursor + pad;
      const xMax = xCursor + max1(segW - meta.hitW - pad) + xCursor;
      const x = clamp(Math.floor(xMin + Math.random() * max1(xMax - xMin)), margin, margin + roadW - meta.hitW);
      state.obs.push({ type, x, y: yStart - Math.floor(Math.random()*18), w: meta.hitW, h: meta.hitH, drawW: meta.drawW, drawH: meta.drawH });
      xCursor += segW;
    }
  }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function max1(v){ return Math.max(1, v); }

  function update(dt){
    if(state.over || !state.active) return;
    state.t += dt; state.score += dt*0.01;
    let vx=0; const mv=240;
    if(keys.has("ArrowLeft")||keys.has("a")||keys.has("A")) vx=-mv;
    if(keys.has("ArrowRight")||keys.has("d")||keys.has("D")) vx=mv;
    state.car.x = clamp(state.car.x + vx*dt/1000, 110, cvs.width-110);

    const now=performance.now();
    if(now - state.lastSpawn >= state.spawnMs + ((Math.random()-0.5)*120)){ state.lastSpawn=now; spawnWave(); }
    const spd = state.baseSpeed + state.accel*(state.t/1000);
    for(const o of state.obs){ o.y += spd*dt/1000; }
    state.obs = state.obs.filter(o=>o.y < cvs.height+60);

    for(const o of state.obs){ if(hit(state.car,o)){ end(false); return; } }
    if(state.t >= state.targetMs){ end(true); return; }
    $('#hud').textContent = `เวลา ${(state.t/1000).toFixed(1)}s • คะแนน ${Math.floor(state.score)}`;
  }

  function hit(a,b){ return !(a.x+a.w < b.x || a.x > b.x+b.w || a.y+a.h < b.y || a.y > b.y+b.h); }

  function draw(){
    ctx.fillStyle="#0b1220"; ctx.fillRect(0,0,cvs.width,cvs.height);
    for(let i=0;i<5;i++){ const x=((i*180 + (state.t*0.12))%(cvs.width+220))-220; cloud(Math.round(x), 80+(i%2?-14:12)); }
    const margin=100, roadW=cvs.width-margin*2;
    ctx.fillStyle="#1f3323"; ctx.fillRect(0,0,cvs.width,cvs.height);
    ctx.fillStyle="black"; ctx.fillRect(margin-10,0,roadW+20,cvs.height);
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--road') || "#263541";
    ctx.fillRect(margin,0,roadW,cvs.height);
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--lane') || "#facc15";
    const d=14,g=18, offset= - ((state.t*0.18)%(d+g));
    for(let l=1;l<3;l++){ const x=Math.round(margin + l*(roadW/3)); for(let y=offset;y<cvs.height;y+=d+g){ ctx.fillRect(x-2,y,d,4);}}
    drawCar(ctx, state.car.x, state.car.y, state.car.w, 40, "#22c55e");
    for(const o of state.obs){
      const sp = SPRITES[o.type];
      if(sp){ ctx.imageSmoothingEnabled=false; ctx.drawImage(sp, Math.round(o.x - (o.drawW - o.w)/2), Math.round(o.y - (o.drawH - o.h)/2), o.drawW, o.drawH); }
      else{ ctx.fillStyle="#ef4444"; ctx.fillRect(o.x,o.y,o.w,o.h); }
    }
    ctx.fillStyle="#1b2c20"; ctx.fillRect(0,0,cvs.width,26); ctx.fillRect(0,cvs.height-26,cvs.width,26);
  }
  function cloud(x,y){ const g=cvs.getContext('2d'); g.fillStyle="#fff"; for(let i=0;i<6;i++){ g.fillRect(x+i*12,y,12,8); g.fillRect(x+i*12,y+8,12,8);} g.fillRect(x+12,y-8,48,8); }
  function drawCar(ctx,x,y,w,h,color){ x=Math.round(x); y=Math.round(y); ctx.save(); ctx.translate(x-w/2,y-h/2);
    ctx.fillStyle="#0b3d2d"; ctx.fillRect(1,1,w-2,h-2); ctx.fillStyle=color; ctx.fillRect(2,2,w-4,h-4);
    ctx.fillStyle="#0f172a"; ctx.fillRect(2,h-6,6,4); ctx.fillRect(w-8,h-6,6,4);
    ctx.fillStyle="#93c5fd"; ctx.fillRect(w/2-4,2,8,6); ctx.restore(); }

  function end(win){
    if(state.over) return; state.over=true; cancelAnimationFrame(raf); window.onkeydown=null; window.onkeyup=null;
    const sWin=$('#sfx-win'), sLose=$('#sfx-lose'); if(!(muted)) (win?sWin:sLose).play();
    (async () => {
      const me = await api_me();
      // Save device-only bests
      if(me){
        const stats = loadStats(me.username);
        stats.dodge.bestTimeMs = Math.max(stats.dodge.bestTimeMs||0, Math.floor(state.t));
        stats.dodge.bestScore  = Math.max(stats.dodge.bestScore||0, Math.floor(state.score));
        saveStats(me.username, stats);
      }
      // Ranked win => update on server
      if(state.mode==="ranked" && win){
        try{ await api_win(); }catch(e){ console.error('win update failed', e); }
      }
      const me2 = await api_me();
      view.innerHTML = `
      <div class="card center" style="max-width:560px;margin:0 auto;">
        <div class="h1 ${win?'win':'lose'}">${win? "ผ่านเป้าหมาย!":"ชนแล้ว!"}</div>
        <div class="sep"></div>
        <div class="badge">เวลา: <b>${(state.t/1000).toFixed(1)}s</b></div>
        <div class="badge">คะแนน: <b>${Math.floor(state.score)}</b></div>
        ${state.mode==="ranked" && win && me2 ? `<div class="sep"></div><div class="note">แรงค์ตอนนี้: <b>Tier ${me2.tier}</b> • ${"⭐".repeat(me2.stars)}${me2.tier<3?" / ⭐⭐⭐":""}</div>` : ""}
        <div class="sep"></div>
        <div style="display:flex;gap:8px;justify-content:center;">
          <button class="btn primary" id="btn-retry">เล่นอีกครั้ง</button>
          <a class="btn" href="#/home">กลับหน้าแรก</a>
        </div>
      </div>`;
      $('#btn-retry').onclick=()=>startGame({ mode: state.mode, diff });
    })();
  }

  let last=performance.now();
  function frame(now){ const dt=now-last; last=now; update(dt); draw(); raf=requestAnimationFrame(frame); }
  raf=requestAnimationFrame(frame);
}

function tierCfg(t){
  if(t===1) return { targetMs: 25000, spawnMs: 700, speed: 180, accel: 8,  label:"อยู่รอด ≥ 25s" };
  if(t===2) return { targetMs: 30000, spawnMs: 620, speed: 210, accel: 10, label:"อยู่รอด ≥ 30s" };
  return        { targetMs: 35000, spawnMs: 540, speed: 240, accel: 12, label:"อยู่รอด ≥ 35s" };
}
function generalCfg(diff){
  if(diff==="easy")   return { targetMs: 15000, spawnMs: 820, speed: 160, accel: 6,  label:"อยู่รอด ≥ 15s" };
  if(diff==="medium") return { targetMs: 25000, spawnMs: 680, speed: 190, accel: 9,  label:"อยู่รอด ≥ 25s" };
  if(diff==="hard")   return { targetMs: 35000, spawnMs: 540, speed: 230, accel: 12, label:"อยู่รอด ≥ 35s" };
  return              { targetMs: 60000, spawnMs: 380, speed: 320, accel: 22, label:"อยู่รอด ≥ 60s (โหดสุด)" };
}

/** Router */
async function route(){
  try{
    await renderNav();
    const hash=location.hash || "#/login";
    if(hash.startsWith("#/login")) return renderLogin();
    if(hash.startsWith("#/home"))  return await renderHome();
    if(hash.startsWith("#/leaderboard")) return renderLeaderboard();
    if(hash.startsWith("#/general")) return renderGeneralSelect();
    if(hash.startsWith("#/ranked")) return await renderRankedIntro();
    location.hash = "#/login"; return renderLogin();
  }catch(e){
    console.error(e);
    location.hash = "#/login"; renderLogin();
  }
}
window.addEventListener("hashchange", route);
document.addEventListener("DOMContentLoaded", route);
})(); // IIFE
