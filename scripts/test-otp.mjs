#!/usr/bin/env node
// Minimal OTP e2e tester
// Usage: node scripts/test-otp.mjs [--base http://localhost:8080] [--api-key dev-secret]

import { spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const args = new Map(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.replace(/^--/, ''), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true'] : []));

const base = args.get('base') || process.env.BASE_URL || 'http://localhost:8080';
const apiKey = args.get('api-key') || process.env.EZAUTH_API_KEY || 'dev-secret';
const tenantId = args.get('tenant') || 't1';
const destination = args.get('destination') || '+15555550123';
const channel = args.get('channel') || 'sms';
const tryLogs = (args.get('from-logs') || 'true') !== 'false';
const maxRetries = Number(args.get('max-retries') || 3);

const idemKey = args.get('idem-key');
const idemVia = args.get('idem-via') || 'header'; // 'header' | 'body'

function computeRetrySeconds(res, bodyText) {
  const headers = res.headers;
  const ra = headers.get('retry-after');
  if (ra) {
    const s = Number(ra);
    if (!Number.isNaN(s) && Number.isFinite(s) && s > 0) return Math.min(s, 3600);
  }
  const reset = headers.get('x-ratelimit-reset') || headers.get('ratelimit-reset');
  if (reset) {
    const n = Number(reset);
    if (!Number.isNaN(n) && Number.isFinite(n)) {
      const nowMs = Date.now();
      // Heuristic: treat big numbers as ms epoch; small as seconds epoch or seconds delta
      let seconds;
      if (n > 1e12) {
        seconds = Math.ceil((n - nowMs) / 1000);
      } else if (n > 1e10) {
        seconds = Math.ceil((n - nowMs) / 1000);
      } else if (n > 10_000_000) {
        seconds = Math.ceil((n * 1000 - nowMs) / 1000);
      } else {
        const nowSec = Math.floor(nowMs / 1000);
        seconds = Math.max(1, n - nowSec);
      }
      if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds, 3600);
    }
  }
  const m = /retry in (\d+)\s*seconds?/i.exec(bodyText || '');
  if (m) return Math.min(Number(m[1]) || 10, 3600);
  if (/destination rate limit/i.test(bodyText || '')) return 60;
  return 10;
}

async function sendOtp() {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(`${base}/otp/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ezauth-key': apiKey,
        ...(idemKey && idemVia === 'header' ? { 'Idempotency-Key': idemKey } : {})
      },
      body: JSON.stringify({
        tenantId,
        destination,
        channel,
        ...(idemKey && idemVia !== 'header' ? { idempotencyKey: idemKey } : {})
      })
    });
    if (res.ok) {
      return res.json();
    }
    const text = await res.text();
    if (res.status === 429 && attempt < maxRetries) {
      const waitSec = computeRetrySeconds(res, text);
      console.log(`Rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Waiting ${waitSec}s then retrying...`);
      await sleep(waitSec * 1000);
      continue;
    }
    throw new Error(`send failed: ${res.status} ${text}`);
  }
}

function parseOtpFromLine(line, requestId) {
  // Try JSON (pino) first
  try {
    const obj = JSON.parse(line);
    if ((obj.requestId === requestId || (obj.req && obj.req.id === requestId)) && obj.otp) return String(obj.otp);
    if (obj.msg && typeof obj.msg === 'string' && obj.msg.includes('OTP generated') && obj.requestId === requestId && obj.otp) return String(obj.otp);
  } catch {}
  // Fallback regex search
  if (line.includes(requestId)) {
    const m = line.match(/\botp\"?[:=]\s*\"?(\d{4,8})\b/i);
    if (m) return m[1];
  }
  return undefined;
}

function dockerAvailable() {
  const r = spawnSync('docker', ['--version'], { encoding: 'utf8' });
  return r.status === 0;
}

function getOtpFromDockerLogs(requestId) {
  const args = ['compose', 'logs', '--no-color', '--since', '2m', 'api'];
  const r = spawnSync('docker', args, { encoding: 'utf8' });
  if (r.status !== 0) return undefined;
  const lines = r.stdout.split(/\r?\n/);
  for (const line of lines.reverse()) {
    const code = parseOtpFromLine(line, requestId);
    if (code) return code;
  }
  return undefined;
}

async function verifyOtp(requestId, code) {
  const res = await fetch(`${base}/otp/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ezauth-key': apiKey },
    body: JSON.stringify({ tenantId, requestId, code })
  });
  if (!res.ok) throw new Error(`verify failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log(`Base: ${base}`);
  console.log(`Tenant: ${tenantId}  Destination: ${destination}  Channel: ${channel}`);
  const sendRes = await sendOtp();
  const requestId = sendRes.requestId;
  console.log(`Sent. requestId=${requestId}`);

  if (idemKey) {
    const sendRes2 = await sendOtp();
    const requestId2 = sendRes2.requestId;
    console.log(`Second send with same idempotency key. requestId=${requestId2}`);
    if (requestId2 !== requestId) {
      throw new Error('Idempotency check failed: requestId differs between identical sends');
    } else {
      console.log('Idempotency check passed: same requestId on repeat send.');
    }
  }

  let otpCode;
  if (tryLogs && dockerAvailable()) {
    // Poll docker logs a few times in case of slight delays
    for (let i = 0; i < 6 && !otpCode; i++) {
      otpCode = getOtpFromDockerLogs(requestId);
      if (!otpCode) await sleep(1000);
    }
  }

  if (!otpCode) {
    console.log('Could not auto-detect OTP from logs.');
    console.log('If SQS is configured, check the SQS message; otherwise check API logs.');
    const rl = readline.createInterface({ input, output });
    const entered = await rl.question('Enter OTP code: ');
    rl.close();
    otpCode = entered.trim();
  }

  console.log(`Verifying code=${otpCode} ...`);
  const verifyRes = await verifyOtp(requestId, otpCode);
  console.log('Verify response:', verifyRes);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});


