#!/usr/bin/env node
// Minimal OTE (email code) e2e tester
// Usage: node scripts/test-ote.mjs [--base http://localhost:8080]
//        [--api-key YOUR_API_KEY] or [--id-token YOUR_FIREBASE_ID_TOKEN]
//        [--tenant t1] [--email user@example.com]
//        [--idem-key your-key] [--idem-via header|body] [--code 123456] [--resend true]

import { setTimeout as sleep } from 'node:timers/promises';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import fs from 'node:fs';

const argv2 = process.argv.slice(2);
const args = new Map(
  argv2
    .map((a, i, arr) => (a.startsWith('--') ? [a.replace(/^--/, ''), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true'] : []))
    .filter(Boolean)
);

// Default to EzAuth service port from docker-compose (host 8081 -> container 8080)
const isInDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true';
const defaultBase = isInDocker ? 'http://ezauth:8080' : 'http://localhost:8081';
const base = args.get('base') || process.env.BASE_URL || defaultBase;
let apiKey = args.get('api-key') || process.env.EZAUTH_API_KEY;
const idToken = args.get('id-token') || process.env.FIREBASE_ID_TOKEN;
// Fallback: if npm passed only a positional value, treat first non-flag as api key
if (!apiKey && !idToken) {
  const firstPositional = argv2.find((t) => !t.startsWith('--'));
  if (firstPositional) {
    apiKey = firstPositional;
    console.warn('[warn] Using first positional argument as api key. Prefer --api-key <key>.');
  }
}
if (!apiKey && !idToken) {
  console.error('Missing credentials. Provide --api-key or --id-token.');
  process.exit(2);
}
const tenantId = args.get('tenant') || undefined;
const email = args.get('email') || 'user@example.com';
const maxRetries = Number(args.get('max-retries') || 3);
const codeArg = args.get('code');
const doResend = (args.get('resend') || 'false') !== 'false';

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
  if (/destination rate limit/i.test(bodyText || '')) return 60;
  return 10;
}

async function sendOte() {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(`${base}/v1/ote/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { 'x-ezauth-key': apiKey } : {}),
        ...(idToken ? { 'authorization': `Bearer ${idToken}` } : {}),
        ...(idemKey && idemVia === 'header' ? { 'Idempotency-Key': idemKey } : {})
      },
      body: JSON.stringify({
        email,
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

async function verifyOte(requestId, code) {
  const res = await fetch(`${base}/v1/ote/verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { 'x-ezauth-key': apiKey } : {}),
      ...(idToken ? { 'authorization': `Bearer ${idToken}` } : {})
    },
    body: JSON.stringify({ requestId, code })
  });
  if (!res.ok) throw new Error(`verify failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function resendOte(requestId) {
  const res = await fetch(`${base}/v1/ote/resend`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { 'x-ezauth-key': apiKey } : {}),
      ...(idToken ? { 'authorization': `Bearer ${idToken}` } : {})
    },
    body: JSON.stringify({ requestId })
  });
  return res;
}

async function promptForCode(promptText = 'Enter OTE code: ') {
  const rl = readline.createInterface({ input, output });
  const entered = await rl.question(promptText);
  rl.close();
  return entered.trim();
}

async function main() {
  console.log(`Base: ${base}`);
  console.log(`Tenant: ${tenantId}  Email: ${email}`);
  const sendRes = await sendOte();
  const requestId = sendRes.requestId;
  console.log(`Sent. requestId=${requestId}`);

  if (idemKey) {
    const sendRes2 = await sendOte();
    const requestId2 = sendRes2.requestId;
    console.log(`Second send with same idempotency key. requestId=${requestId2}`);
    if (requestId2 !== requestId) {
      throw new Error('Idempotency check failed: requestId differs between identical sends');
    } else {
      console.log('Idempotency check passed: same requestId on repeat send.');
    }
  }

  let code = codeArg;
  if (!code) {
    console.log('Check your email inbox for the verification code.');
    code = await promptForCode();
  }

  console.log(`Verifying code=${code} ...`);
  const verifyRes = await verifyOte(requestId, code);
  console.log('Verify response:', verifyRes);

  if (doResend) {
    console.log('Testing resend flow...');
    const r1 = await resendOte(requestId);
    if (!r1.ok) {
      console.log(`Resend failed with status ${r1.status}. Skipping resend verify.`);
      return;
    }
    console.log('Resent. Please check your email for a new code.');
    const newCode = await promptForCode('Enter new OTE code: ');
    const vr = await verifyOte(requestId, newCode);
    console.log('Verify after resend:', vr);
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});


