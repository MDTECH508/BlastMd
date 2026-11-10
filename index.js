// BLAST SESSION GENERATOR - Pou genere SESSION_ID
import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pino from 'pino';
import NodeCache from 'node-cache';
import { default as makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';

const app = express();
const PORT = process.env.PORT || 3000;
const msgRetryCounterCache = new NodeCache();
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const cleanNumber = (n) => (n||'').replace(/[^0-9]/g,'');

// Kote nou sove session yo tanporèman
const sessionsDir = '/tmp/blast-sessions';
if(!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, {recursive:true});

// Kote nou sove SESSION_ID yo - nan memwa (ou ka mete nan fichye / DB pita)
const sessionStore = new Map(); // SESSION_ID -> { key, iv, data }

// Chiffre session an (AES-256-CBC) - menm jan patnè w la fè l
function encryptSession(creds, syncKeys){
  const key = crypto.randomBytes(32); // 256-bit
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const payload = JSON.stringify({ creds, syncKeys });
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    key: key.toString('hex'),
    iv: iv.toString('hex'),
    data: encrypted
  };
}

const sockets = new Map();

// ================= BEL PAJ LA =================
app.get('/', (req,res)=>{
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BLAST MD - Session Generator</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif}
body{min-height:100vh;background:#070b14;display:flex;justify-content:center;align-items:center;padding:20px}
.card{width:100%;max-width:430px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:28px;padding:32px 26px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.logo{width:78px;height:78px;background:linear-gradient(135deg,#00ff88,#00c3ff);border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:38px;margin:0 auto 14px}
h1{color:#fff;font-size:26px;font-weight:800} h1 span{color:#00ff88}
.sub{color:#aab3c5;font-size:13px;margin:6px 0 20px}
.badge{display:inline-flex;gap:6px;align-items:center;background:rgba(0,255,136,.12);border:1px solid rgba(0,255,136,.3);color:#00ff88;font-size:11px;font-weight:600;padding:6px 12px;border-radius:100px;margin-bottom:20px}
.label{text-align:left;color:#dbe2ef;font-size:12px;font-weight:600;margin-bottom:8px}
.input-wrap{display:flex;gap:8px;background:#0b1120;border:1px solid #1e2a44;border-radius:16px;padding:6px 6px 6px 16px;align-items:center}
.input-wrap span{color:#00ff88;font-weight:700}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:16px;padding:12px 0}
.btn{width:100%;padding:15px;border:none;border-radius:16px;font-weight:700;font-size:15px;cursor:pointer;margin-top:12px}
.btn-green{background
