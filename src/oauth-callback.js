const http = require("node:http");
const { OAUTH_TIMEOUT_MS } = require("./constants");

function isLoopbackHost(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

function parseLoopbackRedirect(redirectUri) {
  let parsed;
  try {
    parsed = new URL(redirectUri);
  } catch (_error) {
    throw new Error("Redirect URI is not a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Redirect URI must use http:// or https://.");
  }

  if (!isLoopbackHost(parsed.hostname)) {
    throw new Error(
      "Local login requires a loopback redirect URI (127.0.0.1 or localhost)."
    );
  }

  if (!parsed.port) {
    throw new Error("Redirect URI must include an explicit port for local login.");
  }

  return parsed;
}

function waitForOAuthCallback(redirectUri, expectedState) {
  const redirect = parseLoopbackRedirect(redirectUri);
  const hostname = redirect.hostname;
  const port = Number(redirect.port);
  const path = redirect.pathname || "/";

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for OAuth callback."));
    }, OAUTH_TIMEOUT_MS);

    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url || "/", `http://${hostname}:${port}`);
      if (reqUrl.pathname !== path) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      const state = reqUrl.searchParams.get("state");
      const code = reqUrl.searchParams.get("code");
      const error = reqUrl.searchParams.get("error");
      const errorDescription = reqUrl.searchParams.get("error_description");

      if (error) {
        res.statusCode = 400;
        res.end("Clio authorization failed. You can close this window.");
        clearTimeout(timeoutId);
        server.close();
        reject(
          new Error(
            `Authorization failed: ${error}${errorDescription ? ` (${errorDescription})` : ""}`
          )
        );
        return;
      }

      if (!code) {
        res.statusCode = 400;
        res.end("Missing authorization code. You can close this window.");
        clearTimeout(timeoutId);
        server.close();
        reject(new Error("OAuth callback did not include an authorization code."));
        return;
      }

      if (!state || state !== expectedState) {
        res.statusCode = 400;
        res.end("Invalid state. You can close this window.");
        clearTimeout(timeoutId);
        server.close();
        reject(new Error("State validation failed for OAuth callback."));
        return;
      }

      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(
        "<html><body><h3>Clio auth complete</h3><p>You can close this tab and return to the terminal.</p></body></html>"
      );

      clearTimeout(timeoutId);
      server.close();
      resolve({ code, state });
    });

    server.on("error", (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });

    server.listen(port, hostname);
  });
}

module.exports = {
  waitForOAuthCallback,
};
