const fs = require('fs');
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser, jidDecode, delay } = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");
const pino = require("pino");
const readline = require("readline");
const chalk = require("chalk");
const { rmSync } = require('fs');

// ========== WEB SERVER - PAJ PAIRING LA - PORT 8080 ==========
const app = express();
app.use(express.json());
let currentSock = null;

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>BLAST X ENGINE</title>
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}body{background:#050507;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{width:100%;max-width:440px;padding:32px 28px;border-radius:34px;background:linear-gradient(145deg, rgba(255,255,255,.16), rgba(255,255,255,.04) 45%, rgba(255,255,255,.09));backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,.25);text-align:center}.logo{width:64px;height:64px;margin:0 auto 14px;border-radius:20px;background:linear-gradient(145deg, rgba(255,255,255,.3), rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center}h1{font-size:26px;font-weight:900}.owner{color:#b8b8c2;font-size:13px;letter-spacing:2px}.ping-box{display:flex;gap:10px;margin:20px 0}.ping-item{flex:1;padding:12px 8px;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18)}.ping-item b{font-size:15px;display:block}.ping-item span{font-size:11px;color:#aaa}.dot{width:10px;height:10px;background:#00ff88;border-radius:50%;display:inline-block;box-shadow:0 0 12px #00ff88}label{display:block;text-align:left;font-size:13px;color:#c8c8d0;margin:14px 0 8px}.input-wrap{position:relative}.input-wrap span{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:#888}input{width:100%;padding:16px 16px 16px 48px;border-radius:16px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.35);color:#fff;font-size:17px;outline:none}.btn{width:100%;margin-top:18px;padding:17px;border-radius:100px;background:#fff;color:#000;font-weight:900;font-size:16px;border:none;cursor:pointer}.code-box{margin-top:22px;padding:20px;border-radius:20px;background:rgba(0,0,0,.4);border:1px dashed rgba(255,255,255,.35);display:none}.code-box.show{display:block}#code{font-size:36px;font-weight:900;letter-spacing:10px;margin:8px 0}.copy-btn{padding:10px 20px;border-radius:100px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);color:#fff;cursor:pointer;font-weight:700}.steps{text-align:left;margin-top:20px;padding:16px;border-radius:18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);font-size:13px;line-height:1.8;color:#b8b8c2}.channel{margin-top:18px;padding:14px;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);font-size:13px}.channel a{color:#fff;font-weight:700;word-break:break-all}.footer{margin-top:16px;font-size:11px;color:#777}#status{font-size:13px;margin-top:10px;color:#ffb3b3;min-height:18px}</style></head><body>
<div class="card"><div class="logo"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg></div><h1>BLAST X ENGINE</h1><p class="owner">BY BLAST TECHNOLOGY</p><p id="botStatus" style="font-size:12px;color:#7dffb0;margin-top:6px">Bot Status: Checking...</p><div class="ping-box"><div class="ping-item"><b><span class="dot"></span> ONLINE</b><span>STATUS</span></div><div class="ping-item"><b id="ping">-- ms</b><span>PING</span></div><div class="ping-item"><b>24/7</b><span>UPTIME</span></div></div><label>ENTER YOUR WHATSAPP NUMBER</label><div class="input-wrap"><span>+</span><input id="num" type="tel" placeholder="509 3494 6793" /></div><button class="btn" id="btn" onclick="getCode()">GET PAIRING CODE</button><p id="status"></p><div class="code-box" id="codeBox"><span style="font-size:11px;letter-spacing:2px;color:#aaa">YOUR PAIRING KEY</span><div id="code">--------</div><button class="copy-btn" onclick="copyCode()">Copy Key</button><p style="font-size:12px;color:#ffcc00;margin-top:10px">Apre ou mete KEY a, bot la ap konekte pou kont li.</p></div><div class="steps"><b>HOW TO CONNECT:</b><br>1. Mete nimewo → GET PAIRING CODE<br>2. Kopye KEY a<br>3. WhatsApp > Settings > Linked Devices<br>4. Link with phone number → Kole KEY a<br>5. Bot la konekte!</div><div class="channel"><b>JOIN OUR CHANNEL - BLAST TEAM !</b><br><a href="https://whatsapp.com/channel/0029Vb6tw1G42Dcja42wiY3R">BLAST TEAM !</a></div><p class="footer">© 2026 BLAST TECHNOLOGY</p></div>
<script>
async function checkPing(){ let s=Date.now(); try{ let r=await fetch('/ping'); let d=await r.json(); document.getElementById('ping').innerText=(Date.now()-s)+' ms'; document.getElementById('botStatus').innerText='Bot Status: '+(d.connected?'✅ CONNECTED - .menu ap mache':'⏳ AP TANN KONEKSYON - Mete KEY a'); }catch(e){ document.getElementById('ping').innerText='ONLINE'; } }
checkPing(); setInterval(checkPing,5000);
async function getCode(){ let num=document.getElementById('num').value.replace(/[^0-9]/g,''); let status=document.getElementById('status'); let btn=document.getElementById('btn'); if(num.length<10){ status.innerText='Mete nimewo a konsa: 50934946793'; return; } btn.disabled=true; btn.innerText='GENERATING KEY...'; status.style.color='#fff'; status.innerText='Ap jenere KEY... tann 10 segond'; try{ let r=await fetch('/pair?number='+num); let d=await r.json(); if(d.code){ document.getElementById('codeBox').classList.add('show'); document.getElementById('code').innerText=d.code; status.style.color='#7dffb0'; status.innerText='KEY ou pare! Mete l nan WhatsApp.'; } else { status.style.color='#ffb3b3'; status.innerText=d.error||'Echwe.'; } }catch(e){ status.innerText='Erè. Eseye ankò.'; } btn.disabled=false; btn.innerText='GET PAIRING CODE'; }
function copyCode(){ let c=document.getElementById('code').innerText; navigator.clipboard.writeText(c); alert('KEY kopye: '+c); }
</script></body></html>
  `);
});

app.get('/ping', (req, res) => {
  res.json({ status: 'online', connected: currentSock ? true : false, uptime: process.uptime() });
});

app.get('/pair', async (req, res) => {
  let number = (req.query.number || '').replace(/[^0-9]/g, '');
  if (!number) return res.json({ error: 'Mete nimewo' });
  if (number.startsWith('0')) number = number.slice(1);
  if (number.length === 8) number = '509' + number;
  try {
    if (!currentSock) return res.json({ error: 'Bot la ap demare, tann 10 segond epi eseye ankò.' });
    let code = await currentSock.requestPairingCode(number);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log(chalk.bgGreen(' PAIRING KEY: ') + ' ' + code + ' pou ' + number);
    res.json({ code });
  } catch (e) {
    console.log('Pair web error:', e.message);
    res.json({ error: 'Tann 10 segond epi eseye ankò. ' + e.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(chalk.green(`🚀 BLAST Web sou port ${PORT} - http://localhost:${PORT}`)));

// ========== KÒD BOT LA - PA TOUCHE ==========
const store = require('./lib/lightweight_store');
store.readFromFile();
const settings = require('./settings');
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);
setInterval(() => { if (global.gc) global.gc(); }, 60_000);
setInterval(() => {
  const used = process.memoryUsage().rss / 1024 / 1024;
  if (used > 400) { console.log('⚠️ RAM twò wo, restart...'); process.exit(1); }
}, 30_000);
setInterval(() => { console.log('💓 BLAST alive - ' + new Date().toISOString() + ' - Connected: ' + (currentSock ? 'YES' : 'NO')); }, 30000);

let phoneNumber = "50934946793";
let owner = JSON.parse(fs.readFileSync('./data/owner.json'));
global.botname = "BLAST BOT";
global.themeemoji = "•";
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");
const useMobile = process.argv.includes("--mobile");
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;
const question = (text) => rl ? new Promise((resolve) => rl.question(text, resolve)) : Promise.resolve(settings.ownerNumber || phoneNumber);

async function startXeonBotInc() {
  try {
    let { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    const msgRetryCounterCache = new NodeCache();
    const XeonBotInc = makeWASocket({
      version, logger: pino({ level: 'silent' }), printQRInTerminal: !pairingCode,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })) },
      markOnlineOnConnect: true, generateHighQualityLinkPreview: true, syncFullHistory: false,
      getMessage: async (key) => { let jid = jidNormalizedUser(key.remoteJid); let msg = await store.loadMessage(jid, key.id); return msg?.message || ""; },
      msgRetryCounterCache, defaultQueryTimeoutMs: 60000, connectTimeoutMs: 60000, keepAliveIntervalMs: 10000,
    });
    currentSock = XeonBotInc;
    XeonBotInc.ev.on('creds.update', saveCreds);
    store.bind(XeonBotInc.ev);
    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
      try {
        const mek = chatUpdate.messages[0];
        if (!mek.message) return;
        mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
        if (mek.key && mek.key.remoteJid === 'status@broadcast') { await handleStatus(XeonBotInc, chatUpdate); return; }
        if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') { if (!mek.key?.remoteJid?.endsWith('@g.us')) return; }
        if (mek.key?.remoteJid?.endsWith('@g.us') && !mek.key.fromMe) { try { await handleAntibotDetection(XeonBotInc, mek); } catch (e) {} }
        if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
        if (XeonBotInc?.msgRetryCounterCache) XeonBotInc.msgRetryCounterCache.clear();
        await handleMessages(XeonBotInc, chatUpdate, true);
      } catch (err) { console.error("Error in messages.upsert:", err); }
    });
    XeonBotInc.decodeJid = (jid) => { if (!jid) return jid; if (/:\d+@/gi.test(jid)) { let d = jidDecode(jid) || {}; return d.user && d.server && d.user + '@' + d.server || jid; } else return jid; };
    XeonBotInc.ev.on('contacts.update', update => { for (let c of update) { let id = XeonBotInc.decodeJid(c.id); if (store && store.contacts) store.contacts[id] = { id, name: c.notify }; } });
    XeonBotInc.getName = (jid, withoutContact = false) => {
      let id = XeonBotInc.decodeJid(jid); withoutContact = XeonBotInc.withoutContact || withoutContact; let v;
      if (id.endsWith("@g.us")) return new Promise(async (resolve) => { v = store.contacts[id] || {}; if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}; resolve(v.name || v.subject || 'Group'); });
      else v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ? XeonBotInc.user : (store.contacts[id] || {});
      return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || jid;
    };
    XeonBotInc.public = true;
    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store);
    if (pairingCode && !XeonBotInc.authState.creds.registered) {
      if (useMobile) throw new Error('Cannot use pairing code with mobile api');
      let pn = phoneNumber.replace(/[^0-9]/g, '');
      setTimeout(async () => { try { let code = await XeonBotInc.requestPairingCode(pn); code = code?.match(/.{1,4}/g)?.join("-") || code; console.log(chalk.bgGreen(' Your Pairing Code : ') + ' ' + code); } catch (e) { console.error('Pair error:', e.message); } }, 3000);
    }
    XeonBotInc.ev.on('connection.update', async (s) => {
      const { connection, lastDisconnect } = s;
      if (connection === 'open') {
        console.log(chalk.green('🤖 BLAST BOT CONNECTED ✅ - ' + JSON.stringify(XeonBotInc.user, null, 2)));
        try { const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'; await XeonBotInc.sendMessage(botNumber, { text: `🤖 Bot Connected Successfully!\n⏰ ${new Date().toLocaleString()}\n✅ Online 24/7` }); } catch (e) {}
      }
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errMsg = String(lastDisconnect?.error?.message || '');
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        const isConflict = statusCode === DisconnectReason.connectionReplaced || statusCode === 440 || /conflict|replaced/i.test(errMsg);
        currentSock = null;
        if (isConflict) { console.log(chalk.yellow('⚠️ Conflict - Stop lòt instance la')); return; }
        if (isLoggedOut) { try { rmSync('./session', { recursive: true, force: true }); } catch (e) {} return; }
        console.log(chalk.yellow('🔄 RESTART OTOMATIK nan 5 segond...'));
        await delay(5000); startXeonBotInc();
      }
    });
    const antiCallNotified = new Set();
    XeonBotInc.ev.on('call', async (calls) => {
      try {
        const { readState } = require('./commands/anticall'); const st = readState(); if (!st.enabled) return;
        for (const call of calls) { const callerJid = call.from || call.peerJid; if (!callerJid) continue; try { if (typeof XeonBotInc.rejectCall === 'function' && call.id) await XeonBotInc.rejectCall(call.id, callerJid); } catch (e) {} if (!antiCallNotified.has(callerJid)) { antiCallNotified.add(callerJid); setTimeout(() => antiCallNotified.delete(callerJid), 60000); await XeonBotInc.sendMessage(callerJid, { text: '📵 Anticall is enabled.' }); } setTimeout(async () => { try { await XeonBotInc.updateBlockStatus(callerJid, 'block'); } catch (e) {} }, 800); }
      } catch (e) {}
    });
    XeonBotInc.ev.on('group-participants.update', async (u) => { await handleGroupParticipantUpdate(XeonBotInc, u); });
    XeonBotInc.ev.on('messages.upsert', async (m) => { if (m.messages[0].key && m.messages[0].key.remoteJid === 'status@broadcast') await handleStatus(XeonBotInc, m); });
    XeonBotInc.ev.on('status.update', async (s) => { await handleStatus(XeonBotInc, s); });
    XeonBotInc.ev.on('messages.reaction', async (s) => { await handleStatus(XeonBotInc, s); });
    return XeonBotInc;
  } catch (e) { console.error('Error:', e); await delay(5000); startXeonBotInc(); }
}
startXeonBotInc().catch(e => { console.error('Fatal:', e); process.exit(1); });
process.on('uncaughtException', (e) => console.error('Uncaught:', e));
process.on('unhandledRejection', (e) => console.error('Rejection:', e));
let file = require.resolve(__filename);
fs.watchFile(file, () => { fs.unwatchFile(file); console.log(chalk.redBright(`Update ${__filename}`)); delete require.cache[file]; require(file); });
