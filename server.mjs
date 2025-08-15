import 'dotenv/config.js';
import express from "express";
import pg from "pg";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
});
const SESS_SECRET = process.env.SESS_SECRET || crypto.randomBytes(32).toString("hex");
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser(SESS_SECRET));
app.use(express.static(__dirname)); // serve index.html, app.js, style.css, sfx/*

function setSession(res, userId){
  res.cookie("sid", String(userId), { httpOnly:true, sameSite:"lax", signed:true, secure: process.env.COOKIE_SECURE === 'true' });
}
function requireAuth(req,res,next){
  const sid = req.signedCookies?.sid;
  if(!sid) return res.status(401).json({ error:"unauthorized" });
  req.userId = Number(sid); next();
}

app.post("/api/register", async (req,res) => {
  const { username, password } = req.body||{};
  if(!username || !password) return res.status(400).json({ error:"missing" });
  const hash = await bcrypt.hash(password, 10);
  try{
    const q = await pool.query("INSERT INTO users (username, password_hash) VALUES ($1,$2) RETURNING id, username, tier, stars", [username, hash]);
    setSession(res, q.rows[0].id);
    res.json(q.rows[0]);
  }catch(e){
    if(e.code === "23505") return res.status(409).json({ error:"username_taken" });
    console.error(e); res.status(500).json({ error:"server_error" });
  }
});

app.post("/api/login", async (req,res) => {
  const { username, password } = req.body||{};
  const q = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
  const user = q.rows[0];
  if(!user) return res.status(401).json({ error:"invalid" });
  const ok = await bcrypt.compare(password, user.password_hash);
  if(!ok) return res.status(401).json({ error:"invalid" });
  setSession(res, user.id);
  res.json({ id:user.id, username:user.username, tier:user.tier, stars:user.stars });
});

app.post("/api/logout", (req,res)=>{ res.clearCookie("sid"); res.json({ ok:true }); });

app.get("/api/me", requireAuth, async (req,res) => {
  const q = await pool.query("SELECT id, username, tier, stars FROM users WHERE id=$1", [req.userId]);
  res.json(q.rows[0]);
});

app.post("/api/win", requireAuth, async (req,res) => {
  const { rows } = await pool.query("SELECT tier, stars FROM users WHERE id=$1", [req.userId]);
  if(!rows[0]) return res.status(404).json({ error:"not_found" });
  let { tier, stars } = rows[0];
  if(tier < 3){
    stars += 1;
    if(stars >= 3){ tier = Math.min(3, tier+1); stars = (tier===3?0:0); }
  }else{
    stars += 1;
  }
  const up = await pool.query("UPDATE users SET tier=$1, stars=$2 WHERE id=$3 RETURNING tier, stars", [tier, stars, req.userId]);
  res.json(up.rows[0]);
});

// SPA fallback (hash routing means usually not needed, but safe):
app.get("*", (req,res)=> res.sendFile(path.join(__dirname, "index.html")));

app.listen(PORT, () => console.log("Server on http://localhost:"+PORT));
