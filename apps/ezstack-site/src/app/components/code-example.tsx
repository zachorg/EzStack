"use client";

import { useState } from "react";

// Simple tabbed code viewer for hero. No live requests; copy/paste ready.
type TabKey = "curl" | "node" | "python";

const snippets: Record<TabKey, string> = {
  curl: `curl -X POST https://<host>/api/proxy/otp/send \
  -H "content-type: application/json" \
  -H "authorization: Bearer <SUPABASE_ID_TOKEN>" \
  -H "idempotency-key: idem-123" \
  -d '{ "destination":"+15555550123", "channel":"sms" }'`,
  node: `await fetch('https://<host>/api/proxy/otp/send', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: 'Bearer <SUPABASE_ID_TOKEN>',
    'idempotency-key': 'idem-123',
  },
  body: JSON.stringify({ destination: '+15555550123', channel: 'sms' }),
});`,
  python: `import requests

requests.post('https://<host>/api/proxy/otp/send',
  headers={
    'content-type': 'application/json',
    'authorization': 'Bearer <SUPABASE_ID_TOKEN>',
    'idempotency-key': 'idem-123',
  },
  json={ 'destination': '+15555550123', 'channel': 'sms' },
)`,
};

export function CodeExample() {
  const [tab, setTab] = useState<TabKey>("curl");
  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145] bg-background/80 backdrop-blur p-3">
      <div className="flex gap-2 mb-2" role="tablist" aria-label="Code examples">
        {(["curl", "node", "python"] as TabKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            role="tab"
            aria-selected={tab === k}
            className={`px-3 py-1 rounded-md text-sm border focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              tab === k
                ? "bg-foreground text-background border-transparent"
                : "border-black/[.08] dark:border-white/[.145]"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <pre className="text-xs overflow-x-auto p-3 rounded-md bg-black/[.06] dark:bg-white/[.06]">
        <code className="font-mono whitespace-pre-wrap">{snippets[tab]}</code>
      </pre>
    </div>
  );
}


