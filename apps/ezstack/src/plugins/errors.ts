import fp from "fastify-plugin";

// Global error/404 shaping to { error: { code, message } }
export default fp(async (app) => {
  // Convert thrown/returned errors into consistent API error shape
  app.setErrorHandler((err, _req, rep) => {
    // Cast err to any to avoid TypeScript strict type checking
    const error = err as any;
    
    // Validation errors from Fastify/Ajv
    const isValidationError = error.validation || error.code === "FST_ERR_VALIDATION";

    const status = isValidationError
      ? 400
      : (typeof error.statusCode === "number" ? error.statusCode : 500);

    // Prefer explicit error code if provided
    let code: string | undefined = error.code;

    if (!code) {
      if (isValidationError) code = "validation_error";
      else if (status === 401) code = "unauthorized";
      else if (status === 403) code = "forbidden";
      else if (status === 404) code = "not_found";
      else if (status === 429) code = "rate_limited";
      else if (status >= 400 && status < 500) code = "bad_request";
      else code = "internal_error";
    }

    const message = isValidationError
      ? "Request validation failed"
      : (error.message || "Unexpected error");

    // Log full error; return minimal shape
    app.log.error({ err: error, code, status }, "Request failed");

    return rep
      .code(status >= 400 && status < 600 ? status : 500)
      .type("application/json")
      .send({ error: { code, message } });
  });

  // Standardize 404s for unknown routes
  app.setNotFoundHandler((req, rep) => {
    return rep
      .code(404)
      .type("application/json")
      .send({ error: { code: "not_found", message: `Route ${req.method} ${req.url} not found` } });
  });
});


