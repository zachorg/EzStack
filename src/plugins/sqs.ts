import fp from "fastify-plugin";
import { SQSClient } from "@aws-sdk/client-sqs";
export default fp(async (app) => {
  const endpoint = process.env.AWS_SQS_ENDPOINT;
  app.decorate("sqs", new SQSClient({ region: process.env.AWS_REGION || "us-east-1", ...(endpoint ? { endpoint } : {}) }));
  app.decorate("sqsQueueName", process.env.SQS_QUEUE_NAME || "ez-send-queue");
});