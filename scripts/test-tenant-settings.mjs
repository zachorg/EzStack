#!/usr/bin/env node
// Per-tenant settings tester
//
// Usage examples:
//   node scripts/test-tenant-settings.mjs --tenant t1 \
//     --base http://localhost:8080 --api-key dev-secret \
//     --redis redis://localhost:6379 \
//     --otp-length 4 --resend 5 --dest-per-minute 2 --route-per-minute 10
//
// This will:
// 1) Write tenant settings to Redis: OTP length, resend cooldown, dest and route limits
// 2) Test:
//    - OTP length (parsing from docker compose logs if available) and verification path
//    - Resend cooldown enforcement
//    - Destination-per-minute rate limit
// 3) Update settings to test route rate limit in isolation (raises route limit test)
//
import Redis from 'ioredis';
import { spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

// --- Args ---
const argsArr = process.argv.slice(2);
const args = new Map(
  argsArr.map((a, i, arr) => (a.startsWith('--') ? [a.replace(/^--/, ''), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true'] : [])).filter(Boolean)
);

const base = args.get('base') || process.env.BASE_URL || 'http://localhost:8080';
const apiKey = args.get('api-key') || process.env.EZAUTH_API_KEY || 'dev-secret';
const tenantId = args.get('tenant') || 't1';
const redisUrl = args.get('redis') || process.env.REDIS_URL || 'redis://localhost:6379';

const otpLength = Number(args.get('otp-length') || 4);
const resendSec = Number(args.get('resend') || 5);
const destPerMinute = Number(args.get('dest-per-minute') || 2);
const routePerMinute = Number(args.get('route-per-minute') || 10);

const destBase = args.get('destination') || '+15555550123';
const channel = args.get('channel') || 'sms';

function dockerAvailable() {
  const r = spawnSync('docker', ['--version'], { encoding: 'utf8' });
  return r.status === 0;
}

function dockerLogsSince(service, since = '2m') {
  const r = spawnSync('docker', ['compose', 'logs', '--no-color', '--since', since, service], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout : '';
}

function parseOtpFromLine(line, requestId) {
  try {
    const obj = JSON.parse(line);
    if ((obj.requestId === requestId || (obj.req && obj.req.id === requestId)) && obj.otp) return String(obj.otp);
    if (obj.msg && typeof obj.msg === 'string' && obj.msg.includes('OTP generated') && obj.requestId === requestId && obj.otp) return String(obj.otp);
  } catch {}
  if (line.includes(requestId)) {
    const m = line.match(/\botp\"?[:=]\s*\"?(\d{4,10})\b/i);
    if (m) return m[1];
  }
  return undefined;
}

async function setTenantSettings(redis, settings) {
  const key = `tenant:${tenantId}:settings`;
  await redis.set(key, JSON.stringify(settings));
}

async function sendOtp({ destination }) {
  const res = await fetch(`${base}/otp/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ezauth-key': apiKey },
    body: JSON.stringify({ tenantId, destination, channel })
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`send failed: ${res.status} ${body}`);
  return JSON.parse(body);
}

async function resendOtp({ requestId }) {
  const res = await fetch(`${base}/otp/resend`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ezauth-key': apiKey },
    body: JSON.stringify({ tenantId, requestId })
  });
  return res;
}

async function verifyOtp({ requestId, code }) {
  const res = await fetch(`${base}/otp/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ezauth-key': apiKey },
    body: JSON.stringify({ tenantId, requestId, code })
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`verify failed: ${res.status} ${body}`);
  return JSON.parse(body);
}

async function getOtpFromLogs(requestId) {
  if (!dockerAvailable()) return undefined;
  // Poll a few times for logs to show up
  for (let i = 0; i < 8; i++) {
    const out = dockerLogsSince('api', '3m');
    const lines = out.split(/\r?\n/).reverse();
    for (const line of lines) {
      const code = parseOtpFromLine(line, requestId);
      if (code) return code;
    }
    await sleep(750);
  }
  return undefined;
}

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function main() {
  console.log(`[setup] tenant=${tenantId} base=${base} redis=${redisUrl}`);
  const redis = new Redis(redisUrl);

  // Phase 1: configure all settings as provided
  const phase1 = { OTP_LENGTH: otpLength, RESEND_COOLDOWN_SEC: resendSec, DEST_PER_MINUTE: destPerMinute, RATE_ROUTE_MAX: routePerMinute };
  console.log(`[phase1] writing tenant settings:`, phase1);
  await setTenantSettings(redis, phase1);
  console.log(`[phase1] waiting for cache refresh (6s)...`);
  await sleep(6000);

  // 1) OTP length + verify path
  const destination = destBase;
  const sendRes = await sendOtp({ destination });
  console.log(`[otp] requestId=${sendRes.requestId}`);
  let code = await getOtpFromLogs(sendRes.requestId);
  if (code) {
    console.log(`[otp] captured from logs: ${code}`);
    assert(code.length === otpLength, `expected OTP length ${otpLength}, got ${code.length}`);
    const verifyRes = await verifyOtp({ requestId: sendRes.requestId, code });
    console.log(`[otp] verify response:`, verifyRes);
    assert(verifyRes.verified === true, `verification should succeed for correct code`);
  } else {
    console.warn(`[otp] could not parse OTP from logs. Please check logs manually to confirm length=${otpLength}.`);
  }

  // 2) Resend cooldown
  const first = await resendOtp({ requestId: sendRes.requestId });
  assert(first.ok, `first resend should be 200, got ${first.status}`);
  const second = await resendOtp({ requestId: sendRes.requestId });
  assert(second.status === 429, `second resend should be 429 due to cooldown, got ${second.status}`);
  console.log(`[cooldown] enforced with status 429 as expected`);

  // 3) Destination-per-minute limit
  let okCount = 0, errCount = 0;
  const burst = Math.max(destPerMinute + 2, destPerMinute);
  for (let i = 0; i < burst; i++) {
    try {
      const r = await sendOtp({ destination });
      okCount++;
    } catch (e) {
      errCount++;
    }
  }
  console.log(`[dest-rate] ok=${okCount} errors=${errCount} (limit=${destPerMinute}/min)`);
  assert(errCount > 0, `expected some requests to be rate limited by destination limit`);

  // Phase 2: Route rate limit isolation test
  const phase2 = { RATE_ROUTE_MAX: Math.max(3, Math.min(routePerMinute, 10)), DEST_PER_MINUTE: 9999, OTP_LENGTH: otpLength, RESEND_COOLDOWN_SEC: resendSec };
  console.log(`[phase2] writing tenant settings:`, phase2);
  await setTenantSettings(redis, phase2);
  console.log(`[phase2] waiting for cache refresh (6s)...`);
  await sleep(6000);

  let routeOk = 0, routeErr = 0;
  const maxRoute = phase2.RATE_ROUTE_MAX;
  for (let i = 0; i < maxRoute + 3; i++) {
    try {
      const r = await sendOtp({ destination: `${destBase}-${i}` });
      routeOk++;
    } catch (e) {
      routeErr++;
    }
  }
  console.log(`[route-rate] ok=${routeOk} errors=${routeErr} (limit=${maxRoute}/min)`);
  assert(routeErr > 0, `expected some requests to be rate limited by route limit`);

  await redis.quit();
  console.log('All checks completed.');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});


