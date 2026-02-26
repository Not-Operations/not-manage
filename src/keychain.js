const { SERVICE_NAME } = require("./constants");

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
    `OS keychain ${action} failed (${message}). You can use CLIO_* env vars as a fallback.`
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
    return await keytar.getPassword(SERVICE_NAME, account);
  } catch (error) {
    throw normalizeKeychainError("read", error);
  }
}

async function deleteSecret(account) {
  try {
    const keytar = loadKeytar();
    await keytar.deletePassword(SERVICE_NAME, account);
  } catch (error) {
    throw normalizeKeychainError("delete", error);
  }
}

module.exports = {
  setSecret,
  getSecret,
  deleteSecret,
};
