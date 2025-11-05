// import fp from "fastify-plugin";
// import { SQSClient, GetQueueUrlCommand } from "@aws-sdk/client-sqs";

// export default fp(async (app) => {
//   const endpoint = process.env.AWS_SQS_ENDPOINT;
//   const region = process.env.FASTIFY_PUBLIC_AWS_REGION || "us-east-1";
//   const queueName = process.env.SQS_QUEUE_NAME || "ez-send-queue";
  
//   let isConfigured = false;
//   let sqsClient: SQSClient;

//   // Check if AWS credentials are configured
//   if (process.env.FASTIFY_PUBLIC_AWS_ACCESS_KEY_ID && process.env.FASTIFY_PUBLIC_AWS_SECRET_ACCESS_KEY) {
//     sqsClient = new SQSClient({ 
//       region,
//       credentials: {
//         accessKeyId: process.env.FASTIFY_PUBLIC_AWS_ACCESS_KEY_ID,
//         secretAccessKey: process.env.FASTIFY_PUBLIC_AWS_SECRET_ACCESS_KEY,
//       },
//       ...(endpoint ? { endpoint } : {})
//     });
//     isConfigured = true;
//     app.log.info('✅ AWS SQS Service initialized successfully');
//   } else {
//     // Create client without credentials (will use IAM roles or fail gracefully)
//     sqsClient = new SQSClient({ 
//       region,
//       ...(endpoint ? { endpoint } : {})
//     });
//     app.log.warn('⚠️  AWS SQS not configured - missing environment variables');
//     app.log.info('💡 Set FASTIFY_PUBLIC_AWS_ACCESS_KEY_ID, FASTIFY_PUBLIC_AWS_SECRET_ACCESS_KEY, and FASTIFY_PUBLIC_AWS_REGION');
//   }

//   // Create SQS client. If a local endpoint is set, use it for dev/testing.
//   app.decorate("sqs", sqsClient);
//   app.decorate("sqsQueueName", queueName);

//   /**
//    * Check if the service is properly configured
//    */
//   function isReady(): boolean {
//     return isConfigured;
//   }

//   /**
//    * Get configuration status
//    */
//   function getStatus(): { configured: boolean; region?: string; queueName?: string; hasCredentials: boolean; endpoint?: string } {
//     return {
//       configured: isConfigured,
//       region,
//       queueName,
//       hasCredentials: !!(process.env.FASTIFY_PUBLIC_AWS_ACCESS_KEY_ID && process.env.FASTIFY_PUBLIC_AWS_SECRET_ACCESS_KEY),
//       endpoint: endpoint || undefined,
//     };
//   }

//   /**
//    * Test connection to SQS queue
//    */
//   async function testConnection(): Promise<{ success: boolean; error?: string }> {
//     if (!isConfigured) {
//       return {
//         success: false,
//         error: 'AWS SQS not configured. Please set AWS credentials in environment variables.',
//       };
//     }

//     try {
//       const command = new GetQueueUrlCommand({ QueueName: queueName });
//       const response = await sqsClient.send(command);
      
//       if (response.QueueUrl) {
//         app.log.info(`📦 [AWS SQS] Queue connection test successful: ${response.QueueUrl}`);
//         return { success: true };
//       } else {
//         return {
//           success: false,
//           error: 'Queue URL not found',
//         };
//       }
//     } catch (error: any) {
//       app.log.error('AWS SQS Connection Test Error:', error);

//       // Handle specific AWS errors
//       if (error.name === 'QueueDoesNotExist') {
//         return {
//           success: false,
//           error: `Queue '${queueName}' does not exist`,
//         };
//       } else if (error.name === 'AuthorizationErrorException') {
//         return {
//           success: false,
//           error: 'AWS credentials are invalid or expired',
//         };
//       } else if (error.name === 'ThrottlingException') {
//         return {
//           success: false,
//           error: 'Rate limit exceeded. Please try again later',
//         };
//       }

//       return {
//         success: false,
//         error: error.message || 'Failed to connect to AWS SQS',
//       };
//     }
//   }

//   // Register the SQS service with Fastify
//   app.decorate('sqsService', {
//     isReady,
//     getStatus,
//     testConnection,
//   });

//   // Add health check endpoint for SQS status
//   app.get('/health/sqs', async (_request, reply) => {
//     const status = getStatus();
//     const connectionTest = await testConnection();
    
//     return reply.code(status.configured && connectionTest.success ? 200 : 503).send({
//       service: 'sqs',
//       ...status,
//       ready: isReady(),
//       connectionTest
//     });
//   });

//   if (endpoint) {
//     app.log.warn({ endpoint }, "SQS configured with custom endpoint (dev mode)");
//   } else {
//     app.log.info({ region, queueName }, "SQS client initialized");
//   }
// });


