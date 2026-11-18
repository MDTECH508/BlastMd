/**
 * BLAST MD — Backend Server
 * Powered by BLAST Technology
 * 
 * Sèvè sa a:
 * - Jenere kòd pè (pairing code) pou WhatsApp via Baileys
 * - Kenbe yon lis sesyon an memwa
 * - Bay statistik an dirèk (total ak aktif)
 * - Pèmèt sipresyon sesyon
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require('@whiskeysockets/baileys');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// JESYON SESYON
// ============================================================

/**
 * Map pou kenbe sesyon yo:
 * key   = nimewo telefon (san siy +)
 * value = { sock, createdAt, active }
 */
const sessions = new Map();

// Asire w dosye sessions/ la egziste
const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

/**
 * Kalkile statistik yo soti nan Map la (reyèl, pa fo chif)
 */
function getStats() {
  let total = sessions.size;
  let active = 0;
  for (const s of sessions.values()) {
    if (s.active) active++;
  }
  return {
    total,
    active,
    servers: 1, // Chanje sa si w gen plizyè sèvè
  };
}

// ============================================================
// WOUT: PAIRING CODE
// ============================================================

app.post('/api/pair', async (req, res) => {
  const { phone } = req.body;

  // Validasyon nimewo a
  if (!phone || typeof phone !== 'string' || phone.length < 7) {
    return res.status(400).json({ error: 'Nimewo a pa valab. Antre kòd peyi a ak nimewo a.' });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 7) {
    return res.status(400).json({ error: 'Nimewo a pa valab.' });
  }

  // Si sesyon an deja egziste, pa kreye l ankò
  if (sessions.has(cleanPhone)) {
    return res.status(400).json({
      error: 'Sesyon sa a deja egziste. Siprime l anvan w eseye ankò.',
    });
  }

  try {
    // Prepare dosye otantifikasyon pou nimewo sa a
    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(SESSIONS_DIR, cleanPhone)
    );
    const { version } = await fetchLatestBaileysVersion();

    // Kreye socket la
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['BLAST MD', 'Chrome', '1.0.0'],
    });

    // Sere kredansyèl yo chak fwa yo chanje
    sock.ev.on('creds.update', saveCreds);

    // Anrejistre sesyon an nan Map la
    sessions.set(cleanPhone, {
      sock,
      createdAt: new Date().toISOString(),
      active: false, // Ap vin true lè koneksyon an louvri
    });

    // Koute chanjman koneksyon
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        const s = sessions.get(cleanPhone);
        if (s) s.active = true;
        console.log(`[+] Sesyon ${cleanPhone} konekte.`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          console.log(`[!] Sesyon ${cleanPhone} dekonekte. Ap eseye rekonekte...`);
        } else {
          // Moun nan dekonekte l nan WhatsApp — nou siprime sesyon an
          console.log(`[-] Sesyon ${cleanPhone} dekonekte nèt. Sipresyon...`);
          try {
            await sock.logout().catch(() => {});
            sock.end(undefined);
          } catch (_) {}
          sessions.delete(cleanPhone);
          // Retire dosye sesyon an
          const dir = path.join(SESSIONS_DIR, cleanPhone);
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
          }
        }
      }
    });

    // Mande kòd pè a
    const code = await sock.requestPairingCode(cleanPhone);
    console.log(`[+] Kòd pè jenere pou ${cleanPhone}: ${code}`);

    return res.json({ code });
  } catch (err) {
    console.error('[!] Erè pandan pairing:', err);
    // Netwaye si gen yon erè
    sessions.delete(cleanPhone);
    return res.status(500).json({
      error: 'Pa ka jenere kòd la. Eseye ankò.',
    });
  }
});

// ============================================================
// WOUT: LIS SESYON
// ============================================================

app.get('/api/sessions', (req, res) => {
  const list = [];
  for (const [phone, data] of sessions.entries()) {
    list.push({
      phone,
      createdAt: data.createdAt,
      active: data.active,
    });
  }
  // Triye: pi nouvo an premye
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

// ============================================================
// WOUT: SIPRESYON SESYON
// ============================================================

app.delete('/api/sessions/:phone', async (req, res) => {
  const phone = req.params.phone.replace(/\D/g, '');

  if (!sessions.has(phone)) {
    return res.status(404).json({ error: 'Sesyon sa a pa egziste.' });
  }

  try {
    const session = sessions.get(phone);

    // Fèmen socket la
    if (session.sock) {
      try {
        await session.sock.logout().catch(() => {});
        session.sock.end(undefined);
      } catch (_) {}
    }

    // Retire nan Map la
    sessions.delete(phone);

    // Retire dosye sesyon an
    const dir = path.join(SESSIONS_DIR, phone);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    console.log(`[-] Sesyon ${phone} siprime.`);
    return res.json({ success: true });
  } catch (err) {
    console.error('[!] Erè pandan sipresyon:', err);
    return res.status(500).json({ error: 'Pa ka siprime sesyon an.' });
  }
});

// ============================================================
// WOUT: STATS
// ============================================================

app.get('/api/stats', (req, res) => {
  res.json(getStats());
});

// ============================================================
// LANSMAN SÈVÈ A
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('========================================');
  console.log(`  BLAST MD ap kouri sou pò ${PORT}`);
  console.log(`  Powered by BLAST Technology`);
  console.log('========================================');
});

// Jere erè ki pa kaptire yo
process.on('uncaughtException', (err) => {
  console.error('[!] Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[!] Unhandled Rejection:', err);
});
