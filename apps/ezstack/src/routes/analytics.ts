import type { FastifyPluginAsync } from "fastify";
// import { verifySchema } from "../schemas/otp.js";
import { hashApiKey } from "../utils/crypto.js";
import { EzAuthAnalyticsRequest } from "../__generated__/requestTypes.js";
import { EzAuthAnalyticsResponse } from "../__generated__/responseTypes.js";

export const kSendOtpUsageByProject = (
  apikeyPepper: string,
  userId: string,
  projectId: string
) => hashApiKey(`${userId}:${projectId}`, apikeyPepper);
export const kSendOtpUsageByKey = (
  apikeyPepper: string,
  userId: string,
  projectId: string,
  keyId: string
) => hashApiKey(`${userId}:${projectId}:${keyId}`, apikeyPepper);

const routes: FastifyPluginAsync = async (app) => {
  const db = app.firebase.db;
  // Health/readiness check. Unauthenticated by auth plugin exemption.
  app.get("/healthz", async (_req, rep) => {
    let redisOk = false;
    try {
      const pong = await app.redis.ping();
      redisOk = pong === "PONG";
    } catch {
      redisOk = false;
    }

    const ok = redisOk;

    const payload: any = {
      ok,
      checks: {
        redis: redisOk,
      },
    };

    return rep.code(ok ? 200 : 503).send(payload);
  });

  app.get(
    "/ezauth/otp/usage-by-project",
    {
      preHandler: [app.rlPerRoute(5)],
    },
    async (req: any, rep: any) => {
      const userId = req.userId as string | undefined;
      const request = req.headers as EzAuthAnalyticsRequest;
      if (!userId || request.project_name === undefined) {
        return rep.status(401).send({
          error: { message: "Unauthenticated or missing project name" },
        });
      }

      try {
        // Create or update user document in Firestore
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        const projects: Record<string, string> =
          (userDoc.data()?.projects as Record<string, string>) ?? {};

        const projectId = projects[request.project_name];
        if (!projectId) {
          return rep.status(404).send({
            error: { message: "Project not found" },
          });
        }

        const usage_key_lookup_id = kSendOtpUsageByProject(
          app.apikeyPepper,
          userId,
          projectId
        );
        const analyticsRef = db
          .collection("analytics/ezauth/otp/")
          .doc(`${usage_key_lookup_id}`);
        const analyticsDoc = await analyticsRef.get();
        if (!analyticsDoc.exists) {
          return rep.status(404).send({
            error: { message: "Analytics not found" },
          });
        }

        const analyticsData = analyticsDoc.data() as EzAuthAnalyticsResponse;
        return rep.status(200).send(analyticsData);
      } catch (error: any) {
        return rep.status(500).send({
          error: { message: error?.message },
        });
      }
    }
  );
};

export default routes;
