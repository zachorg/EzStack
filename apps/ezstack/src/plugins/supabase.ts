import fp from "fastify-plugin";
import { createClient } from "@supabase/supabase-js";
import { createRemoteJWKSet, jwtVerify } from "jose";

export default fp(async (app: any) => {
  const url = process.env.SUPABASE_URL!;
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !roleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const supabase = createClient(url, roleKey, { auth: { persistSession: false } });
  app.decorate("supabase", supabase);

  const jwksUrl = (process.env.SUPABASE_JWKS_URL || `${url}/auth/v1/jwks`).trim();
  const JWKS = createRemoteJWKSet(new URL(jwksUrl));

  app.decorate("introspectIdToken", async (token: string) => {
    const { payload } = await jwtVerify(token, JWKS, {});
    const uid = String(payload.sub || "");
    let plan: any;
    let user: any;
    try {
      const { data: u } = await supabase
        .from("users")
        .select("id, status, plan_id, feature_flags")
        .eq("id", uid)
        .maybeSingle();
      if (u) {
        user = { uid: u.id, status: u.status || "active", planId: u.plan_id, featureFlags: u.feature_flags || {} };
        if (u.plan_id) {
          const { data: p } = await supabase
            .from("plans")
            .select("id, name, limits, features")
            .eq("id", u.plan_id)
            .maybeSingle();
          if (p) {
            plan = { planId: p.id, name: p.name, limits: p.limits || {}, features: p.features || {} };
          }
        }
      }
    } catch {}
    return { uid, email: typeof payload.email === "string" ? payload.email : undefined, emailVerified: (payload as any).email_confirmed === true || (payload as any).email_verified === true, user, plan };
  });

  app.decorate("introspectApiKey", async (hash: string) => {
    const { data: key, error } = await supabase
      .from("api_keys")
      .select("id, user_id, tenant_id, status, created_at")
      .eq("hash", hash)
      .maybeSingle();
    if (error || !key) return {};

    const keyDoc = {
      keyId: key.id,
      tenantId: key.tenant_id,
      status: key.status || "active",
      createdAt: key.created_at,
      userId: key.user_id
    } as any;

    let tenant: any;
    if (keyDoc.tenantId) {
      const { data: t } = await supabase
        .from("tenants")
        .select("id, name, status, plan_id, feature_flags")
        .eq("id", keyDoc.tenantId)
        .maybeSingle();
      if (t) {
        tenant = {
          tenantId: t.id,
          name: t.name,
          status: t.status || "active",
          planId: t.plan_id,
          featureFlags: t.feature_flags || {}
        };
      }
    }

    const planId = tenant?.planId || process.env.DEFAULT_PLAN_ID || "free";
    let plan: any = { planId: "free", name: "Free", limits: {}, features: {} };
    const { data: p } = await supabase
      .from("plans")
      .select("id, name, limits, features")
      .eq("id", planId)
      .maybeSingle();
    if (p) {
      plan = { planId: p.id, name: p.name, limits: p.limits || {}, features: p.features || {} };
    }

    return { key: keyDoc, tenant, plan };
  });

  app.decorate("getTenant", async (tenantId: string) => {
    const { data } = await supabase
      .from("tenants")
      .select("id, name, status, plan_id, feature_flags")
      .eq("id", tenantId)
      .maybeSingle();
    if (!data) return undefined;
    return {
      tenantId: data.id,
      name: data.name,
      status: data.status || "active",
      planId: data.plan_id,
      featureFlags: data.feature_flags || {}
    };
  });

  app.decorate("hasTenantRole", async (
    userId: string | undefined,
    tenantId: string | undefined,
    rolesAllowed: Array<"owner" | "admin" | "dev" | "viewer"> = ["owner", "admin", "dev", "viewer"]
  ) => {
    if (!userId || !tenantId) return false;
    const { data } = await supabase
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data && rolesAllowed.includes(String((data as any).role) as any));
  });
});


