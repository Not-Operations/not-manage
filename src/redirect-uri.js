function isLoopbackHostname(hostname) {
  const normalized = String(hostname || "").trim().toLowerCase();
  return normalized === "127.0.0.1" || normalized === "localhost" || normalized === "[::1]";
}

function getLoopbackBindHost(hostname) {
  const normalized = String(hostname || "").trim().toLowerCase();

  if (normalized === "[::1]") {
    return "::1";
  }

  return normalized;
}

function parseLoopbackRedirectUri(redirectUri) {
  let parsed;
  try {
    parsed = new URL(redirectUri);
  } catch (_error) {
    throw new Error("Redirect URI must be a valid URL.");
  }

  if (parsed.protocol !== "http:") {
    throw new Error("Redirect URI must use http:// for the local OAuth callback.");
  }

  if (!isLoopbackHostname(parsed.hostname)) {
    throw new Error(
      "Redirect URI must use a loopback host (127.0.0.1, localhost, or [::1])."
    );
  }

  if (!parsed.port) {
    throw new Error("Redirect URI must include an explicit port for local OAuth login.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Redirect URI must not include embedded credentials.");
  }

  if (parsed.search || parsed.hash) {
    throw new Error("Redirect URI must not include query parameters or fragments.");
  }

  return parsed;
}

module.exports = {
  getLoopbackBindHost,
  isLoopbackHostname,
  parseLoopbackRedirectUri,
};
