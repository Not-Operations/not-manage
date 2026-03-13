const { LEGACY_SERVICE_NAME, SERVICE_NAME } = require("./constants");

function loadKeytar() {
  try {
    return require("keytar");
  } catch (error) {
    throw new Error(
      "Secure keychain is unavailable. Install dependencies with `npm install` and ensure your OS keychain is enabled."
    );
  }
}

function normalizeKeychainError(action, error) {
  const rawMessage = error && error.message ? error.message : String(error || "");
  const message = rawMessage && rawMessage !== "[object Object]" ? rawMessage : "unknown error";
  return new Error(
    `OS keychain ${action} failed (${message}). This CLI requires a working OS keychain.`
  );
}

async function setSecret(account, value) {
  try {
    const keytar = loadKeytar();
    await keytar.setPassword(SERVICE_NAME, account, value);
  } catch (error) {
    throw normalizeKeychainError("write", error);
  }
}

async function getSecret(account) {
  try {
    const keytar = loadKeytar();
    // Read the renamed service first, then fall back to the legacy one.
    for (const serviceName of [SERVICE_NAME, LEGACY_SERVICE_NAME]) {
      const value = await keytar.getPassword(serviceName, account);
      if (value) {
        return value;
      }
    }
    return null;
  } catch (error) {
    throw normalizeKeychainError("read", error);
  }
}

async function deleteSecret(account) {
  try {
    const keytar = loadKeytar();
    await Promise.all(
      [SERVICE_NAME, LEGACY_SERVICE_NAME].map((serviceName) =>
        keytar.deletePassword(serviceName, account)
      )
    );
  } catch (error) {
    throw normalizeKeychainError("delete", error);
  }
}

module.exports = {
  setSecret,
  getSecret,
  deleteSecret,
};
