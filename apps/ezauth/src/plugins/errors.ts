import fp from "fastify-plugin";

export default fp(async (app) => {
  app.setErrorHandler((err, _req, rep) => {
    const isValidationError = (err as any).validation || (err as any).code === "FST_ERR_VALIDATION";
    const status = isValidationError ? 400 : (typeof (err as any).statusCode === "number" ? (err as any).statusCode : 500);
    let code: string | undefined = (err as any).code;
    if (!code) {
      if (isValidationError) code = "validation_error";
      else if (status === 401) code = "unauthorized";
      else if (status === 403) code = "forbidden";
      else if (status === 404) code = "not_found";
      else if (status === 429) code = "rate_limited";
      else if (status >= 400 && status < 500) code = "bad_request";
      else code = "internal_error";
    }
    const message = isValidationError ? "Request validation failed" : (err.message || "Unexpected error");
    app.log.error({ err, code, status }, "Request failed");
    return rep.code(status >= 400 && status < 600 ? status : 500).type("application/json").send({ error: { code, message } });
  });

  app.setNotFoundHandler((req, rep) => {
    return rep.code(404).type("application/json").send({ error: { code: "not_found", message: `Route ${req.method} ${req.url} not found` } });
  });
});


