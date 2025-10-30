import type { FastifyPluginAsync } from "fastify";
import { CreateProjectRequest } from "../__generated__/requestTypes";
import {
  UserProfileDocument,
  UserProjectDocument,
} from "../__generated__/documentTypes";
import {
  ListUserProjectsResponse,
  UserProjectResponse,
} from "../__generated__/responseTypes";

// API key management routes: create/list/revoke. All routes rely on the auth
// plugin to populate req.userId and tenant authorization.
const routes: FastifyPluginAsync = async (app) => {
  const firebase = app.firebase;
  const db = firebase.db;

  app.get("/healthz", async (_req, rep) => {
    return rep.send({ ok: true });
  });

  app.post(
    "/create",
    { preHandler: [app.rlPerRoute(10)] },
    async (req: any, rep) => {
      try {
        const userId = req.userId as string | undefined;
        if (!userId) {
          return rep
            .status(401)
            .send({ error: { message: "Unauthenticated" } });
        }

        // Create or update user document in Firestore
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return rep.status(404).send({ error: { message: "User not found" } });
        }

        const body = req.body as CreateProjectRequest;
        const projects: Record<string, string> = (userDoc.data()?.projects as Record<string, string>) ?? {};
        if (projects[body.name]) {
          return rep
            .status(400)
            .send({ error: { message: "Project already exists" } });
        }
        const projectId = crypto.randomUUID();
        projects[body.name] = projectId;

        const projectDoc = db.collection("projects").doc(projectId);
        await projectDoc.set({
          id: projectId,
          name: body.name,
          created_at: new Date().toLocaleDateString(),
          updated_at: new Date().toLocaleDateString(),
          services: {},
        } as UserProjectDocument);

        // Update existing user
        await userRef.update({
          updated_at: new Date().toLocaleDateString(),
          projects: projects,
        } as Pick<UserProfileDocument, "updated_at" | "projects">);

        return rep.status(200).send({
          ok: true,
        });
      } catch (err: any) {
        const isDev = process.env.NODE_ENV !== "production";
        const detail = err instanceof Error ? err.message : String(err);
        req.log?.error({ detail }, "/create failed");
        return rep.status(500).send({
          error: {
            code: "internal_error",
            message: "Create project failed",
            ...(isDev ? { detail } : {}),
          },
        });
      }
    }
  );

  app.post(
    "/list",
    { preHandler: [app.rlPerRoute(10)] },
    async (req: any, rep) => {
      try {
        const userId = req.userId as string | undefined;
        if (!userId) {
          return rep
            .status(401)
            .send({ error: { message: "Unauthenticated" } });
        }

        // Create or update user document in Firestore
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        const projects: Record<string, string> = (userDoc.data()?.projects as Record<string, string>) ?? {};
        // Fetch all project documents and await them
        const projectList = await Promise.all(
          Object.values(projects).map(async (projectId: string) => {
            const projectDoc = await db
              .collection("projects")
              .doc(projectId)
              .get();
            return projectDoc.exists
              ? (projectDoc.data() as UserProjectDocument)
              : null;
          })
        );

        // Filter out null values (projects that don't exist)
        const validProjects = projectList.filter(
          (p) => p !== null
        ) as UserProjectDocument[];
        const responseProjects = await Promise.all(
          validProjects.map(async (project: UserProjectDocument) => {
            return {
              name: project.name,
              created_at: project.created_at,
              updated_at: project.updated_at,
            } as UserProjectResponse;
          })
        );

        return rep.status(200).send({
          projects: responseProjects as UserProjectResponse[],
        } as ListUserProjectsResponse);
      } catch (err: any) {
        const isDev = process.env.NODE_ENV !== "production";
        const detail = err instanceof Error ? err.message : String(err);
        req.log?.error({ detail }, "/create failed");
        return rep.status(500).send({
          error: {
            code: "internal_error",
            message: "Create project failed",
            ...(isDev ? { detail } : {}),
          },
        });
      }
    }
  );
};

export default routes;
