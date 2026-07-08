/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("node:http");
const next = require("next");
const { parse } = require("node:url");

const { appLogger } = require("./lib/logger.cjs");

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const dev = process.argv.includes("--dev");

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer(async (req, res) => {
      const startNs = process.hrtime.bigint();

      res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
        const userAgent = req.headers["user-agent"] || "";
        const parsed = parse(req.url || "", true);

        appLogger.info({
          event: "http_access",
          method: req.method || "UNKNOWN",
          route: parsed.pathname || "/",
          query: parsed.query,
          statusCode: res.statusCode,
          responseTimeMs: Number(durationMs.toFixed(2)),
          userAgent,
          remoteAddress: req.socket.remoteAddress || "",
        });
      });

      try {
        const parsedUrl = parse(req.url || "", true);
        await handle(req, res, parsedUrl);
      } catch (error) {
        appLogger.error({
          event: "http_error",
          method: req.method || "UNKNOWN",
          route: req.url || "/",
          error: error instanceof Error ? error.message : String(error),
        });

        res.statusCode = 500;
        res.end("internal server error");
      }
    });

    server.listen(port, hostname, () => {
      appLogger.info({
        event: "server_start",
        message: `Server ready on http://${hostname}:${port}`,
        dev,
      });
    });
  })
  .catch((error) => {
    appLogger.error({
      event: "server_boot_failure",
      error: error instanceof Error ? error.message : String(error),
    });

    process.exit(1);
  });
