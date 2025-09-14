# EzStack API - Architecture and Request Flow

This document explains the structure of the API, authentication and authorization, and how the main features connect.

## Overview
- Runtime: Node 20+, Fastify 5 (ESM)
- Entrypoint: `src/index.ts`
- Plugins: Redis, errors, tenant-settings, secrets, Firebase, email, rate-limit, auth, optional SQS
- Routes: `/v1/otp/*`, `/v1/ote/*`, `/v1/apikeys/*`

## Startup
`src/index.ts` registers core plugins, then mounts routes with prefixes and starts the server on PORT (default 8080).

## Auth
Accepted:
- Firebase ID token via `Authorization: Bearer <ID_TOKEN>`
- API key via `x-ezauth-key: <PLAINTEXT_KEY>`

Auth flow:
- Health paths are exempt
- If ID token: verify via Firebase Admin, set `req.userId`, enforce plan RPM if present
- Else API key: hash with pepper for lookup, cache, Firestore introspection, set `req.tenantId` and plan if tenant key, or `req.userId` if user key. For `/v1/otp/*` and `/v1/ote/*`, user keys are rejected (tenant required)

## Firebase Plugin
- Exposes `firestore`
- `introspectApiKey(hash)`: load key, tenant, plan
- `introspectIdToken(idToken)`: verify and load user/plan
- `getTenant(tenantId)`, `hasTenantRole(userId, tenantId, roles)`

## Secrets
- Loads `APIKEY_PEPPER` from GSM or env; required for API key lookup hashing

## API Keys
Paths under `/v1/apikeys`:
- `GET /healthz` -> `{ ok: true }`
- `POST /createApiKey` body: `{ name?, scopes?, tenantId?, demo? }`
  - If `tenantId`: require membership (owner/admin/dev) and tenant active -> create tenant key
  - Else: create user key
  - Key format: `ezk_<26 base32>_<8 base32 checksum>`
  - Store: `keyPrefix`, lookup `hash`, `hashedKey` (argon2id+salt), `status`, metadata; optional `keyMaterialEnc`
  - Response includes plaintext key once
- `GET /listApiKeys` optional `?tenantId=`
  - If tenantId: require membership and list tenant keys
  - Else: list user keys for caller
  - Sorted newest-first in memory
- `POST /revokeApiKey` body `{ id }`
  - If tenant key: require membership (owner/admin)
  - Else: creator-only

## OTP/OTE
- Redis-backed issue/verify with rate limits and idempotency
- Optional SQS fanout
- Requires tenant context: tenant-scoped API key, or ID token with tenant membership (route can read `X-Tenant-Id`)

## Tenant Settings and Plans
- Tenant settings plugin provides per-tenant limits
- Plan enforcement (RPM) via auth plugin when plan present
- Firestore:
  - `tenants/{tenantId}`: `status`, `planId`, `featureFlags`
  - `plans/{planId}`: `limits`, `features`
  - `tenants/{tenantId}/members/{userId}`: `role`

## Errors and CORS
- Errors: `{ error: { message } }` with proper status
- CORS from `CORS_ORIGIN`, allow credentials
- JSON requests with `Content-Type: application/json`

## Environment
- Firebase Admin creds (service account or env trio)
- `APIKEY_PEPPER` (required)
- `PORT`, `CORS_ORIGIN`
- Optional demo encryption: `DEMO_ENCRYPT_ENABLED`, `KMS_KEY_RESOURCE`
- Optional: `AUTH_FAIL_SAFE`, SQS envs

## Firestore Indexes (optional)
- If server-side sorting needed: composite indexes
  - `apiKeys`: `(tenantId ASC, createdAt DESC)`
  - `apiKeys`: `(userId ASC, createdAt DESC)`
