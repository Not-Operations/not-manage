const { createInterface } = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

async function withPrompt(callback) {
  const rl = createInterface({
    input: stdin,
    output: stdout,
    terminal: true,
  });

  try {
    return await callback(rl);
  } finally {
    rl.close();
  }
}

async function ask(rl, label, fallback = null) {
  const suffix = fallback ? ` [${fallback}]` : "";
  const answer = await rl.question(`${label}${suffix}: `);
  const trimmed = answer.trim();
  if (trimmed) {
    return trimmed;
  }
  return fallback;
}

module.exports = {
  ask,
  withPrompt,
};
