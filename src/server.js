const WebSocket = require("ws");

const DEFAULT_PORT = 9696;

// Decide whether a WebSocket client may connect based on its Origin header.
//
// - No Origin header: allowed. Local processes (curl, wscat, scripts) already
//   have OS-level print access, so blocking them adds no security.
// - Browser extensions: always allowed.
// - http(s) pages: allowed by default because the legacy Firefox extension
//   connects directly from the Koha page, whose origin differs per library and
//   cannot be known in advance. Setting a non-empty "allowed_origins" array in
//   olorin_options.json restricts http(s) origins to that list.
// - Anything else (file://, the literal "null" origin): rejected.
function isOriginAllowed(origin, allowedOrigins) {
  if (origin === undefined || origin === null || origin === "") {
    return true;
  }

  if (origin === "null") {
    return false;
  }

  if (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://")) {
    return true;
  }

  if (/^https?:\/\//.test(origin)) {
    if (Array.isArray(allowedOrigins) && allowedOrigins.length > 0) {
      return allowedOrigins.includes(origin);
    }
    return true;
  }

  return false;
}

// Start the WebSocket server. Binds to loopback only; the extensions always
// connect to localhost. Resolves once the server is listening.
function startServer({
  host = "127.0.0.1",
  port = Number(process.env.OLORIN_PORT) || DEFAULT_PORT,
  route,
  isOriginAllowed: originCheck = () => true,
  logger = console,
}) {
  return new Promise((resolve, reject) => {
    const wss = new WebSocket.Server({
      host,
      port,
      verifyClient: (info, done) => done(originCheck(info.origin), 403, "Forbidden"),
    });

    let listening = false;

    wss.on("listening", () => {
      listening = true;
      logger.log(`WebSocket server is listening on ${host}:${wss.address().port}`);
      resolve({
        wss,
        port: wss.address().port,
        close: () =>
          new Promise((resolveClose) => {
            for (const client of wss.clients) {
              client.terminate();
            }
            wss.close(() => resolveClose());
          }),
      });
    });

    wss.on("error", (error) => {
      if (!listening) {
        reject(error);
      } else {
        logger.error("WebSocket server error:", error);
      }
    });

    wss.on("connection", (ws) => {
      ws.on("message", async (message) => {
        let response;
        try {
          response = await route(message.toString());
        } catch (error) {
          logger.error("Unexpected error handling message:", error);
          response = { success: false, error: "Internal error" };
        }

        if (response !== null && response !== undefined && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(response));
        }
      });
    });
  });
}

module.exports = { startServer, isOriginAllowed, DEFAULT_PORT };
