import { startEzStack } from "./apps/ezstack.js";
import { startEzAuth } from "./apps/ezauth.js";

const svc = (process.env.SERVICE || process.env.APP || "ezstack").toLowerCase();

if (svc === "ezauth") {
  await startEzAuth();
} else {
  await startEzStack();
}
