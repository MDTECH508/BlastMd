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
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

const sockets = new Map();

function getStats(){
  let files = [];
  try{ files = fs.readdirSync(sessionsDir); }catch(e){}
  return { total: files.length, active: sockets.size };
}

function cleanNumber(raw){
  let n = (raw||'').replace(/[^0-9]/g,'');
  if(n.startsWith('0')) n = n.slice(1);
  if(n.length === 8) n = '509' + n;
  return n;
}

// ============ PAJ LA ============
app.get('/', (req,res)=>{
  const s = getStats();
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>BLAST MD</title>
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Arial}body{background:#0a0a0f;color:#fff}.top{display:flex;align-items:center;gap:10px;padding:14px 16px}.logo{width:38px;height:38px;background:#1e40af;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}.top h1{font-size:17px;line-height:1.1}.top span{font-size:11px;color:#888;font-weight:400}.box{max-width:500px;margin:0 auto;padding:16px}.badges{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:14px 0}.badge{background:#1a1a22;border:1px solid #2a2a35;padding:8px 14px;border-radius:100px;font-size:12px}.card{background:#13131a;border:1px solid #22222e;border-radius:20px;padding:20px;margin-bottom:14px}.stats{display:flex;gap:12px}.stat{flex:1;background:#1a1a22;padding:16px;border-radius:16px}.stat span{font-size:12px;color:#888}.stat b{font-size:30px;display:block;margin-top:6px}.stat.green b{color:#00e676}h2{font-size:19px;margin-bottom:6px}.desc{font-size:13px;color:#999;line-height:1.5;margin-bottom:14px}.input{display:flex;background:#fff;border-radius:8px;overflow:hidden;margin-bottom:12px}.input span{background:#eee;color:#000;padding:15px 10px}.input input{flex:1;border:none;outline:none;padding:15px;font-size:16px}.btn{width:100%;background:#3b82f6;color:#fff;border:none;padding:15px;border-radius:10px;font-weight:700;font-size:16px;cursor:pointer}.btn:disabled{opacity:.6}#code{font-size:36px;font-weight:900;letter-spacing:6px;text-align:center;margin:16px 0}.actions{display:flex;gap:10px}.icon{width:38px;height:38px;background:#1e1e28;border:1px solid #333;color:#fff;border-radius:10px;cursor:pointer}.steps{font-size:13px;color:#aaa;line-height:1.8;margin-top:14px}.foot{text-align:center;font-size:11px;color:#555;margin-top:16px}#status{font-size:13px;margin-top:10px;min-height:18px}</style></head><body>
<div class="top"><div class="logo">⚡</div><h1>BLAST MD<span>Workspace - v2.0.0</span></h1></div>
<div class="box"><div class="badges"><div class="badge">Node.js · Baileys</div><div class="badge">Multi-session</div><div class="badge">by <b>BLAST TECHNOLOGY</b></div></div>
<div class="card"><div class="stats"><div class="stat"><span>Total sessions</span><b id="t">${s.total}</b></div><div class="stat green"><span>Active sessions</span><b id="a">${s.active}</b></div></div></div>
<div class="card"><h2>Link a WhatsApp number</h2><p class="desc">Enter ANY number with country code. Example: Haiti 50934946793, USA 15551234567</p>
<div class="input"><span>+</span><input id="num" type="tel" placeholder="50934946793"></div>
<button class="btn" id="btn" onclick="getCode()">Get pairing code</button><p id="status"></p>
<div id="codeBox" style="display:none"><div id="code">--------</div><div class="actions"><button class="icon" onclick="getCode()">↻</button><button class="icon" onclick="copyCode()">📋</button></div></div>
<div class="steps"><b>1.</b> Open WhatsApp<br><b>2.</b> Settings → Linked Devices → Link a device<br><b>3.</b> Tap "Link with phone number instead" and enter code</div></div>
<p class="foot">© 2026 BLAST TECHNOLOGY - BLAST MD</p></div>
<script>
async function refresh(){try{let r=await fetch('/stats');let d=await r.json();document.getElementById('t').innerText=d.total;document.getElementById('a').innerText=d.active}catch(e){}}
setInterval(refresh,5000);
async function getCode(){
 let num=document.getElementById('num').value.replace(/[^0-9]/g,'');
 let st=document.getElementById('status'),btn=document.getElementById('btn');
 if(num.length<8){st.innerText='Antre yon bon nimewo. Eg: 50934946793';return;}
 btn.disabled=true;btn.innerText='Generating...';st.style.color='#fff';st.innerText='Ap genere code pou +'+num+'... tann 10 segond';
 try{let r=await fetch('/pair?number='+num);let d=await r.json();
  if(d.code){document.getElementById('codeBox').style.display='block';document.getElementById('code').innerText=d.code;st.style.color='#7dffb0';st.innerText='Code pare! Antre l nan WhatsApp.';refresh();}
  else{st.style.color='#ffb3b3';st.innerText=d.error;}
 }catch(e){st.innerText='Erè. Eseye ankò.';}
 btn.disabled=false;btn.innerText='Get pairing code';
}
function copyCode(){let c=document.getElementById('code').innerText;navigator.clipboard.writeText(c.replace(/ /g,'').replace(/-/g,''));alert('Kopye: '+c);}
</script></body></html>`);
});

app.get('/stats', (req,res)=> res.json(getStats()));

app.get('/pair', async (req,res)=>{
  let number = cleanNumber(req.query.number);
  if(!number || number.length < 8) return res.json({error:'Antre yon bon nimewo'});
  try{
    let sock = sockets.get(number);
    if(!sock) sock = await createSession(number);
    if(sock.user) return res.json({error:'Nimewo sa a deja konekte! Voye .menu sou WhatsApp.'});
    let code = await sock.requestPairingCode(number);
    code = code.match(/.{1,4}/g).join(" - ");
    console.log('CODE:', code, 'pou', number);
    res.json({code});
  }catch(e){
    console.log('Pair error:', e.message);
    res.json({error:'Tann 10 segond epi eseye ankò. '+e.message});
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=> console.log('BLAST MD ap mache sou port '+PORT));

// ============ BOT LA ============
async function createSession(number){
  const sessionPath = path.join(sessionsDir, number);
  if(!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, {recursive:true});
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const sock = makeWASocket({
    version,
    logger: pino({level:'silent'}),
    printQRInTerminal: false,
    browser: ["Ubuntu","Chrome","20.0.04"],
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:"fatal"}).child({level:"fatal"})) },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    getMessage: async()=>({conversation:""}),
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

      if(cmd === 'menu' || cmd === 'help'){
        await sock.sendMessage(from, {text: `╭━━━〔 *BLAST MD* 〕━━━\n┃ Owner: BLAST TECHNOLOGY\n┃ Prefix: ${PREFIX}\n┃ Status: Online ✅\n╰━━━━━━━━━━\n\n*📋 MAIN*\n${PREFIX}menu - Meni\n${PREFIX}info - Info\n${PREFIX}ping - Vitès\n${PREFIX}owner - Mèt bot la\n\n*🛒 SERVICES*\n${PREFIX}price - Pri\n${PREFIX}order - Kòmande\n${PREFIX}website - Kòmande website\n${PREFIX}bot - Kòmande bot\n\n*👥 GROUP*\n${PREFIX}tagall - Tag tout moun\n\n👑 https://wa.me/${OWNER}`});
      }
      else if(cmd === 'info'){
        await sock.sendMessage(from, {text: `*BLAST MD*\nOwner: BLAST TECHNOLOGY\nPrefix: ${PREFIX}\nUptime: ${Math.floor(process.uptime()/60)} min\nStatus: Online ✅`});
      }
      else if(cmd === 'ping'){
        const s = Date.now();
        await sock.sendMessage(from, {text:'🏓 Pinging...'});
        await sock.sendMessage(from, {text:`🏓 PONG! ${Date.now()-s}ms ✅`});
      }
      else if(cmd === 'owner'){
        await sock.sendMessage(from, {text:`👑 BLAST TECHNOLOGY\nhttps://wa.me/${OWNER}`});
      }
      else if(cmd === 'price'){
        await sock.sendMessage(from, {text:`💰 *PRICE LIST*\n\n🌐 Website: Kontakte nou\n🤖 Bot WhatsApp: Kontakte nou\n\n👑 https://wa.me/${OWNER}`});
      }
      else if(cmd === 'order'){
        await sock.sendMessage(from, {text:`🛒 *ORDER*\nVoye sa ou vle kòmande a.\n👑 https://wa.me/${OWNER}`});
      }
      else if(cmd === 'website'){
        await sock.sendMessage(from, {text:`🌐 *ORDER WEBSITE*\n👑 https://wa.me/${OWNER}?text=Hello, I want a website`});
      }
      else if(cmd === 'bot'){
        await sock.sendMessage(from, {text:`🤖 *ORDER BOT*\n👑 https://wa.me/${OWNER}?text=Hello, I want a WhatsApp Bot`});
      }
      else if(cmd === 'tagall' && from.endsWith('@g.us')){
        try{
          const m = await sock.groupMetadata(from);
          const p = m.participants.map(x=>x.id);
          await sock.sendMessage(from, {text:`📢 *TAG ALL*\n\n${p.map(x=>'@'+x.split('@')[0]).join('\n')}\n\nTotal: ${p.length}`, mentions:p});
        }catch(e){ await sock.sendMessage(from, {text:'❌ Fè bot la admin dabò.'}); }
      }
    }catch(e){ console.log('Msg error:', e.message); }
  });

  sock.ev.on('connection.update', async (s)=>{
    const { connection, lastDisconnect } = s;
    if(connection === 'open'){
      console.log('✅ CONNECTED +'+number);
      try{
        const me = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        await sock.sendMessage(me, {text:`🤖 BLAST MD Connected!\n✅ Online 24/7\n\nVoye ${PREFIX}menu pou kòmanse`});
      }catch(e){}
    }
    if(connection === 'close'){
      const code = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = code === DisconnectReason.loggedOut || code === 401;
      if(isLoggedOut){
        console.log('Logged out +'+number);
        sockets.delete(number);
        try{ fs.rmSync(sessionPath, {recursive:true, force:true}); }catch(e){}
        return;
      }
      // Si li te deja konekte, rekonekte l
      if(state.creds.registered){
        console.log('🔄 Rekonekte +'+number);
        sockets.delete(number);
        await delay(5000);
        await createSession(number);
      }
    }
  });
  return sock;
}

// Rekonekte ansyen sessions yo
(async ()=>{
  try{
    const dirs = fs.readdirSync(sessionsDir);
    for(let d of dirs){ if(/^\d+$/.test(d)){ await createSession(d); await delay(1000); } }
  }catch(e){}
})();

process.on('uncaughtException', e=> console.log('Err:', e.message));
process.on('unhandledRejection', e=> console.log('Err:', e.message));
