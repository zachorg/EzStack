import type { FastifyPluginAsync } from "fastify";
import { UserProjectDocument } from "../__generated__/documentTypes";
import { EzAuthServiceUpdateResponse } from "../__generated__/responseTypes";
import { EzAuthServiceUpdateRequest } from "../__generated__/requestTypes";
import { EzAuthServiceConfig } from "../__generated__/configTypes";

const EZAUTH_SERVICE_CONFIG = {
  enabled: false,
  organization_name: "EzStack",
  otp_code_length: 6,
  otp_rate_limit_destination_per_minute: 5,
  otp_max_verification_attempts: 5,
  otp_ttl_seconds: 300,
} as EzAuthServiceConfig;

// API key management routes: create/list/revoke. All routes rely on the auth
// plugin to populate req.userId and tenant authorization.
const routes: FastifyPluginAsync = async (app) => {
  const firebase = app.firebase;
  const db = firebase.db;

  app.get("/healthz", async (_req, rep) => {
    return rep.send({ ok: true });
  });

  app.get(
    "/ezauth/config/:project_name",
    { preHandler: [app.rlPerRoute(10)] },
    async (req: any, rep) => {
      try {
        const project_name = req.params.project_name as string | undefined;
        const userId = req.userId as string | undefined;
        if (!userId || !project_name) {
          return rep.status(401).send({
            error: { message: "Unauthenticated or missing project name" },
          });
        }

        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return rep.status(404).send({ error: { message: "User not found" } });
        }

        const projects: Record<string, string> =
          (userDoc.data()?.projects as Record<string, string>) ?? {};
        if (!projects[project_name]) {
          return rep
            .status(400)
            .send({ error: { message: "Project not found" } });
        }
        const projectId = projects[project_name];
        const projectDoc = await db.collection("projects").doc(projectId).get();
        if (!projectDoc.exists) {
          return rep
            .status(400)
            .send({ error: { message: "Project not found" } });
        }
        const projectData = projectDoc.data() as UserProjectDocument;
        // Check if services exists first
        if (!projectData.services) {
          projectData.services = {};
        }
        const service =
          projectData.services["ezauth"] ??
          JSON.stringify(EZAUTH_SERVICE_CONFIG);
        return rep.status(200).send(JSON.parse(service) as EzAuthServiceConfig);
      } catch (err: any) {
        const isDev = process.env.NODE_ENV !== "production";
        const detail = err instanceof Error ? err.message : String(err);
        req.log?.error({ detail }, "/get failed");
        return rep.status(500).send({
          error: {
            code: "internal_error",
            message: err?.message || "Internal server error",
            ...(isDev ? { detail } : {}),
          },
        });
      }
    }
  );

  app.post(
    "/ezauth/config/update",
    { preHandler: [app.rlPerRoute(5)] },
    async (req: any, rep) => {
      try {
        const request = req.body as EzAuthServiceUpdateRequest;
        const userId = req.userId as string | undefined;
        if (!userId || !request) {
          return rep.status(401).send({
            error: { message: "Unauthenticated or missing request update" },
          });
        }

        // Create or update user document in Firestore
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return rep.status(404).send({ error: { message: "User not found" } });
        }

        const projects: Record<string, string> =
          (userDoc.data()?.projects as Record<string, string>) ?? {};
        if (!projects[request.project_name]) {
          return rep
            .status(400)
            .send({ error: { message: "Project not found" } });
        }
        const projectId = projects[request.project_name];
        const projectDoc = await db.collection("projects").doc(projectId).get();
        if (!projectDoc.exists) {
          return rep
            .status(400)
            .send({ error: { message: "Project not found" } });
        }
        const projectData = projectDoc.data() as UserProjectDocument;
        // Check if services exists first
        if (!projectData.services) {
          projectData.services = {};
        }
        projectData.services["ezauth"] = JSON.stringify(
          request as EzAuthServiceConfig
        );
        await projectDoc.ref.set(projectData);
        return rep.status(200).send({
          ok: true,
        } as EzAuthServiceUpdateResponse);
      } catch (err: any) {
        const isDev = process.env.NODE_ENV !== "production";
        const detail = err instanceof Error ? err.message : String(err);
        req.log?.error({ detail }, "/create failed");
        return rep.status(500).send({
          error: {
            code: "internal_error",
            message: err?.message || "Internal server error",
            ...(isDev ? { detail } : {}),
          },
        });
      }
    }
  );
};

export default routes;
