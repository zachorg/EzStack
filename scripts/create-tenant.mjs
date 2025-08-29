#!/usr/bin/env node
// Utility to create a tenant and/or API key directly in Firestore
// Usage examples (PowerShell):
//   node scripts/create-tenant.mjs --name "Acme Inc" --plan free
//   node scripts/create-tenant.mjs --tenantId tenant_123 --new-key

import crypto from 'node:crypto';
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function parseArgs() {
  const m = new Map();
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--')) {
      const k = a.replace(/^--/, '');
      const v = (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) ? process.argv[++i] : 'true';
      m.set(k, v);
    }
  }
  return m;
}

function ensureEnv(name) {
  const v = process.env[name];
  if (!v || String(v).length === 0) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return v;
}

function hashApiKey(apiKey, pepper) {
  return crypto.createHash('sha256').update(`${pepper}:${apiKey}`).digest('hex');
}

function generateApiKey() {
  const token = crypto.randomBytes(32).toString('base64url');
  return `ea_live_${token}`;
}

async function initFirebase() {
  if (getApps().length === 0) {
    const pj = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    if (pj && clientEmail && privateKey) {
      initializeApp({ credential: cert({ projectId: pj, clientEmail, privateKey }) });
    } else {
      initializeApp({ credential: applicationDefault() });
    }
  }
  return getFirestore();
}

async function main() {
  const args = parseArgs();
  const pepper = ensureEnv('APIKEY_PEPPER');

  const db = await initFirebase();

  const name = args.get('name');
  const planId = args.get('plan');
  const existingTenantId = args.get('tenantId');
  const onlyNewKey = args.get('new-key') === 'true';

  let tenantId = existingTenantId;

  if (!existingTenantId && !name) {
    console.error('Provide either --tenantId to add a key, or --name to create a tenant.');
    process.exit(1);
  }

  if (!existingTenantId) {
    tenantId = `t_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const tenantDoc = {
      tenantId,
      name,
      status: 'active',
      planId: planId || null,
      featureFlags: { otp: true, ote: true },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.collection('tenants').doc(tenantId).set(tenantDoc);
    console.log(`Created tenant '${name}' with tenantId=${tenantId}`);
  } else if (!onlyNewKey) {
    // Optional: update name/plan if passed alongside tenantId
    const updates = {};
    if (name) updates.name = name;
    if (planId) updates.planId = planId;
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = Date.now();
      await db.collection('tenants').doc(tenantId).set(updates, { merge: true });
      console.log(`Updated tenant ${tenantId} ${JSON.stringify(updates)}`);
    }
  }

  // Create an API key for the tenant
  const apiKey = generateApiKey();
  const hash = hashApiKey(apiKey, pepper);
  const keyId = `k_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const keyDoc = {
    keyId,
    tenantId,
    status: 'active',
    hash,
    createdAt: Date.now()
  };
  await db.collection('apiKeys').doc(keyId).set(keyDoc);

  console.log('---');
  console.log('Save this API key now; it will not be shown again:');
  console.log(`tenantId=${tenantId}`);
  console.log(`apiKey=${apiKey}`);
  console.log('---');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});


