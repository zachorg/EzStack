# EzStack SDK (JavaScript/TypeScript)

A lightweight, typed SDK for EzStack APIs. Similar to Stripe's client, it handles auth headers and request shaping so you can focus on your app.

## Install

```bash
npm install @ezstack/sdk
# or
pnpm add @ezstack/sdk
```

## Quickstart

```ts
import EzStack from '@ezstack/sdk';

const ez = new EzStack({
  apiKey: process.env.EZSTACK_API_KEY!,
});

// EzAuth OTP
const send = await ez.ezauth.otp.send({ destination: '4155551212', channel: 'sms' });
const verify = await ez.ezauth.otp.verify(send.requestId, '1234');
```

## Configuration
- apiKey: Required. Sent as `eza-api-key` header.

## Node/Edge support
The SDK uses the global `fetch`. In Node 18+ it's built-in. For older Node, polyfill `fetch`.

## Runtime examples

### Node.js (ESM)
```ts
import EzStack from 'ezstack/';

const ez = new EzStack({ apiKey: process.env.EZSTACK_API_KEY! });
```

### Node.js (CommonJS)
```js
const EzStack = require('ezstack');
const ez = new EzStack({apiKey: process.env.EZSTACK_API_KEY });
```

### Edge/Deno/Workers
```ts
import EzStack from 'ezstack';
// Ensure fetch is available in your runtime (it is on most edge runtimes)
const ez = new EzStack({ apiKey: EZSTACK_API_KEY });
const send = await ez.ezauth.otp.send({ destination: '4155551212', channel: 'sms' });
```

## Security notes
- Never expose your server API key to browsers. Use the SDK on the server (Next.js API routes, Node backend, workers) when calling privileged endpoints.
- If you need end-user calls from the browser, mint scoped keys or proxy via your backend.
