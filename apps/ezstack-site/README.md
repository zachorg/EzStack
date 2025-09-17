EzStack Console: Frontend for EzStack OTP/OTE and future modules.

Quickstart

1. Set environment variables:

   - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Optional external API base: `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://127.0.0.1:4000`)

2. Run the dev server:

```bash
npm run dev
```

3. In the app:

   - Sign in at `/login`, then go to `/api-keys` to generate an API key. Keys are displayed once and not stored in plaintext.
   - Configure your project in `/settings` as needed.

Implementation notes

- Auth is handled via Supabase cookies. Use `@/lib/supabase/server` in route handlers and server components, and `@/lib/supabase/client` in the browser.
- API key routes under `src/app/api/keys/route.ts` proxy to `NEXT_PUBLIC_API_BASE_URL` and forward `Authorization: Bearer <Supabase access token>`.
- Rate-limit headers like `Retry-After` and `X-RateLimit-Reset` from the external API should be surfaced by the proxy for UX.

Adding a product tile

1. Edit `src/lib/products.ts` and add a new object to `productTiles`.
2. Provide: `slug`, `title`, `status`, `description`, `bullets`, `icon`, and links.
3. The `BentoGrid` reads this array and renders cards automatically; layout spans can be set via `span`.

Stripe (optional)

- Set `STRIPE_SECRET_KEY` and plan price IDs:
  - `PLAN_PRO_PRICE_ID`
  - `PLAN_SCALE_PRICE_ID`
- Go to `/plans` and select a paid plan to open Stripe Checkout.
