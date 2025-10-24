import type { FastifyPluginAsync } from "fastify";
import {
  CreateProjectDescriptor,
  ProjectDescriptor,
} from "../types/user";

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

        const body = req.body as CreateProjectDescriptor;
        const projects =
          userDoc.data()?.projects ?? ([] as string[]);
        if (projects.includes(body.name)) {
          return rep
            .status(400)
            .send({ error: { message: "Project already exists" } });
        }
        const projectId = crypto.randomUUID();
        projects.push(projectId);

        const projectDoc = db.collection("projects").doc(projectId);
        await projectDoc.set({
          id: projectId,
          name: body.name,
          created_at: new Date(),
          updated_at: new Date(),
        } as ProjectDescriptor);

        if (!userDoc.exists) {
          return rep.status(404).send({ error: { message: "User not found" } });
        } else {
          // Update existing user
          await userRef.update({
            updated_at: new Date(),
            projects: projects,
          });
        }

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

        const projects =
          userDoc.data()?.projects ?? ([] as string[]);
        // Fetch all project documents and await them
        const projectList = await Promise.all(
          projects.map(async (projectId: string) => {
            const projectDoc = await db.collection("projects").doc(projectId).get();
            return projectDoc.exists ? projectDoc.data() as ProjectDescriptor : null;
          })
        );
        
        // Filter out null values (projects that don't exist)
        const validProjects = projectList.filter(p => p !== null) as ProjectDescriptor[];
        const responseProjects = await Promise.all(
            validProjects.map(async (project: ProjectDescriptor) => {
              // Convert Firestore timestamps to formatted date strings
              const formatDate = (date: any) => {
                if (date instanceof Date) {
                  return date.toLocaleDateString();
                } else if (date && typeof date === 'object' && date.seconds) {
                  return new Date(date.seconds * 1000).toLocaleDateString();
                } else {
                  return new Date().toLocaleDateString(); // fallback
                }
              };
              
              return { 
                name: project.name, 
                created_at: formatDate(project.created_at), 
                updated_at: formatDate(project.updated_at) 
              };
            })
          );

        return rep.status(200).send({
          ok: true,
          projects: responseProjects,
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
};

export default routes;
