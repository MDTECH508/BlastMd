// ================= BLAST MD - RAILWAY FINAL =================
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const NodeCache = require('node-cache');
const msgRetryCounterCache = new NodeCache();

const app = express();
const PORT = process.env.PORT || 3000;
const PREFIX = '.';
const CHANNEL = 'https://whatsapp.com/channel/0029Vb...'; // METE LINK CHANNEL OU A LA

// RAILWAY: Itilize Volume si l egziste, sinon sessions nòmal
const sessionsDir = process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'sessions') : path.join(__dirname, 'sessions');
if(!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, {recursive:true});

const sockets = new Map();
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const cleanNumber = (n) => (n||'').replace(/[^0-9]/g,'');

// ================= SESSION - RAILWAY =================
async function createSession(number){
  const sessionPath = path.join(sessionsDir, number);

  // Si session an kraze, efase l otomatikman
  try{
    const credsPath = path.join(sessionPath, 'creds.json');
    if(fs.existsSync(credsPath)){
      const raw = fs.readFileSync(credsPath, 'utf8');
      const data = JSON.parse(raw);
      if(!data || (Object.keys(data).length < 3 && !data.me)){
        console.log('[SESSION] Session kraze pou +'+number+' - ap efase l');
        fs.rmSync(sessionPath, {recursive:true, force:true});
      }
    }
  }catch(e){
    console.log('[SESSION] creds.json kraze - ap efase session +'+number);
    try{ fs.rmSync(sessionPath, {recursive:true, force:true}); }catch(err){}
  }

  if(!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, {recursive:true});
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    version,
    logger: pino({level:'silent'}),
    printQRInTerminal: false,
    // RAILWAY: Montre BLAST MD, pa Chrome
    browser: ["Windows", "BLAST MD", "1.0.0"],
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:"fatal"}).child({level:"fatal"})) },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    getMessage: async()=>({conversation:""}),
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
    msgRetryCounterCache,
  });

  sockets.set(number, sock);
  sock.ev.on('creds.update', saveCreds);

  // ================= MESAJ =================
  sock.ev.on('messages.upsert', async ({messages, type})=>{
    if(type !== 'notify') return;
    const m = messages[0];
    if(!m.message || m.key.fromMe) return;
    const jid = m.key.remoteJid;
    const text = (m.message.conversation || m.message.extendedTextMessage?.text || '').trim();
    if(!text.startsWith(PREFIX)) return;
    const cmd = text.slice(1).split(' ')[0].toLowerCase();
    const reply = async(t)=>{ await sock.sendMessage(jid, {text:t}, {quoted:m}); };

    if(cmd === 'menu' || cmd === 'help'){
      await reply(
`⚡ *BLAST MD - MENU* ⚡

👋 Bonjou! Bot la konekte epi ap mache nòmal.

*📌 KÒMAND:*
${PREFIX}menu - Wè meni sa a
${PREFIX}ping - Tcheke vitès bot la
${PREFIX}alive - Bot la ap viv?

📢 *Channel:*
${CHANNEL}

Mèsi paske ou chwazi BLAST! ⚡`);
    }
    if(cmd === 'ping'){
      const start = Date.now();
      await reply(`🏓 Pong! ${Date.now()-start}ms ⚡`);
    }
    if(cmd === 'alive'){
      await reply(`✅ BLAST BOT ap viv! 🟢\n⏰ ${new Date().toLocaleString()}\n📱 +${number}`);
    }
  });

  // ================= KONEKSYON =================
  sock.ev.on('connection.update', async (s)=>{
    const { connection, lastDisconnect, qr } = s;
    if(qr) sock.lastQR = qr;

    if(connection === 'open'){
      console.log('✅ BLAST BOT CONNECTED +'+number+' - BLAST MD - Active - Session OK');
      try{
        const me = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        await sock.sendMessage(me, {text:
`⚡ *BLAST BOT CONNECTED* ✅

Thanks for used BLAST BOT 🙏
Bot la konekte sou nimewo sa a epi li ap mache nòmal.

📱 Number: +${number}
🌐 Browser: BLAST MD (Windows)
🟢 Status: Active / Online 24/7
💾 Session: Saved ✅
⏰ ${new Date().toLocaleString()}

Voye *${PREFIX}menu* pou kòmanse.

📢 *Follow Channel nou an:*
${CHANNEL}

Mèsi paske ou chwazi BLAST! ⚡`
        });
      }catch(e){}
    }

    if(connection === 'close'){
      const code = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || '';
      console.log('❌ Koneksyon fèmen +'+number+' code:'+code+' - '+reason);

      const isLoggedOut = code === DisconnectReason.loggedOut || code === 401 || reason.includes('logged out') || reason.includes('Session');
      if(isLoggedOut){
        console.log('[SESSION] Session kraze - ap efase l pou +'+number);
        sockets.delete(number);
        try{ fs.rmSync(sessionPath, {recursive:true, force:true}); }catch(e){}
        return;
      }
      if(state.creds.registered){
        console.log('🔄 Rekonekte +'+number);
        sockets.delete(number);
        await delay(5000);
        await createSession(number);
      } else {
        console.log('⏳ Session +'+number+' ap tann KEY / QR');
      }
    }
  });

  return sock;
}

// ================= PAJ LA =================
app.get('/', (req,res)=>{
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>BLAST MD - Pair</title>
  <style>body{background:#0b0f14;color:#fff;font-family:sans-serif;display:flex;justify-content:center;padding:20px} .box{background:#151b23;padding:24px;border-radius:18px;width:100%;max-width:380px;text-align:center} h1{color:#00ff88} input{width:100%;padding:14px;border-radius:12px;border:1px solid #333;background:#0b0f14;color:#fff;font-size:16px;margin:10px 0;box-sizing:border-box} .btn{width:100%;padding:14px;border:none;border-radius:12px;background:#00ff88;color:#000;font-weight:bold;font-size:16px;cursor:pointer;margin-top:8px} .btn2{background:#25D366} .link{color:#888;font-size:12px;text-decoration:underline;cursor:pointer;background:none;border:none;margin-top:10px} #status{margin-top:12px;color:#00ff88;word-break:break-all} #codeBox{display:none;background:#fff;color:#000;padding:16px;border-radius:12px;margin-top:14px} #code{font-size:32px;font-weight:bold;letter-spacing:4px} #qrBox{display:none;background:#fff;padding:14px;border-radius:14px;margin-top:14px}</style></head>
  <body><div class="box"><h1>⚡ BLAST MD</h1><p style="color:#aaa">Pair WhatsApp Bot ou a - Railway</p>
  <input id="num" placeholder="Ex: 50934946793" inputmode="numeric">
  <button class="btn" onclick="getPair()">Get Pairing Code</button>
  <button class="btn btn2" onclick="getQR()">📷 Eskane QR Code</button>
  <button class="link" onclick="resetSession()">KEY pa mache? Klike la pou reset epi eseye ankò</button>
  <div id="status"></div>
  <div id="codeBox"><div style="font-size:12px;color:#666">KEY OU A:</div><div id="code"></div><div style="font-size:12px;color:#666;margin-top:8px">Mete l nan WhatsApp → Linked Devices → Link with phone number</div></div>
  <div id="qrBox"><div id="qrImg"></div><p style="color:#000;font-size:12px">Eskane QR sa a ak WhatsApp → Linked Devices → Link a device</p></div>
  </div>
  <script>
  async function getPair(){
    let num=document.getElementById('num').value.replace(/[^0-9]/g,'');
    if(num.length<8) return alert('Antre yon bon nimewo ak code peyi');
    document.getElementById('status').innerText='Ap genere KEY... tann 10 segond (Railway pran ti tan)';
    let r=await fetch('/pair?number='+num); let d=await r.json();
    if(d.error){ document.getElementById('status').innerText=d.error; return; }
    document.getElementById('codeBox').style.display='block';
    document.getElementById('code').innerText=d.code;
    document.getElementById('status').innerText='✅ KEY VALIDE! Mete l nan 15 segond!';
  }
  async function getQR(){
    let num=document.getElementById('num').value.replace(/[^0-9]/g,'');
    if(num.length<8) return alert('Antre nimewo a dabò');
    document.getElementById('qrBox').style.display='block';
    document.getElementById('qrImg').innerHTML='Ap genere QR...';
    let r=await fetch('/qr?number='+num); let d=await r.json();
    if(d.connected) return alert('Deja konekte!');
    if(d.qr) document.getElementById('qrImg').innerHTML='<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data='+encodeURIComponent(d.qr)+'" style="width:220px;height:220px">';
    else document.getElementById('qrImg').innerHTML='Ap tann... peze ankò nan 5 segond';
  }
  async function resetSession(){
    let num=document.getElementById('num').value.replace(/[^0-9]/g,'');
    if(!num) return alert('Antre nimewo a dabò');
    let r=await fetch('/reset?number='+num); let d=await r.json();
    alert(d.msg);
    document.getElementById('status').innerText='Session efase! Pran nouvo KEY kounye a.';
  }
  </script></body></html>`);
});

// ================= PAIR - KEY - RAILWAY OPTIMIZE =================
app.get('/pair', async (req,res)=>{
  let number = cleanNumber(req.query.number);
  if(!number || number.length < 8) return res.json({error:'Antre yon bon nimewo ak code peyi'});

  let oldSock = sockets.get(number);
  if(oldSock && !oldSock.user){
    try{ oldSock.ws?.close(); }catch(e){}
    sockets.delete(number);
    try{ fs.rmSync(path.join(sessionsDir, number), {recursive:true, force:true}); }catch(e){}
    console.log('[PAIR] Ansyen session efase pou +'+number);
    await delay(2000);
  }

  try{
    console.log('[PAIR] Ap kreye session FRE pou +'+number+' - Railway');
    let sock = await createSession(number);
    await delay(6000);
    if(sock.user) return res.json({error:'Nimewo sa a deja konekte! Voye .menu sou WhatsApp.'});

    let code = null;
    // RAILWAY: Eseye 5 fwa, ak plis tan ant chak eseye
    for(let i=0; i<5; i++){
      try{
        console.log('[PAIR] Ap mande KEY eseye '+(i+1)+'/5 pou +'+number);
        code = await sock.requestPairingCode(number);
        if(code) break;
      }catch(e){
        console.log('[PAIR] Echek '+(i+1)+':', e.message);
        await delay(4000);
      }
    }
    if(!code){
      sockets.delete(number);
      try{ fs.rmSync(path.join(sessionsDir, number), {recursive:true, force:true}); }catch(e){}
      return res.json({error:'WhatsApp pa bay KEY. Tann 10 minit epi eseye ankò. Eseye QR a.'});
    }
    let cleanCode = code.replace(/[^A-Z0-9]/gi,'').toUpperCase();
    let displayCode = cleanCode.match(/.{1,4}/g).join(" - ");
    console.log('✅ KEY VALIDE:', displayCode, 'pou +'+number);
    res.json({code: displayCode, raw: cleanCode, number});
  }catch(e){
    console.log('Pair error:', e.message);
    res.json({error:'Tann 15 segond epi eseye ankò. '+e.message});
  }
});

// ================= QR =================
app.get('/qr', async (req,res)=>{
  let number = cleanNumber(req.query.number);
  if(!number) return res.json({error:'Antre nimewo'});
  let sock = sockets.get(number);
  if(!sock) sock = await createSession(number);
  await delay(2000);
  if(sock.user) return res.json({connected:true});
  if(sock.lastQR) return res.json({qr: sock.lastQR});
  res.json({waiting:true});
});

// ================= RESET =================
app.get('/reset', (req,res)=>{
  let number = cleanNumber(req.query.number);
  let sock = sockets.get(number);
  try{ sock?.ws?.close(); }catch(e){}
  sockets.delete(number);
  try{ fs.rmSync(path.join(sessionsDir, number), {recursive:true, force:true}); }catch(e){}
  console.log('[RESET] Session efase pou +'+number);
  res.json({success:true, msg:'Session efase pou +'+number+'. Pran nouvo KEY kounye a.'});
});

app.get('/health', (req,res)=>res.json({status:'ok', connected: sockets.size}));

// ================= START - RAILWAY =================
app.listen(PORT, '0.0.0.0', ()=>{
  console.log(`⚡ BLAST MD ap mache sou port ${PORT} - Railway`);
  console.log(`🌐 Louvri paj la pou pair`);
});
