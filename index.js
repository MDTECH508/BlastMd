const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, delay } = require("@whiskeysockets/baileys");

const app = express();
app.use(express.json());
const BOT_NAME = "BLAST MD";
const OWNER = "50934946793";
const PREFIX = ".";
const CHANNEL = "https://whatsapp.com/channel/0029Vb6tw1G42Dcja42wiY3R";
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });
const sockets = new Map();

function getStats(){ let f=[]; try{f=fs.readdirSync(sessionsDir);}catch(e){} return {total:f.length, active:sockets.size}; }
function cleanNumber(raw){ let n=(raw||'').replace(/[^0-9]/g,''); if(n.startsWith('0')) n=n.slice(1); if(n.length===8) n='509'+n; return n; }

const ICON = {
  bolt: `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="#fff"/></svg>`,
  phone: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  refresh: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  copy: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00e676" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`
};

app.get('/', (req,res)=>{
  const s = getStats();
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>BLAST MD</title>
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Arial}body{background:#07070c;color:#fff}.top{display:flex;align-items:center;gap:12px;padding:16px}.logo{width:42px;height:42px;background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:12px;display:flex;align-items:center;justify-content:center}.top h1{font-size:18px;line-height:1.1}.top span{font-size:11px;color:#888;font-weight:400}.box{max-width:520px;margin:0 auto;padding:0 16px 40px}.card{background:#121218;border:1px solid #20202a;border-radius:24px;padding:20px;margin-bottom:14px}.stats{display:flex;gap:12px}.stat{flex:1;background:#1a1a22;border-radius:18px;padding:18px 14px}.stat span{font-size:12px;color:#888}.stat b{font-size:34px;display:block;margin-top:8px}.stat.green b{color:#00e676}h2{font-size:20px;margin-bottom:6px;display:flex;gap:8px;align-items:center}.desc{font-size:13px;color:#999;line-height:1.5;margin-bottom:16px}.input{display:flex;background:#fff;border-radius:10px;overflow:hidden;margin-bottom:12px}.input span{background:#f0f0f0;color:#000;padding:16px 12px;font-weight:700}.input input{flex:1;border:none;outline:none;padding:16px;font-size:16px}.btn{width:100%;background:#3b82f6;color:#fff;border:none;padding:15px;border-radius:12px;font-weight:700;font-size:16px;cursor:pointer;display:flex;gap:8px;justify-content:center;align-items:center}.btn:disabled{opacity:.6}.code-wrap{text-align:center;padding:18px 0 6px}#code{font-size:38px;font-weight:900;letter-spacing:8px}.actions{display:flex;gap:10px;margin-top:12px}.icon-btn{width:40px;height:40px;background:#1e1e28;border:1px solid #2e2e3a;color:#fff;border-radius:11px;cursor:pointer;display:flex;align-items:center;justify-content:center}.steps{font-size:13px;color:#aaa;line-height:2;margin-top:14px}.foot{text-align:center;font-size:11px;color:#555;margin-top:18px}#status{font-size:13px;margin-top:10px;min-height:18px;text-align:center}.timer{font-size:12px;color:#ffb020;margin-top:6px;font-weight:700}</style></head><body>
<div class="top"><div class="logo">${ICON.bolt}</div><h1>BLAST MD<span>Workspace - v2.0.0</span></h1></div>
<div class="box"><div class="card"><div class="stats"><div class="stat"><span>Total sessions</span><b id="t">${s.total}</b></div><div class="stat green"><span>Active sessions</span><b id="a">${s.active}</b></div></div></div>
<div class="card"><h2>${ICON.phone} Link a WhatsApp number</h2><p class="desc">Antre nimewo a, pran CODE a, mete l <b>TOUSWIT</b> nan WhatsApp - CODE a ekspire nan 30 segond.</p>
<div class="input"><span>+</span><input id="num" type="tel" placeholder="50934946793"></div>
<button class="btn" id="btn" onclick="getCode()">${ICON.phone} Get pairing code</button><p id="status"></p>
<div class="code-wrap" id="codeBox" style="display:none"><div style="color:#00e676;font-size:13px;display:flex;gap:6px;justify-content:center;align-items:center">${ICON.check} Code pare!</div><div id="code">--------</div><div class="timer" id="timer"></div><div class="actions"><button class="icon-btn" onclick="getCode()">${ICON.refresh}</button><button class="icon-btn" onclick="copyCode()">${ICON.copy}</button></div></div>
<div class="steps"><b>1.</b> Louvri WhatsApp → Settings → Linked Devices<br><b>2.</b> Peze <b>Link a device</b><br><b>3.</b> Peze <b>"Link with phone number instead"</b><br><b>4.</b> Mete CODE a <b>TOUSWIT</b> - pa tann!</div></div>
<p class="foot">© 2026 BLAST TECHNOLOGY - BLAST MD</p></div>
<script>
let countdown;
async function refresh(){try{let r=await fetch('/stats');let d=await r.json();document.getElementById('t').innerText=d.total;document.getElementById('a').innerText=d.active}catch(e){}}
setInterval(refresh,5000);
async function getCode(){
 let num=document.getElementById('num').value.replace(/[^0-9]/g,'');
 let st=document.getElementById('status'),btn=document.getElementById('btn');
 if(num.length<8){st.style.color='#ff6b6b';st.innerText='Antre yon bon nimewo. Eg: 50934946793';return;}
 clearInterval(countdown);
 btn.disabled=true;btn.innerText='Generating...';st.style.color='#fff';st.innerText='Ap genere code pou +'+num+'...';
 try{let r=await fetch('/pair?number='+num);let d=await r.json();
  if(d.code){
    document.getElementById('codeBox').style.display='block';document.getElementById('code').innerText=d.code;
    st.style.color='#7dffb0';st.innerText='CODE PARE! Mete l TOUSWIT nan WhatsApp!';
    let sec=30; document.getElementById('timer').innerText='⏳ CODE a ekspire nan '+sec+' segond';
    countdown=setInterval(()=>{ sec--; document.getElementById('timer').innerText='⏳ CODE a ekspire nan '+sec+' segond'; if(sec<=0){ clearInterval(countdown); document.getElementById('timer').innerText='❌ CODE ekspire! Peze ↻ pou nouvo CODE'; st.style.color='#ffb3b3'; st.innerText='CODE ekspire, pran yon nouvo CODE'; } },1000);
    refresh();
  } else { st.style.color='#ffb3b3'; st.innerText=d.error; }
 }catch(e){ st.innerText='Erè. Eseye ankò.'; }
 btn.disabled=false;btn.innerHTML='Get pairing code';
}
function copyCode(){let c=document.getElementById('code').innerText;navigator.clipboard.writeText(c.replace(/ /g,'').replace(/-/g,''));alert('Kopye: '+c);}
</script></body></html>`);
});

app.get('/stats', (req,res)=> res.json(getStats()));

// ============ SA A SE PATI KI RANJE A ============
app.get('/pair', async (req,res)=>{
  let number = cleanNumber(req.query.number);
  if(!number || number.length < 8) return res.json({error:'Antre yon bon nimewo ak code peyi'});
  try{
    let sock = sockets.get(number);

    // Si session an te deja egziste men li pa janm konekte, EFASA L pou nou ka fè yon pwòp
    if(sock && !sock.user){
      // Tcheke si session an deja gen creds registered - si non, li bon pou pairing
      // Si li gen pwoblèm, nou efase l epi nou rekree l
      try{ sock.ws?.close(); }catch(e){}
      sockets.delete(number);
      sock = null;
    }
    if(!sock){
      console.log('[PAIR] Kreye nouvo session pou +'+number);
      sock = await createSession(number);
      // *** TAN SOCKET LA PARE - SA A TE MANKE A ***
      await delay(3000);
    }
    if(sock.user) return res.json({error:'Nimewo sa a deja konekte! Voye .menu sou WhatsApp.'});

    // Mande CODE a - eseye 2 fwa si premye a echwe
    let code = null;
    for(let i=0; i<2; i++){
      try{ code = await sock.requestPairingCode(number); if(code) break; }catch(e){ console.log('Retry pairing:', e.message); await delay(2000); }
    }
    if(!code) return res.json({error:'WhatsApp pa bay CODE. Tann 20 segond, peze ↻ ankò.'});
    code = code.match(/.{1,4}/g).join(" - ");
    console.log('✅ CODE:', code, 'pou +'+number);
    res.json({code, number});
  }catch(e){
    console.log('Pair error +'+number+':', e.message);
    // Si erè, efase session an pou moun nan ka re-eseye pwòp
    try{ sockets.delete(number); }catch(err){}
    res.json({error:'Tann 15 segond epi eseye ankò. '+e.message});
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=> console.log('🚀 BLAST MD sou port '+PORT));

async function createSession(number){
  const sessionPath = path.join(sessionsDir, number);
  if(!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, {recursive:true});
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const sock = makeWASocket({
    version,
    logger: pino({level:'silent'}),
    printQRInTerminal: false,
    browser: ["BLAST MD", "Chrome", "20.0.04"],
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:"fatal"}).child({level:"fatal"})) },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    getMessage: async()=>({conversation:""}),
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
  });
  sockets.set(number, sock);
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (u)=>{
    try{
      const mek = u.messages[0];
      if(!mek.message) return;
      if(mek.key.remoteJid === 'status@broadcast') return;
      const from = mek.key.remoteJid;
      const body = mek.message.conversation || mek.message.extendedTextMessage?.text || mek.message.imageMessage?.caption || mek.message.videoMessage?.caption || "";
      if(!body || !body.startsWith(PREFIX)) return;
      const args = body.slice(1).trim().split(/ +/);
      const cmd = args.shift().toLowerCase();
      if(cmd==='menu'||cmd==='help'){ await sock.sendMessage(from, {text:`╭━━━〔 *BLAST MD* 〕━━━\n┃ Owner: BLAST TECHNOLOGY\n┃ Number: +${number}\n┃ Status: Online ✅\n╰━━━━━━\n\n${PREFIX}menu - Meni\n${PREFIX}info - Info\n${PREFIX}ping - Vitès\n${PREFIX}owner - Mèt bot la\n${PREFIX}price - Pri\n${PREFIX}order - Kòmande\n${PREFIX}website - Website\n${PREFIX}bot - Bot\n${PREFIX}tagall - Tag tout\n\n👑 https://wa.me/${OWNER}`}); }
      else if(cmd==='info'){ await sock.sendMessage(from, {text:`*BLAST MD*\nNumber: +${number}\nUptime: ${Math.floor(process.uptime()/60)} min\nStatus: Online ✅`}); }
      else if(cmd==='ping'){ const s=Date.now(); await sock.sendMessage(from, {text:'🏓 Pinging...'}); await sock.sendMessage(from, {text:`🏓 PONG! ${Date.now()-s}ms ✅`}); }
      else if(cmd==='owner'){ await sock.sendMessage(from, {text:`👑 BLAST TECHNOLOGY\nhttps://wa.me/${OWNER}`}); }
      else if(cmd==='price'){ await sock.sendMessage(from, {text:`💰 PRICE\n🌐 Website: Kontakte nou\n🤖 Bot: Kontakte nou\n👑 https://wa.me/${OWNER}`}); }
      else if(cmd==='order'){ await sock.sendMessage(from, {text:`🛒 ORDER\nVoye sa ou vle.\n👑 https://wa.me/${OWNER}`}); }
      else if(cmd==='website'){ await sock.sendMessage(from, {text:`🌐 WEBSITE\n👑 https://wa.me/${OWNER}?text=Hello, I want a website`}); }
      else if(cmd==='bot'){ await sock.sendMessage(from, {text:`🤖 BOT\n👑 https://wa.me/${OWNER}?text=Hello, I want a Bot`}); }
      else if(cmd==='tagall' && from.endsWith('@g.us')){ try{ const m=await sock.groupMetadata(from); const p=m.participants.map(x=>x.id); await sock.sendMessage(from, {text:`📢 TAG ALL\n\n${p.map(x=>'@'+x.split('@')[0]).join('\n')}\n\nTotal: ${p.length}`, mentions:p}); }catch(e){ await sock.sendMessage(from, {text:'❌ Fè bot la admin.'}); } }
    }catch(e){ console.log('Msg error:', e.message); }
  });

  sock.ev.on('connection.update', async (s)=>{
    const { connection, lastDisconnect } = s;
    if(connection === 'open'){
      console.log('✅ CONNECTED +'+number);
      try{
        const me = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        await sock.sendMessage(me, {text:`⚡ *BLAST MD Connected!* ✅\n\n📱 Number: +${number}\n⏰ ${new Date().toLocaleString()}\n🟢 Online 24/7\n\nVoye *${PREFIX}menu* pou kòmanse`});
      }catch(e){}
    }
    if(connection === 'close'){
      const code = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = code === DisconnectReason.loggedOut || code === 401;
      if(isLoggedOut){ console.log('❌ Logged out +'+number); sockets.delete(number); try{ fs.rmSync(sessionPath, {recursive:true, force:true}); }catch(e){} return; }
      if(state.creds.registered){ console.log('🔄 Rekonekte +'+number); sockets.delete(number); await delay(5000); await createSession(number); }
      else { console.log('⏳ Session +'+number+' ap tann CODE'); }
    }
  });
  return sock;
}

(async ()=>{ try{ const dirs=fs.readdirSync(sessionsDir); for(let d of dirs){ if(/^\d+$/.test(d)){ await createSession(d); await delay(1500); } } }catch(e){} })();
process.on('uncaughtException', e=> console.log('Err:', e.message));
process.on('unhandledRejection', e=> console.log('Err:', e.message));
